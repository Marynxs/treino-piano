// O "ouvido" do app: recebe o som do microfone, acha o instante em que uma tecla é tocada (o ataque) e confere quais notas soaram.
// Não tenta adivinhar a música do zero: compara o som com as "impressões digitais" das notas que o app espera (e das vizinhas,
// para dizer qual nota errada foi tocada). As impressões vêm da calibração no seu piano, ou de um modelo de piano até lá.
// Sem AVAudioEngine aqui: o mesmo código roda no iPhone e no teste do Mac (com os sons de piano do app).
import Foundation
import Accelerate

final class AnalisadorSom {
    struct Nota { let nota: Int; let forca: Int; let amostra: Int64 }   // amostra = posição do ataque no fluxo de som

    let taxa: Double
    // ataque: janelas de 1024 a cada 256 amostras (cerca de 5 ms)
    private let nAtaque = 1024, passo = 256
    // conferência das notas: 2048 amostras (cerca de 43 ms), com zeros até 8192 para afinar os picos
    private let nNota = 2048, nFFT = 8192
    private let maxBin: Int
    private var anel: [Float]
    private let mascara: Int
    private(set) var total: Int64 = 0                 // amostras recebidas desde o começo
    private var proxPasso: Int64 = 1024
    private var anterior: [Float]
    private var fluxos: [Float] = []
    private var ultimoAtaque: Int64 = -100_000
    private var pendentes: [(Int64, Float)] = []       // ataques esperando o som para conferir (posição, volume)
    private var fftA: vDSP.FFT<DSPSplitComplex>?
    private var fftN: vDSP.FFT<DSPSplitComplex>?
    private let hannA: [Float], hannN: [Float]
    private var ativas: [Int: Float] = [:]            // notas soando e o tamanho delas no ataque
    private var ruido: Float = 0.01                  // volume da sala sem tocar (vai descendo até o silêncio)
    private var fluxoAnt: Float = 0, fluxoAnt2: Float = 0, rmsAnt: Float = 0
    private var desde: [Int: Int64] = [:]           // quando cada nota foi ouvida pela última vez

    /// Notas que o app espera perto deste instante (vem da página). nil = ouvir livre (nada tocando); vazio = nada esperado agora.
    var candidatas: (Int64) -> [Int]? = { _ in nil }
    /// Impressões calibradas no piano dele (nota MIDI → espectro normalizado). Sem ela, usa o modelo.
    var moldes: [Int: [Float]] = [:]
    var aoAtacar: ((Int64) -> Void)?
    var aoTocar: (([Nota]) -> Void)?
    var aoSoltar: (([Int], Int64) -> Void)?
    /// Calibração: quando definida, o próximo ataque devolve o espectro em vez de virar nota.
    var capturar: (([Float], Float) -> Void)?
    var depurar: ((String) -> Void)?
    var depurarTudo = false

    init(taxa: Double) {
        self.taxa = taxa
        let cap = 1 << 17
        anel = [Float](repeating: 0, count: cap); mascara = cap - 1
        maxBin = Int(5000.0 / (taxa / Double(8192)))
        anterior = [Float](repeating: 0, count: 512)
        hannA = vDSP.window(ofType: Float.self, usingSequence: .hanningDenormalized, count: 1024, isHalfWindow: false)
        hannN = vDSP.window(ofType: Float.self, usingSequence: .hanningDenormalized, count: 2048, isHalfWindow: false)
        fftA = vDSP.FFT(log2n: 10, radix: .radix2, ofType: DSPSplitComplex.self)
        fftN = vDSP.FFT(log2n: 13, radix: .radix2, ofType: DSPSplitComplex.self)
    }

    // MARK: entrada de som

    func receber(_ amostras: UnsafePointer<Float>, _ n: Int) {
        for i in 0..<n { anel[Int((total + Int64(i)) & Int64(mascara))] = amostras[i] }
        total += Int64(n)
        while proxPasso <= total { analisarPasso(fim: proxPasso); proxPasso += Int64(passo) }
        // confere os ataques que já têm som suficiente depois deles
        while let p = pendentes.first, p.0 + 512 + Int64(nNota) <= total {
            pendentes.removeFirst()
            conferir(ataque: p.0, volume: p.1)
        }
    }

    private func janela(_ fim: Int64, _ n: Int) -> [Float] {
        var j = [Float](repeating: 0, count: n)
        let ini = fim - Int64(n)
        for i in 0..<n { let k = ini + Int64(i); j[i] = k < 0 ? 0 : anel[Int(k & Int64(mascara))] }
        return j
    }

    private func espectro(_ x: [Float], _ fft: vDSP.FFT<DSPSplitComplex>, _ n: Int) -> [Float] {
        var re = [Float](repeating: 0, count: n / 2), im = [Float](repeating: 0, count: n / 2)
        var entrada = x + [Float](repeating: 0, count: n - x.count)
        var mag = [Float](repeating: 0, count: n / 2)
        re.withUnsafeMutableBufferPointer { r in
            im.withUnsafeMutableBufferPointer { i in
                var s = DSPSplitComplex(realp: r.baseAddress!, imagp: i.baseAddress!)
                entrada.withUnsafeMutableBufferPointer { e in
                    e.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: n / 2) { vDSP_ctoz($0, 2, &s, 1, vDSP_Length(n / 2)) }
                }
                fft.forward(input: s, output: &s)
                vDSP.absolute(s, result: &mag)
            }
        }
        return mag
    }

    // MARK: ataque (fluxo espectral)

    private func analisarPasso(fim: Int64) {
        guard let fftA else { return }
        let x = vDSP.multiply(janela(fim, nAtaque), hannA)
        var m = espectro(x, fftA, nAtaque)
        m = m.map { log1p(20 * $0) }
        var fl: Float = 0
        let lim = min(m.count, Int(8000.0 / (taxa / Double(nAtaque))))
        for k in 2..<lim { let d = m[k] - anterior[k]; if d > 0 { fl += d } }
        anterior = m
        let rms = sqrt(vDSP.meanSquare(x))
        fluxos.append(fl); if fluxos.count > 60 { fluxos.removeFirst() }
        let ord = fluxos.sorted(), mediana = ord[ord.count / 2]
        ruido = min(ruido * 1.0005 + 1e-7, rms); let piso = max(0.0006, ruido * 1.5)
        let limiar = mediana * 1.5 + 4
        if depurarTudo { depurar?(String(format: "  passo %.3f fluxo %.1f limiar %.1f rms %.4f piso %.4f", Double(fim) / taxa, fl, limiar, rms, piso)) }
        // ataque = pico do fluxo (o passo anterior foi maior que o de antes e que este), acima do limiar
        let pico = fluxoAnt > limiar && fluxoAnt >= fluxoAnt2 && fluxoAnt > fl
        fluxoAnt2 = fluxoAnt; fluxoAnt = fl
        if pico && rmsAnt > piso && fim - ultimoAtaque > Int64(0.12 * taxa) {
            ultimoAtaque = fim
            let pos = fim - Int64(passo) - Int64(nAtaque / 2)   // o ataque fica no meio da janela do passo anterior
            pendentes.append((pos, rms))
            depurar?(String(format: "ataque %.3f fluxo %.1f limiar %.1f rms %.4f", Double(pos) / taxa, fl, limiar, rms))
            aoAtacar?(pos)
        }
        // notas que já sumiram (o som caiu bem): solta
        rmsAnt = rms
        if !ativas.isEmpty && rms < 0.0015 && fim - ultimoAtaque > Int64(0.15 * taxa) {
            let k = Array(ativas.keys); ativas.removeAll(); aoSoltar?(k, fim)
        }
    }

    // MARK: quais notas soaram

    static func freq(_ n: Int) -> Double { 440 * pow(2, Double(n - 69) / 12) }

    /// Modelo de piano para uma nota: harmônicos levemente esticados (como nas cordas de verdade), mais fracos para cima.
    func modelo(_ n: Int) -> [Float] {
        var v = [Float](repeating: 0, count: maxBin)
        let bf = taxa / Double(nFFT), f0 = Self.freq(n), B = 0.0004
        for k in 1...14 {
            let f = f0 * Double(k) * sqrt(1 + B * Double(k * k))
            let c = f / bf
            if c >= Double(maxBin - 2) { break }
            let a = Float(1.0 / pow(Double(k), 0.7)) * (n < 48 && k == 1 ? 0.4 : 1)
            for b in max(1, Int(c) - 3)...min(maxBin - 1, Int(c) + 3) { let d = Float(Double(b) - c); v[b] += a * exp(-d * d / 2.2) }
        }
        return normalizar(v)
    }
    private func normalizar(_ v: [Float]) -> [Float] { let n = sqrt(vDSP.sumOfSquares(v)); return n > 0 ? vDSP.divide(v, n) : v }
    private func molde(_ n: Int) -> [Float] { moldes[n] ?? modelo(n) }

    /// Som novo do ataque: o espectro depois do ataque menos o de antes (assim notas que ainda estão soando não atrapalham).
    private func somNovo(ataque: Int64) -> (d: [Float], tam: Float) {
        guard let fftN else { return ([], 0) }
        let depois = espectro(vDSP.multiply(janela(ataque + 512 + Int64(nNota), nNota), hannN), fftN, nFFT)
        let antes = espectro(vDSP.multiply(janela(ataque - 256, nNota), hannN), fftN, nFFT)
        var d = [Float](repeating: 0, count: maxBin)
        for k in 1..<maxBin { d[k] = max(0, depois[k] - 0.6 * antes[k]) }   // 0,6: a nota repetida ainda soando não apaga a nova
        let tam = sqrt(vDSP.sumOfSquares(d))
        return (d, tam)
    }

    /// Mínimos quadrados sem valores negativos: quanto de cada impressão explica o som novo.
    private func pesos(_ d: [Float], _ moldes: [[Float]]) -> [Float] {
        let n = moldes.count
        var g = [Float](repeating: 0, count: n * n), b = [Float](repeating: 0, count: n)
        for i in 0..<n {
            b[i] = vDSP.dot(moldes[i], d)
            for j in i..<n { let x = vDSP.dot(moldes[i], moldes[j]); g[i * n + j] = x; g[j * n + i] = x }
        }
        var a = [Float](repeating: 0, count: n)
        var l: Float = 0; for i in 0..<n { var s: Float = 0; for j in 0..<n { s += abs(g[i * n + j]) }; l = max(l, s) }
        let passo = l > 0 ? 1 / l : 1
        for _ in 0..<300 {
            for i in 0..<n { var gr = -b[i]; for j in 0..<n { gr += g[i * n + j] * a[j] }; a[i] = max(0, a[i] - passo * gr) }
        }
        return a
    }

    private func conferir(ataque: Int64, volume: Float) {
        let (d, tam) = somNovo(ataque: ataque)
        guard tam > 0 else { return }
        if let cap = capturar { capturar = nil; cap(normalizar(d), tam); return }
        // som de clique ou batida (espalhado por todas as frequências) não é nota de piano
        let faixa = Array(d[min(8, d.count)..<min(d.count, maxBin)])
        let geo = exp(faixa.map { log(max($0, 1e-6)) }.reduce(0, +) / Float(max(1, faixa.count)))
        let ari = max(1e-9, faixa.reduce(0, +) / Float(max(1, faixa.count)))
        depurar?(String(format: "  plano %.2f tam %.3f", geo / ari, tam))
        if geo / ari > 0.7 { return }

        let pedido = candidatas(ataque)
        if let p = pedido, p.isEmpty { depurar?("  nada esperado agora: ignorado"); return }
        let esperadas = pedido ?? []
        var cands: [Int]
        if esperadas.isEmpty { cands = Array(36...84) }
        else {
            var s = Set<Int>()
            for n in esperadas { for v in -2...2 { let m = n + v; if m >= 21 && m <= 108 { s.insert(m) } } }
            cands = s.sorted()
        }
        let ms = cands.map { molde($0) }
        let a = pesos(d, ms)
        let maior = a.max() ?? 0
        // quanto do som as notas explicam: clique, batida ou voz explicam pouco (e não viram nota)
        var rec = [Float](repeating: 0, count: d.count); for (i, m) in ms.enumerated() where a[i] > 0 { rec = vDSP.add(rec, vDSP.multiply(a[i], m)) }
        let explica = sqrt(vDSP.sumOfSquares(rec)) / tam
        depurar?(String(format: "  explica %.2f", explica))
        if explica < 0.45 { return }
        depurar?("  pesos " + zip(cands, a).filter { $0.1 > 0.01 * (a.max() ?? 1) }.map { "\($0.0):" + String(format: "%.3f", $0.1) }.joined(separator: " "))
        guard maior > 0 else { return }
        var tocadas: [(Int, Float)] = []
        var peso: [Int: Float] = [:]; for (i, n) in cands.enumerated() { peso[n] = a[i] }
        if esperadas.isEmpty {
            for (i, n) in cands.enumerated() where a[i] >= 0.3 * maior && a[i] >= 0.18 * tam { tocadas.append((n, a[i])) }
        } else {
            // a esperada vale com pouco; a vizinha (nota errada) só se for bem mais forte que a esperada mais perto dela
            for n in esperadas where (peso[n] ?? 0) >= 0.05 * tam { tocadas.append((n, peso[n]!)) }
            for (i, m) in cands.enumerated() where !esperadas.contains(m) && a[i] >= (m < 48 ? 0.5 : 0.3) * tam {
                let perto = esperadas.min(by: { abs($0 - m) < abs($1 - m) }) ?? m
                if a[i] > 1.3 * (peso[perto] ?? 0) { tocadas.append((m, a[i])) }
            }
        }
        // a mesma impressão vizinha meio tom acima e abaixo costuma "vazar": fica a mais forte de cada vizinhança
        tocadas.sort { $0.1 > $1.1 }
        var finais: [(Int, Float)] = []
        for t in tocadas where !finais.contains(where: { $0.0 == t.0 || (abs($0.0 - t.0) == 1 && $0.1 > t.1 && !esperadas.contains(t.0)) }) {
            if esperadas.isEmpty && finais.count >= 4 { break }
            finais.append(t)
        }
        let db = 20 * log10(max(volume, 1e-5))
        let forca = max(1, min(127, Int(40 + (db + 50) * 2.5)))
        var saida: [Nota] = []
        // a mesma nota ouvida de novo em menos de 0,2 s é o som dela se abrindo, não outra tecla
        finais = finais.filter { t in desde[t.0].map { ataque - $0 > Int64(0.2 * taxa) } ?? true }
        for (n, x) in finais {
            desde[n] = ataque
            if ativas[n] != nil { aoSoltar?([n], ataque) }
            ativas[n] = x
            saida.append(Nota(nota: n, forca: forca, amostra: ataque))
        }
        if !saida.isEmpty { aoTocar?(saida) }
    }
}
