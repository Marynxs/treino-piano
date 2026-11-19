// Notas pelo som: o microfone do iPhone, ligado ao AnalisadorSom. Entrega as notas no mesmo formato do cabo
// ([status, nota, força, hora em ms desde 1970]), então o resto do app não precisa saber de onde vieram.
import Foundation
import AVFoundation

final class Ouvido {
    static let arquivoCal = Copia.docs.appendingPathComponent("calibracao.json")
    var aoTocar: (([[Double]]) -> Void)?
    private(set) var ligado = false
    private let motor = AVAudioEngine()
    private let fila = DispatchQueue(label: "ouvido")
    private var an: AnalisadorSom?
    private var mapaAmostra: Int64 = 0, mapaHora: Double = 0, taxa: Double = 48000, atrasoEntrada: Double = 0
    /// Notas esperadas, vindas da página: modo ("time"/"wait") e lista de (hora no relógio do iPhone, notas).
    private var esperadas: (modo: String, l: [(Double?, [Int])])?
    private var base = mach_timebase_info_data_t()

    init() { mach_timebase_info(&base) }

    var calibradas: Int { (Self.lerMoldes()?.count) ?? 0 }

    static func lerMoldes() -> [Int: [Float]]? {
        guard let d = try? Data(contentsOf: arquivoCal), let o = try? JSONDecoder().decode([String: [Float]].self, from: d) else { return nil }
        var m: [Int: [Float]] = [:]; o.forEach { if let n = Int($0.key) { m[n] = $0.value } }
        return m
    }
    static func gravarMoldes(_ m: [Int: [Float]]) {
        var o: [String: [Float]] = [:]; m.forEach { o[String($0.key)] = $0.value }
        if let d = try? JSONEncoder().encode(o) { try? d.write(to: arquivoCal, options: .atomic) }
    }

    func esperar(_ obj: Any?) {
        guard let o = obj as? [String: Any], let l = o["l"] as? [[Any]] else { fila.async { self.esperadas = nil }; return }
        let modo = o["modo"] as? String ?? "time"
        let lista: [(Double?, [Int])] = l.compactMap { x in
            guard x.count >= 2, let ns = x[1] as? [Any] else { return nil }
            return (x[0] as? Double, ns.compactMap { ($0 as? NSNumber)?.intValue })
        }
        fila.async { self.esperadas = (modo, lista) }
    }

    private func hora(_ amostra: Int64) -> Double { mapaHora + Double(amostra - mapaAmostra) / taxa * 1000 - atrasoEntrada }

    func ligar() throws {
        if ligado { return }
        let s = AVAudioSession.sharedInstance()
        #if targetEnvironment(simulator)
        // no simulador o microfone do Mac trava o áudio (RPC timeout); só no iPhone de verdade
        throw NSError(domain: "Ouvido", code: 1, userInfo: [NSLocalizedDescriptionKey: "microfone não testável no simulador"])
        #endif
        try s.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .mixWithOthers, .allowBluetoothA2DP])
        try? s.setPreferredIOBufferDuration(0.005)
        try s.setActive(true)
        guard s.isInputAvailable else { throw NSError(domain: "Ouvido", code: 2, userInfo: [NSLocalizedDescriptionKey: "nenhum microfone disponível"]) }
        atrasoEntrada = s.inputLatency * 1000
        let entrada = motor.inputNode
        let fmt = entrada.outputFormat(forBus: 0)
        taxa = fmt.sampleRate
        let a = AnalisadorSom(taxa: taxa)
        a.moldes = Self.lerMoldes() ?? [:]
        a.candidatas = { [weak self] amostra in
            guard let self, let e = self.esperadas, !e.l.isEmpty else { return nil }   // nada tocando: ouvido livre
            if e.modo == "wait" { return e.l[0].1 }
            let t = self.hora(amostra)
            return e.l.filter { x in x.0.map { abs($0 - t) < 250 } ?? false }.flatMap { $0.1 }
        }
        a.aoTocar = { [weak self] ns in
            guard let self else { return }
            let l = ns.map { [144.0, Double($0.nota), Double($0.forca), self.hora($0.amostra)] }
            DispatchQueue.main.async { self.aoTocar?(l) }
        }
        a.aoSoltar = { [weak self] ns, amostra in
            guard let self else { return }
            let t = self.hora(amostra)
            DispatchQueue.main.async { self.aoTocar?(ns.map { [128.0, Double($0), 0, t] }) }
        }
        an = a
        entrada.installTap(onBus: 0, bufferSize: 256, format: fmt) { [weak self] buf, quando in
            guard let self, let canal = buf.floatChannelData?[0] else { return }
            let n = Int(buf.frameLength)
            let copia = Array(UnsafeBufferPointer(start: canal, count: n))
            let agora = Date().timeIntervalSince1970 * 1000
            var horaBuf = agora
            if quando.isHostTimeValid {
                let atras = (Double(mach_absolute_time()) - Double(quando.hostTime)) * Double(self.base.numer) / Double(self.base.denom) / 1_000_000
                horaBuf = agora - max(0, atras)
            }
            self.fila.async {
                guard let a = self.an else { return }
                self.mapaAmostra = a.total; self.mapaHora = horaBuf
                copia.withUnsafeBufferPointer { a.receber($0.baseAddress!, n) }
            }
        }
        motor.prepare()
        try motor.start()
        ligado = true
    }

    func desligar() {
        guard ligado else { return }
        motor.inputNode.removeTap(onBus: 0)
        motor.stop()
        fila.async { self.an = nil }
        ligado = false
        try? AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
    }

    /// Calibração: o próximo ataque devolve a "impressão" do som (em vez de virar nota).
    func capturar(_ fim: @escaping ([Float]) -> Void) {
        fila.async { self.an?.capturar = { v, _ in DispatchQueue.main.async { fim(v) } } }
    }
    func cancelarCaptura() { fila.async { self.an?.capturar = nil } }
    /// Confere se a impressão parece mesmo a tecla pedida (e não a vizinha ou a oitava).
    func parece(_ v: [Float], nota: Int) -> Bool {
        guard let a = an else { return true }
        func s(_ n: Int) -> Float { let m = a.modelo(n); return zip(m, v).reduce(0) { $0 + $1.0 * $1.1 } }
        let alvo = s(nota)
        let outras = [-12, -2, -1, 1, 2, 12].map { s(nota + $0) }.max() ?? 0
        return alvo >= 0.85 * outras
    }
    func usarMoldes(_ m: [Int: [Float]]) { fila.async { self.an?.moldes = m } }
}
