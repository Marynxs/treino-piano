// Gravar vídeo: a câmera do iPhone com o som do piano.
// - Cabo do piano no iPhone: o som vem direto pelo USB-C (o P-225 também é placa de som USB).
// - Cabo do piano no Mac: o Mac grava o som do piano ao mesmo tempo e, ao parar, o iPhone junta esse som ao vídeo
//   (acerta o encaixe comparando com o som do microfone, para ficar sincronizado).
// - Sem nenhum dos dois: microfone do iPhone.
// Os vídeos ficam no app (Documents/videos), com a hora de início e fim, para o replay daquela tentativa achar o vídeo dela.
import UIKit
import AVFoundation
import Accelerate

/// Orientações permitidas no app (o app é deitado; a câmera pode ficar em pé).
final class Delegado: NSObject, UIApplicationDelegate {
    static var orientacoes: UIInterfaceOrientationMask = .landscape
    func application(_ a: UIApplication, supportedInterfaceOrientationsFor w: UIWindow?) -> UIInterfaceOrientationMask { Self.orientacoes }
    static func girar(_ m: UIInterfaceOrientationMask, _ vc: UIViewController) {
        orientacoes = m
        vc.setNeedsUpdateOfSupportedInterfaceOrientations()
        vc.view.window?.windowScene?.requestGeometryUpdate(.iOS(interfaceOrientations: m)) { _ in }
    }
}

enum Videos {
    struct Item: Codable {
        var arquivo: String; var ini: Double; var fim: Double; var som: String
        var nome: String? = nil
        var cIni: Double? = nil, cFim: Double? = nil   // corte, em segundos (o arquivo fica inteiro)
    }
    static let pasta = Copia.docs.appendingPathComponent("videos", isDirectory: true)
    private static let indice = pasta.appendingPathComponent("videos.json")

    static func lista() -> [Item] {
        guard let d = try? Data(contentsOf: indice), let l = try? JSONDecoder().decode([Item].self, from: d) else { return [] }
        return l.filter { FileManager.default.fileExists(atPath: url($0).path) }.sorted { $0.ini > $1.ini }
    }
    static func guardar(_ l: [Item]) {
        try? FileManager.default.createDirectory(at: pasta, withIntermediateDirectories: true)
        if let d = try? JSONEncoder().encode(l) { try? d.write(to: indice, options: .atomic) }
    }
    static func adicionar(_ i: Item) { var l = lista(); l.append(i); guardar(l) }
    static func trocar(_ i: Item) { guardar(lista().map { $0.arquivo == i.arquivo ? i : $0 }) }
    static func apagar(_ i: Item) {
        try? FileManager.default.removeItem(at: url(i))
        guardar(lista().filter { $0.arquivo != i.arquivo })
    }
    static func url(_ i: Item) -> URL { pasta.appendingPathComponent(i.arquivo) }
    static func de(ini: Double, fim: Double) -> Item? { lista().first { $0.ini <= fim && $0.fim >= ini } }
    static func quando(_ ms: Double) -> String {
        let f = DateFormatter(); f.locale = Locale(identifier: "pt_BR"); f.dateFormat = "dd/MM HH:mm"
        return f.string(from: Date(timeIntervalSince1970: ms / 1000))
    }
    static func duracao(_ ms: Double) -> String { let s = max(0, Int(ms / 1000)); return String(format: "%d:%02d", s / 60, s % 60) }
    static func titulo(_ i: Item) -> String { (i.nome?.isEmpty == false ? i.nome! : "Piano " + quando(i.ini)) }
    static func tamanho(_ i: Item) -> Int { ((try? FileManager.default.attributesOfItem(atPath: url(i).path)[.size] as? Int) ?? 0) / 1_000_000 }

    static func ver(_ i: Item, em seg: Double, de vc: UIViewController, aoMudar: (() -> Void)? = nil) {
        let t = TelaVideo(item: i, inicio: seg)
        t.aoMudar = aoMudar
        vc.present(t, animated: true)
    }

    /// Prepara o arquivo para mandar: com o nome dado e só o trecho do corte (sem refazer o vídeo).
    static func arquivoParaMandar(_ i: Item) async throws -> URL {
        let pasta = FileManager.default.temporaryDirectory.appendingPathComponent("mandar", isDirectory: true)
        try? FileManager.default.removeItem(at: pasta)
        try FileManager.default.createDirectory(at: pasta, withIntermediateDirectories: true)
        let nome = titulo(i).replacingOccurrences(of: "/", with: "-").replacingOccurrences(of: ":", with: "h")
        let destino = pasta.appendingPathComponent(nome + ".mov")
        if i.cIni == nil && i.cFim == nil { try FileManager.default.copyItem(at: url(i), to: destino); return destino }
        let a = AVURLAsset(url: url(i))
        let dur = try await a.load(.duration).seconds
        let ini = i.cIni ?? 0, fim = min(i.cFim ?? dur, dur)
        guard let e = AVAssetExportSession(asset: a, presetName: AVAssetExportPresetPassthrough) else { throw URLError(.cannotCreateFile) }
        e.timeRange = CMTimeRange(start: CMTime(seconds: ini, preferredTimescale: 600), end: CMTime(seconds: fim, preferredTimescale: 600))
        try await e.export(to: destino, as: .mov)
        return destino
    }
}

enum Estilo {
    static let fundo = UIColor(red: 0.075, green: 0.086, blue: 0.106, alpha: 1)
    static let cartao = UIColor(red: 0.149, green: 0.169, blue: 0.2, alpha: 1)
    static let azul = UIColor(red: 0.216, green: 0.541, blue: 0.867, alpha: 1)   // #378ADD
    static let texto = UIColor(red: 0.925, green: 0.937, blue: 0.953, alpha: 1)
    static let suave = UIColor(red: 0.663, green: 0.69, blue: 0.733, alpha: 1)
    static let vermelho = UIColor(red: 0.96, green: 0.45, blue: 0.45, alpha: 1)
    static func botao(_ b: UIButton, _ t: String, azul: Bool = false, cor: UIColor = .white) {
        var c = UIButton.Configuration.filled()
        c.title = t
        c.baseBackgroundColor = azul ? Self.azul : cartao.withAlphaComponent(0.92)
        c.baseForegroundColor = azul ? .white : cor
        c.cornerStyle = .large
        c.contentInsets = NSDirectionalEdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16)
        c.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { var a = $0; a.font = .systemFont(ofSize: 17, weight: .semibold); return a }
        b.configuration = c
        if !b.constraints.contains(where: { $0.firstAttribute == .height }) { b.heightAnchor.constraint(greaterThanOrEqualToConstant: 48).isActive = true }
    }
    static func rotulo(_ l: UILabel, _ tam: CGFloat = 15) {
        l.textColor = texto; l.font = .systemFont(ofSize: tam, weight: .semibold)
        l.translatesAutoresizingMaskIntoConstraints = false
    }
    /// Botão redondo só com ícone (SF Symbols). Ligado = azul #378ADD. O nome vai para o VoiceOver.
    static func icone(_ b: UIButton, _ simbolo: String, _ nome: String, ligado: Bool = false, tam: CGFloat = 52, cor: UIColor = .white) {
        var c = UIButton.Configuration.filled()
        c.image = UIImage(systemName: simbolo, withConfiguration: UIImage.SymbolConfiguration(pointSize: tam * 0.38, weight: .semibold))
        c.baseBackgroundColor = ligado ? azul : UIColor(white: 0.12, alpha: 0.72)
        c.baseForegroundColor = ligado ? .white : cor
        c.cornerStyle = .capsule
        c.contentInsets = .zero
        b.configuration = c
        b.accessibilityLabel = nome
        b.translatesAutoresizingMaskIntoConstraints = false
        if !b.constraints.contains(where: { $0.identifier == "icone" }) {
            let w = b.widthAnchor.constraint(equalToConstant: tam), h = b.heightAnchor.constraint(equalToConstant: tam)
            w.identifier = "icone"; h.identifier = "icone"; NSLayoutConstraint.activate([w, h])
        }
    }
}

/// Som do piano gravado pelo Mac (quando o cabo está no Mac).
enum SomDoMac {
    static func cmd(_ base: String, _ o: [String: Any]) {
        guard let u = URL(string: base + "/api/cmd") else { return }
        var r = URLRequest(url: u); r.httpMethod = "POST"; r.httpBody = try? JSONSerialization.data(withJSONObject: o)
        URLSession.shared.dataTask(with: r).resume()
    }
    static func json(_ base: String, _ q: String) async -> [String: Any]? {
        guard let u = URL(string: base + "/api/somvideo?" + q),
              let (d, r) = try? await URLSession.shared.data(from: u), (r as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        return try? JSONSerialization.jsonObject(with: d) as? [String: Any]
    }

    /// Envelope de ataques (5 ms por ponto) dos primeiros minutos do som de um arquivo.
    static func ataques(_ url: URL, limite: Double = 240) async throws -> [Float] {
        let a = AVURLAsset(url: url)
        guard let tr = try await a.loadTracks(withMediaType: .audio).first else { throw URLError(.cannotDecodeContentData) }
        let r = try AVAssetReader(asset: a)
        r.timeRange = CMTimeRange(start: .zero, duration: CMTime(seconds: limite, preferredTimescale: 600))
        let o = AVAssetReaderTrackOutput(track: tr, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMBitDepthKey: 32, AVLinearPCMIsFloatKey: true,
                                                                   AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false, AVNumberOfChannelsKey: 1, AVSampleRateKey: 16000])
        r.add(o); r.startReading()
        var s: [Float] = []
        while let sb = o.copyNextSampleBuffer() {
            guard let bb = CMSampleBufferGetDataBuffer(sb) else { continue }
            let n = CMBlockBufferGetDataLength(bb) / 4
            var tmp = [Float](repeating: 0, count: n)
            _ = tmp.withUnsafeMutableBytes { CMBlockBufferCopyDataBytes(bb, atOffset: 0, dataLength: n * 4, destination: $0.baseAddress!) }
            s += tmp
        }
        let q = 80, nq = s.count / q
        var e = [Float](repeating: 0, count: nq)
        for i in 0..<nq { var v: Float = 0; s.withUnsafeBufferPointer { vDSP_svesq($0.baseAddress! + i * q, 1, &v, vDSP_Length(q)) }; e[i] = log10(1e-7 + v) }
        var f = [Float](repeating: 0, count: nq)
        for i in 1..<max(1, nq) { f[i] = max(0, e[i] - e[i - 1]) }
        var m: Float = 0, d: Float = 0
        vDSP_normalize(f, 1, &f, 1, &m, &d, vDSP_Length(f.count))
        return f
    }

    /// Onde o som do Mac começa no vídeo (segundos): procura perto do palpite pelo relógio, comparando os ataques.
    static func encaixe(mac: [Float], mic: [Float], palpite: Double) -> (Double, Bool) {
        let p = Int((palpite / 0.005).rounded()), faixa = 600
        var notas: [Float] = []
        for d in (p - faixa)...(p + faixa) {
            let i0 = max(0, -d), i1 = min(mac.count, mic.count - d)
            if i1 - i0 < 400 { notas.append(0); continue }
            var v: Float = 0
            mac.withUnsafeBufferPointer { a in mic.withUnsafeBufferPointer { b in vDSP_dotpr(a.baseAddress! + i0, 1, b.baseAddress! + i0 + d, 1, &v, vDSP_Length(i1 - i0)) } }
            notas.append(v / Float(i1 - i0))
        }
        guard let mx = notas.max(), let k = notas.firstIndex(of: mx) else { return (palpite, false) }
        var media: Float = 0, dp: Float = 0
        vDSP_normalize(notas, 1, nil, 1, &media, &dp, vDSP_Length(notas.count))
        let confia = dp > 0 && (mx - media) / dp > 6
        return confia ? (Double(p - faixa + k) * 0.005, true) : (palpite, false)
    }

    private static func m4a(_ de: URL) async throws -> URL {
        let para = de.deletingPathExtension().appendingPathExtension("m4a")
        try? FileManager.default.removeItem(at: para)
        guard let e = AVAssetExportSession(asset: AVURLAsset(url: de), presetName: AVAssetExportPresetAppleM4A) else { throw URLError(.cannotCreateFile) }
        try await e.export(to: para, as: .m4a)
        return para
    }

    /// Troca o som do vídeo pelo som do piano (o vídeo não é refeito).
    static func juntar(video: URL, som: URL, em d: Double) async throws {
        let va = AVURLAsset(url: video), sa = AVURLAsset(url: som)
        guard let vt = try await va.loadTracks(withMediaType: .video).first, let st = try await sa.loadTracks(withMediaType: .audio).first else { throw URLError(.cannotDecodeContentData) }
        let vdur = try await va.load(.duration).seconds, sdur = try await sa.load(.duration).seconds
        let comp = AVMutableComposition()
        guard let cv = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let ca = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else { throw URLError(.cannotCreateFile) }
        try cv.insertTimeRange(CMTimeRange(start: .zero, duration: CMTime(seconds: vdur, preferredTimescale: 600)), of: vt, at: .zero)
        cv.preferredTransform = try await vt.load(.preferredTransform)
        let de = max(0, -d), em = max(0, d), tam = min(sdur - de, vdur - em)
        guard tam > 0.5 else { throw URLError(.dataLengthExceedsMaximum) }
        try ca.insertTimeRange(CMTimeRange(start: CMTime(seconds: de, preferredTimescale: 44100), duration: CMTime(seconds: tam, preferredTimescale: 44100)), of: st, at: CMTime(seconds: em, preferredTimescale: 44100))
        let tmp = video.deletingLastPathComponent().appendingPathComponent("junto-" + video.lastPathComponent)
        try? FileManager.default.removeItem(at: tmp)
        guard let e = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough) else { throw URLError(.cannotCreateFile) }
        try await e.export(to: tmp, as: .mov)
        _ = try FileManager.default.replaceItemAt(video, withItemAt: tmp)
    }

    /// Depois de parar: espera o Mac mandar o som, baixa e junta ao vídeo. Devolve um texto para mostrar.
    static func depois(item: Videos.Item, base: String, k: String) async -> String {
        var info: [String: Any]?
        for _ in 0..<120 { info = await json(base, "k=\(k)&info=1"); if info != nil { break }; try? await Task.sleep(nanoseconds: 700_000_000) }
        guard let t0 = (info?["t0"] as? NSNumber)?.doubleValue, t0 > 0 else {
            Registro.anotar("câmera: o Mac não mandou o som do piano (\(k))"); return "O Mac não mandou o som do piano. O vídeo ficou com o som do microfone."
        }
        do {
            guard let u = URL(string: base + "/api/somvideo?k=\(k)") else { throw URLError(.badURL) }
            let (arq, r) = try await URLSession.shared.download(from: u)
            guard (r as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            let wav = FileManager.default.temporaryDirectory.appendingPathComponent("somdomac-\(k).wav")
            try? FileManager.default.removeItem(at: wav); try FileManager.default.moveItem(at: arq, to: wav)
            let som = try await m4a(wav)
            let video = Videos.url(item)
            let palpite = (t0 - item.ini) / 1000
            let (d, achou) = encaixe(mac: try await ataques(som), mic: try await ataques(video), palpite: palpite)
            try await juntar(video: video, som: som, em: d)
            var novo = item; novo.som = "mac"; Videos.trocar(novo)
            try? FileManager.default.removeItem(at: wav); try? FileManager.default.removeItem(at: som)
            Registro.anotar(String(format: "câmera: som do Mac junto ao vídeo (encaixe %.3f s, palpite %.3f s, %@)", d, palpite, achou ? "pelos ataques" : "pelo relógio"))
            return "Pronto: o vídeo já tem o som do piano do Mac. Para ver, toque no ícone dos filmes."
        } catch {
            Registro.anotar("câmera: não juntou o som do Mac: \(error.localizedDescription)")
            return "Não consegui juntar o som do Mac (\(error.localizedDescription)). O vídeo ficou com o som do microfone."
        }
    }
}

/// Botão de gravar, como o da câmera do iPhone: anel branco com círculo vermelho; gravando, vira um quadrado vermelho.
final class BotaoGravar: UIButton {
    private let miolo = UIView()
    var gravando = false { didSet { UIView.animate(withDuration: 0.2) { self.layoutSubviews() }; accessibilityLabel = gravando ? "Parar" : "Gravar" } }
    override init(frame: CGRect) {
        super.init(frame: frame)
        layer.borderColor = UIColor.white.cgColor; layer.borderWidth = 4
        miolo.backgroundColor = UIColor(red: 0.9, green: 0.28, blue: 0.3, alpha: 1); miolo.isUserInteractionEnabled = false
        addSubview(miolo); accessibilityLabel = "Gravar"
        translatesAutoresizingMaskIntoConstraints = false
        widthAnchor.constraint(equalToConstant: 72).isActive = true; heightAnchor.constraint(equalToConstant: 72).isActive = true
    }
    required init?(coder: NSCoder) { fatalError() }
    override func layoutSubviews() {
        super.layoutSubviews()
        layer.cornerRadius = bounds.width / 2
        let s: CGFloat = gravando ? 28 : bounds.width - 14
        miolo.frame = CGRect(x: (bounds.width - s) / 2, y: (bounds.height - s) / 2, width: s, height: s)
        miolo.layer.cornerRadius = gravando ? 6 : s / 2
    }
    override var isEnabled: Bool { didSet { alpha = isEnabled ? 1 : 0.4 } }
}

final class TelaCamera: UIViewController, AVCaptureFileOutputRecordingDelegate {
    var aoFechar: (() -> Void)?
    private let mac: String?           // endereço do Mac, quando o iPhone está ligado a ele
    private let sessao = AVCaptureSession()
    private let filaSessao = DispatchQueue(label: "camera")
    private let saida = AVCaptureMovieFileOutput()
    private var entradaVideo: AVCaptureDeviceInput?
    private var girar: AVCaptureDevice.RotationCoordinator?
    private var obsGiro: NSKeyValueObservation?
    private let previa = AVCaptureVideoPreviewLayer()
    private let somRotulo = Etiqueta(), tempo = Etiqueta(), aviso = Etiqueta()
    private let gravar = BotaoGravar()
    private let fechar = UIButton(type: .system), trocar = UIButton(type: .system), videos = UIButton(type: .system),
                virar = UIButton(type: .system), somMac = UIButton(type: .system), partitura = UIButton(type: .system)
    // volta para a partitura sem parar a câmera (o controle pequeno na lateral grava e para)
    var aoMinimizar: (() -> Void)?, aoEstado: (() -> Void)?, aoAvisoFora: ((String) -> Void)?
    private(set) var minimizada = false
    var gravando: Bool { saida.isRecording }
    var inicioGravacao: Double { inicio }
    private let colA = UIStackView(), colB = UIStackView()   // A: girar e som do Mac · B: trocar câmera, gravar, vídeos
    private var deitadoC: [NSLayoutConstraint] = [], emPeC: [NSLayoutConstraint] = []
    private var inicio: Double = 0
    private var relogio: Timer?
    private var fonteSom = "microfone"
    private var traseira = true
    private var macPronto = false, kMac = "", kGravacao = "", nomeMac: String?
    private var vertical: Bool {
        get { UserDefaults.standard.bool(forKey: "cameraVertical") }
        set { UserDefaults.standard.set(newValue, forKey: "cameraVertical") }
    }
    private var usarMac: Bool {   // som do Mac: ligado por padrão quando existe
        get { UserDefaults.standard.object(forKey: "cameraSomMac") as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: "cameraSomMac") }
    }

    private var apareceu = false   // abre deitado (como o app) e só depois gira; senão o iOS fecha o app
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { apareceu && vertical ? .portrait : .landscape }
    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }

    init(mac: String?) { self.mac = mac; super.init(nibName: nil, bundle: nil); modalPresentationStyle = .fullScreen }
    required init?(coder: NSCoder) { fatalError() }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        previa.session = sessao
        previa.videoGravity = .resizeAspect
        view.layer.addSublayer(previa)

        for l in [somRotulo, tempo, aviso] {
            Estilo.rotulo(l)
            l.backgroundColor = UIColor.black.withAlphaComponent(0.55); l.layer.cornerRadius = 16; l.clipsToBounds = true
            l.textAlignment = .center; l.numberOfLines = 0
            view.addSubview(l)
        }
        tempo.font = .monospacedDigitSystemFont(ofSize: 17, weight: .bold); tempo.isHidden = true
        tempo.backgroundColor = UIColor(red: 0.9, green: 0.28, blue: 0.3, alpha: 0.9)
        aviso.isHidden = true

        Estilo.icone(fechar, "xmark", "Fechar")
        Estilo.icone(trocar, "arrow.triangle.2.circlepath.camera", "Trocar câmera")
        fechar.addTarget(self, action: #selector(fecha), for: .touchUpInside)
        trocar.addTarget(self, action: #selector(trocaCamera), for: .touchUpInside)
        videos.addTarget(self, action: #selector(abreVideos), for: .touchUpInside)
        gravar.addTarget(self, action: #selector(alterna), for: .touchUpInside)
        virar.addTarget(self, action: #selector(vira), for: .touchUpInside)
        somMac.addTarget(self, action: #selector(alternaSomMac), for: .touchUpInside)
        somMac.isHidden = true
        Estilo.icone(partitura, "music.note.list", "Ver a partitura (a câmera continua)")
        partitura.addTarget(self, action: #selector(minimiza), for: .touchUpInside)
        [partitura, virar, somMac].forEach { colA.addArrangedSubview($0) }
        [trocar, gravar, videos].forEach { colB.addArrangedSubview($0) }
        for s in [colA, colB] { s.spacing = 16; s.alignment = .center; s.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(s) }
        fechar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(fechar)

        let g = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            fechar.topAnchor.constraint(equalTo: g.topAnchor, constant: 16),
            fechar.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 16),
            somRotulo.heightAnchor.constraint(greaterThanOrEqualToConstant: 36),
            somRotulo.centerXAnchor.constraint(equalTo: g.centerXAnchor),
            tempo.heightAnchor.constraint(equalToConstant: 32), tempo.widthAnchor.constraint(equalToConstant: 76),
            aviso.centerXAnchor.constraint(equalTo: g.centerXAnchor), aviso.centerYAnchor.constraint(equalTo: g.centerYAnchor),
            aviso.widthAnchor.constraint(lessThanOrEqualTo: g.widthAnchor, constant: -200),
        ])
        // deitado: fechar e A à esquerda, B numa coluna à direita (como a câmera do iPhone)
        deitadoC = [
            colA.topAnchor.constraint(equalTo: fechar.bottomAnchor, constant: 16),
            colA.centerXAnchor.constraint(equalTo: fechar.centerXAnchor),
            colB.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -16),
            colB.centerYAnchor.constraint(equalTo: g.centerYAnchor),
            somRotulo.topAnchor.constraint(equalTo: g.topAnchor, constant: 16),
            somRotulo.widthAnchor.constraint(lessThanOrEqualTo: g.widthAnchor, constant: -260),
            tempo.centerXAnchor.constraint(equalTo: colB.centerXAnchor),
            tempo.bottomAnchor.constraint(equalTo: colB.topAnchor, constant: -16),
        ]
        // em pé: fechar à esquerda e A à direita no alto, B numa linha embaixo
        emPeC = [
            colA.topAnchor.constraint(equalTo: g.topAnchor, constant: 16),
            colA.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -16),
            colB.bottomAnchor.constraint(equalTo: g.bottomAnchor, constant: -24),
            colB.centerXAnchor.constraint(equalTo: g.centerXAnchor),
            somRotulo.topAnchor.constraint(equalTo: fechar.bottomAnchor, constant: 16),
            somRotulo.widthAnchor.constraint(lessThanOrEqualTo: g.widthAnchor, constant: -32),
            tempo.centerXAnchor.constraint(equalTo: g.centerXAnchor),
            tempo.bottomAnchor.constraint(equalTo: colB.topAnchor, constant: -20),
        ]
        atualizarBotoes()
        pedirAcesso()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        apareceu = true
        minimizada = false
        Delegado.girar(vertical ? .portrait : .landscape, self)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previa.frame = view.bounds
        let deitado = view.bounds.width > view.bounds.height
        colA.axis = deitado ? .vertical : .horizontal
        colB.axis = deitado ? .vertical : .horizontal
        colB.spacing = deitado ? 24 : 48
        NSLayoutConstraint.deactivate(deitado ? emPeC : deitadoC)
        NSLayoutConstraint.activate(deitado ? deitadoC : emPeC)
    }

    private func atualizarBotoes() {
        let n = Videos.lista().count
        Estilo.icone(videos, "film.stack", "Vídeos gravados: \(n)")
        Estilo.icone(virar, vertical ? "rectangle.landscape.rotate" : "rectangle.portrait.rotate", vertical ? "Deitar a câmera" : "Câmera em pé")
        Estilo.icone(somMac, "desktopcomputer", "Som do Mac: " + (usarMac ? "ligado" : "desligado"), ligado: usarMac)
    }

    /// Avisos somem sozinhos depois de alguns segundos (só "juntando o som" fica até acabar).
    private func mostrarAviso(_ t: String?) {
        aviso.text = t; aviso.isHidden = t == nil; if minimizada, let t { aoAvisoFora?(t) }
        guard let t, !t.hasSuffix("…") else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in if self?.aviso.text == t { self?.aviso.isHidden = true } }
    }
    /// De onde vem o som: aparece ao abrir e quando muda, e some depois de 4 s.
    private func som(_ t: String, fixo: Bool = false) {
        somRotulo.text = t; somRotulo.isHidden = false
        guard !fixo else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in if self?.somRotulo.text == t { UIView.animate(withDuration: 0.3) { self?.somRotulo.isHidden = true } } }
    }

    override func viewWillDisappear(_ animated: Bool) { super.viewWillDisappear(animated); apareceu = false }

    /// Volta para a partitura; a câmera (e a gravação, se estiver gravando) continua.
    @objc private func minimiza() {
        minimizada = true
        Registro.anotar("câmera: foi para a partitura" + (saida.isRecording ? " (gravando)" : ""))
        Delegado.girar(.landscape, self)
        dismiss(animated: true) { [aoMinimizar] in aoMinimizar?() }
    }
    func alternarGravacao() { alterna() }
    func irParaPartitura() { minimiza() }
    func encerrar() { fecha() }

    private func pedirAcesso() {
        #if targetEnvironment(simulator)
        mostrarAviso("O simulador não tem câmera. Teste no iPhone."); gravar.isEnabled = false
        som("Som: piano pelo Mac (P-Series)"); macPronto = true; somMac.isHidden = false
        return
        #else
        AVCaptureDevice.requestAccess(for: .video) { okV in
            AVCaptureDevice.requestAccess(for: .audio) { okA in
                DispatchQueue.main.async {
                    guard okV else { self.mostrarAviso("Sem acesso à câmera. Permita em Ajustes do iPhone → Treino de Piano."); self.gravar.isEnabled = false; return }
                    if !okA { self.mostrarAviso("Sem acesso ao som: o vídeo vai sair mudo. Permita o microfone em Ajustes → Treino de Piano.") }
                    self.montar(comSom: okA)
                }
            }
        }
        #endif
    }

    /// O som: o do piano pelo cabo no iPhone; senão o microfone (e, com o Mac, o som do piano gravado por ele).
    private func prepararSom() {
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playAndRecord, mode: .videoRecording, options: [.mixWithOthers, .defaultToSpeaker])
        try? s.setActive(true)
        if let usb = s.availableInputs?.first(where: { $0.portType == .usbAudio }) {
            try? s.setPreferredInput(usb)
            fonteSom = "piano"
            som("Som: piano pelo cabo no iPhone")
        } else {
            fonteSom = "microfone"
            som("Som: microfone do iPhone")
            if mac != nil { perguntarAoMac() }
        }
        Registro.anotar("câmera: som de \(fonteSom) · entradas: \(s.availableInputs?.map { "\($0.portType.rawValue):\($0.portName)" }.joined(separator: ", ") ?? "-")")
    }

    private func perguntarAoMac() {
        guard let mac else { return }
        kMac = "c" + String(Int(Date().timeIntervalSince1970 * 1000), radix: 36)
        som("Perguntando ao Mac pelo som do piano… Na 1ª vez, aperte Permitir no Chrome do Mac.", fixo: true)
        SomDoMac.cmd(mac, ["cmd": "somvideo", "v": "prep", "k": kMac])
        Task { @MainActor in
            for _ in 0..<60 {
                if let e = await SomDoMac.json(mac, "k=\(kMac)&estado=1"), e["esperando"] == nil {
                    if (e["ok"] as? Bool) == true {
                        macPronto = true; nomeMac = e["nome"] as? String; somMac.isHidden = false; atualizarBotoes(); mostrarSom()
                    } else {
                        som("Som: microfone do iPhone (\((e["erro"] as? String) ?? "o Mac não tem o som do piano"))")
                    }
                    return
                }
                try? await Task.sleep(nanoseconds: 500_000_000)
            }
            som("Som: microfone do iPhone (o Mac não respondeu)")
        }
    }

    private func mostrarSom() {
        guard macPronto else { return }
        som(usarMac ? "Som: piano pelo Mac (\(nomeMac ?? "cabo"))" : "Som do Mac desligado: microfone do iPhone")
    }

    @objc private func alternaSomMac() {
        guard !saida.isRecording else { return }
        usarMac.toggle(); atualizarBotoes(); mostrarSom()
    }

    private func montar(comSom: Bool) {
        if comSom { prepararSom() } else { som("Sem som") }
        filaSessao.async {
            self.sessao.beginConfiguration()
            self.sessao.automaticallyConfiguresApplicationAudioSession = false   // mantém a entrada do cabo que escolhemos
            self.sessao.sessionPreset = .high
            self.ligarCamera(traseira: true)
            if comSom, let mic = AVCaptureDevice.default(for: .audio), let e = try? AVCaptureDeviceInput(device: mic), self.sessao.canAddInput(e) { self.sessao.addInput(e) }
            if self.sessao.canAddOutput(self.saida) { self.sessao.addOutput(self.saida) }
            self.sessao.commitConfiguration()
            self.sessao.startRunning()
            DispatchQueue.main.async { self.acertarGiro() }
        }
    }

    /// Chamado na fila da sessão, dentro de begin/commitConfiguration.
    private func ligarCamera(traseira: Bool) {
        if let e = entradaVideo { sessao.removeInput(e) }
        let pos: AVCaptureDevice.Position = traseira ? .back : .front
        guard let cam = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: pos),
              let e = try? AVCaptureDeviceInput(device: cam), sessao.canAddInput(e) else { return }
        sessao.addInput(e); entradaVideo = e; self.traseira = traseira
    }

    private func acertarGiro() {
        guard let cam = entradaVideo?.device else { return }
        let r = AVCaptureDevice.RotationCoordinator(device: cam, previewLayer: previa)
        girar = r
        let aplicar = { [weak self] in
            guard let self, let c = self.previa.connection else { return }
            let a = r.videoRotationAngleForHorizonLevelPreview
            if c.isVideoRotationAngleSupported(a) { c.videoRotationAngle = a }
        }
        aplicar()
        obsGiro = r.observe(\.videoRotationAngleForHorizonLevelPreview, options: [.new]) { _, _ in DispatchQueue.main.async { aplicar() } }
    }

    @objc private func vira() {
        guard !saida.isRecording else { return }
        vertical.toggle(); atualizarBotoes()
        Delegado.girar(vertical ? .portrait : .landscape, self)
        Registro.anotar("câmera: " + (vertical ? "em pé" : "deitada"))
    }

    @objc private func trocaCamera() {
        guard !saida.isRecording else { return }
        filaSessao.async {
            self.sessao.beginConfiguration()
            self.ligarCamera(traseira: !self.traseira)
            self.sessao.commitConfiguration()
            DispatchQueue.main.async { self.acertarGiro() }
        }
    }

    private var comMac: Bool { macPronto && usarMac && fonteSom != "piano" && mac != nil }

    @objc private func alterna() {
        if gravar.isEnabled == false && !saida.isRecording { aoAvisoFora?("A câmera ainda não está pronta."); return }
        if saida.isRecording {
            if comMac, let mac { SomDoMac.cmd(mac, ["cmd": "somvideo", "v": "parar", "k": kGravacao]) }
            filaSessao.async { self.saida.stopRecording() }; return
        }
        guard let c = saida.connection(with: .video) else { mostrarAviso("A câmera ainda não está pronta."); return }
        if let r = girar, c.isVideoRotationAngleSupported(r.videoRotationAngleForHorizonLevelCapture) { c.videoRotationAngle = r.videoRotationAngleForHorizonLevelCapture }
        if saida.availableVideoCodecTypes.contains(.hevc) { saida.setOutputSettings([AVVideoCodecKey: AVVideoCodecType.hevc], for: c) }
        try? FileManager.default.createDirectory(at: Videos.pasta, withIntermediateDirectories: true)
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd-HHmmss"
        let url = Videos.pasta.appendingPathComponent("Piano-\(f.string(from: Date())).mov")
        mostrarAviso(nil)
        if comMac, let mac {
            kGravacao = "g" + String(Int(Date().timeIntervalSince1970 * 1000), radix: 36)
            SomDoMac.cmd(mac, ["cmd": "somvideo", "v": "gravar", "k": kGravacao])
        }
        filaSessao.async { self.saida.startRecording(to: url, recordingDelegate: self) }
    }

    private func travar(_ t: Bool) {
        [trocar, fechar, videos, virar, somMac].forEach { $0.isEnabled = !t; $0.alpha = t ? 0.35 : 1 }
    }

    func fileOutput(_ o: AVCaptureFileOutput, didStartRecordingTo url: URL, from c: [AVCaptureConnection]) {
        DispatchQueue.main.async {
            self.inicio = Date().timeIntervalSince1970 * 1000
            self.gravar.gravando = true; self.travar(true); self.aoEstado?()
            self.tempo.isHidden = false; self.tempo.text = "0:00"
            self.relogio = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
                guard let self else { return }
                self.tempo.text = Videos.duracao(Date().timeIntervalSince1970 * 1000 - self.inicio)
            }
            Registro.anotar("câmera: gravando (\(self.comMac ? "som do Mac" : self.fonteSom))")
        }
    }

    func fileOutput(_ o: AVCaptureFileOutput, didFinishRecordingTo url: URL, from c: [AVCaptureConnection], error: Error?) {
        let fim = Date().timeIntervalSince1970 * 1000
        DispatchQueue.main.async {
            self.relogio?.invalidate(); self.tempo.isHidden = true
            self.gravar.gravando = false; self.travar(false); self.aoEstado?()
            guard FileManager.default.fileExists(atPath: url.path) else {
                let e = error?.localizedDescription ?? "sem arquivo"
                self.mostrarAviso("Não consegui guardar o vídeo (\(e)).")
                Registro.anotar("câmera: falhou \(e)"); return
            }
            let item = Videos.Item(arquivo: url.lastPathComponent, ini: self.inicio, fim: fim, som: self.fonteSom)
            Videos.adicionar(item)
            let dur = Videos.duracao(fim - self.inicio), mb = Videos.tamanho(item)
            Registro.anotar("câmera: vídeo guardado \(item.arquivo) · \(dur) · \(mb) MB")
            self.atualizarBotoes()
            guard self.comMac, let mac = self.mac else {
                self.mostrarAviso("Vídeo guardado (\(dur)). Para ver, toque no ícone dos filmes."); return
            }
            self.mostrarAviso("Vídeo guardado (\(dur)). Juntando o som do piano que o Mac gravou…")
            let k = self.kGravacao
            Task { @MainActor [weak self] in
                let t = await SomDoMac.depois(item: item, base: mac, k: k)
                self?.mostrarAviso(t)
            }
        }
    }

    @objc private func abreVideos() {
        let l = ListaVideos()
        l.aoMudar = { [weak self] in self?.atualizarBotoes() }
        let n = UINavigationController(rootViewController: l)
        n.modalPresentationStyle = .fullScreen
        present(n, animated: true)
    }

    @objc private func fecha() {
        guard !saida.isRecording else { return }
        relogio?.invalidate(); obsGiro = nil
        filaSessao.async { self.sessao.stopRunning() }
        if macPronto, let mac { SomDoMac.cmd(mac, ["cmd": "somvideo", "v": "fim", "k": kMac]) }
        try? AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
        Registro.anotar("câmera: fechou")
        if presentingViewController == nil { aoFechar?(); return }   // fechada pelo controle da partitura
        Delegado.girar(.landscape, self)
        dismiss(animated: true) { [aoFechar] in aoFechar?() }
    }
}

/// Lista dos vídeos. Tocar num abre a tela dele (ver, cortar, renomear, mandar, apagar).
final class ListaVideos: UITableViewController {
    var aoMudar: (() -> Void)?
    private var l = Videos.lista()
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { Delegado.orientacoes }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Vídeos"
        overrideUserInterfaceStyle = .dark
        navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Fechar", style: .done, target: self, action: #selector(fecha))
        tableView.rowHeight = 64
        recarregar()
    }
    private func recarregar() {
        l = Videos.lista(); tableView.reloadData()
        let v = UILabel(); v.text = "Nenhum vídeo ainda. Aperte ● Gravar."; v.textAlignment = .center; v.textColor = Estilo.suave
        tableView.backgroundView = l.isEmpty ? v : nil
        aoMudar?()
    }
    @objc private func fecha() { dismiss(animated: true) }

    override func tableView(_ t: UITableView, numberOfRowsInSection s: Int) -> Int { l.count }
    override func tableView(_ t: UITableView, cellForRowAt ip: IndexPath) -> UITableViewCell {
        let c = UITableViewCell(style: .subtitle, reuseIdentifier: nil), i = l[ip.row]
        let corte = (i.cIni != nil || i.cFim != nil) ? " · cortado" : ""
        c.textLabel?.text = Videos.titulo(i)
        c.detailTextLabel?.text = Videos.quando(i.ini) + " · " + Videos.duracao(i.fim - i.ini) + corte + " · " +
            (i.som == "piano" ? "som do piano pelo cabo" : i.som == "mac" ? "som do piano pelo Mac" : "som do microfone") + " · \(Videos.tamanho(i)) MB"
        c.accessoryType = .disclosureIndicator
        return c
    }
    override func tableView(_ t: UITableView, didSelectRowAt ip: IndexPath) {
        t.deselectRow(at: ip, animated: true)
        Videos.ver(l[ip.row], em: l[ip.row].cIni ?? 0, de: self) { [weak self] in self?.recarregar() }
    }
}

/// Um vídeo: tocar, cortar o começo e o fim (o arquivo fica inteiro; ao mandar, vai só o trecho), renomear, mandar e apagar.
final class TelaVideo: UIViewController {
    var aoMudar: (() -> Void)?
    private var item: Videos.Item
    private let inicio: Double
    private let player: AVPlayer
    private let camada = AVPlayerLayer()
    private let tela = UIView()
    private var dur: Double = 0
    private var obsTempo: Any?
    private let titulo = UILabel(), hora = UILabel(), corteT = UILabel(), aviso = UILabel()
    private let posicao = UISlider(), cIni = UISlider(), cFim = UISlider()
    private let tocar = UIButton(type: .system), cortar = UIButton(type: .system), guardar = UIButton(type: .system), cancelar = UIButton(type: .system),
                mandar = UIButton(type: .system), renomear = UIButton(type: .system), apagar = UIButton(type: .system), fechar = UIButton(type: .system)
    private let barraTocar = UIStackView(), barraCorte = UIStackView()
    private var cortando = false { didSet { barraTocar.isHidden = cortando; barraCorte.isHidden = !cortando; Estilo.icone(cortar, "scissors", "Cortar o começo e o fim", ligado: cortando, tam: 44) } }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { Delegado.orientacoes }
    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }

    init(item: Videos.Item, inicio: Double) {
        self.item = item; self.inicio = inicio; self.player = AVPlayer(url: Videos.url(item))
        super.init(nibName: nil, bundle: nil); modalPresentationStyle = .fullScreen
    }
    required init?(coder: NSCoder) { fatalError() }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = Estilo.fundo
        camada.player = player; camada.videoGravity = .resizeAspect
        tela.layer.addSublayer(camada); tela.backgroundColor = .black
        tela.layer.cornerRadius = 12; tela.clipsToBounds = true
        tela.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(tocaPausa)))

        Estilo.rotulo(titulo, 17); titulo.text = Videos.titulo(item); titulo.lineBreakMode = .byTruncatingTail
        titulo.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        Estilo.rotulo(hora); hora.font = .monospacedDigitSystemFont(ofSize: 15, weight: .semibold); hora.textColor = Estilo.suave
        Estilo.rotulo(corteT); corteT.font = .monospacedDigitSystemFont(ofSize: 15, weight: .regular); corteT.textColor = Estilo.suave
        Estilo.rotulo(aviso); aviso.textColor = Estilo.suave; aviso.numberOfLines = 0; aviso.isHidden = true
        for s in [posicao, cIni, cFim] { s.minimumTrackTintColor = Estilo.azul; s.maximumTrackTintColor = UIColor(white: 1, alpha: 0.28); s.heightAnchor.constraint(greaterThanOrEqualToConstant: 44).isActive = true }
        Estilo.icone(fechar, "xmark", "Fechar", tam: 44)
        Estilo.icone(renomear, "pencil", "Renomear", tam: 44)
        Estilo.icone(mandar, "square.and.arrow.up", "Compartilhar", ligado: true, tam: 44)
        Estilo.icone(apagar, "trash", "Apagar", tam: 44, cor: Estilo.vermelho)
        Estilo.icone(guardar, "checkmark", "Guardar corte", ligado: true, tam: 44)
        Estilo.icone(cancelar, "arrow.uturn.backward", "Desistir do corte", tam: 44)
        cortando = false
        if ProcessInfo.processInfo.arguments.contains("-cortando") { cortando = true }   // para conferir no simulador
        tocar.addTarget(self, action: #selector(tocaPausa), for: .touchUpInside)
        cortar.addTarget(self, action: #selector(abreCorte), for: .touchUpInside)
        guardar.addTarget(self, action: #selector(guardaCorte), for: .touchUpInside)
        cancelar.addTarget(self, action: #selector(desisteCorte), for: .touchUpInside)
        mandar.addTarget(self, action: #selector(manda), for: .touchUpInside)
        renomear.addTarget(self, action: #selector(renomeia), for: .touchUpInside)
        apagar.addTarget(self, action: #selector(apaga), for: .touchUpInside)
        fechar.addTarget(self, action: #selector(fecha), for: .touchUpInside)
        posicao.addTarget(self, action: #selector(moveu), for: .valueChanged)
        cIni.addTarget(self, action: #selector(moveuCorte(_:)), for: .valueChanged)
        cFim.addTarget(self, action: #selector(moveuCorte(_:)), for: .valueChanged)
        cIni.accessibilityLabel = "Começo"; cFim.accessibilityLabel = "Fim"

        let topo = linha([fechar, titulo, cortar, renomear, mandar, apagar])
        topo.setCustomSpacing(16, after: fechar); topo.setCustomSpacing(16, after: titulo)
        [barraTocar].forEach { s in [tocar, posicao, hora].forEach { s.addArrangedSubview($0) }; s.spacing = 12; s.alignment = .center }
        let ci = UILabel(), cf = UILabel()
        Estilo.rotulo(ci); ci.text = "Começo"; Estilo.rotulo(cf); cf.text = "Fim"
        [ci, cf].forEach { $0.setContentHuggingPriority(.required, for: .horizontal) }
        let a = linha([ci, cIni]), b = linha([cf, cFim]), c = linha([corteT, UIView(), cancelar, guardar])
        [a, b, c].forEach { barraCorte.addArrangedSubview($0) }
        barraCorte.spacing = 12; barraCorte.distribution = .fill
        cIni.widthAnchor.constraint(greaterThanOrEqualToConstant: 120).isActive = true
        cFim.widthAnchor.constraint(equalTo: cIni.widthAnchor).isActive = true
        let pilha = UIStackView(arrangedSubviews: [topo, tela, aviso, barraTocar, barraCorte])
        pilha.axis = .vertical; pilha.spacing = 12
        pilha.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(pilha)
        let g = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            pilha.topAnchor.constraint(equalTo: g.topAnchor, constant: 12), pilha.bottomAnchor.constraint(equalTo: g.bottomAnchor, constant: -12),
            pilha.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 16), pilha.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -16),
            tela.heightAnchor.constraint(greaterThanOrEqualToConstant: 80),
        ])
        [topo, aviso, barraTocar, barraCorte].forEach { $0.setContentHuggingPriority(.required, for: .vertical); $0.setContentCompressionResistancePriority(.required, for: .vertical) }

        Task { @MainActor in
            dur = (try? await player.currentItem?.asset.load(.duration).seconds) ?? (item.fim - item.ini) / 1000
            if !(dur > 0) { dur = max(1, (item.fim - item.ini) / 1000) }
            for s in [posicao, cIni, cFim] { s.minimumValue = 0; s.maximumValue = Float(dur) }
            cIni.value = Float(item.cIni ?? 0); cFim.value = Float(item.cFim ?? dur)
            mostrarCorte()
            let em = min(max(inicio, Double(cIni.value)), dur)
            await player.seek(to: CMTime(seconds: em, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
            if inicio > 0 { player.play() }
            atualizar()
        }
        obsTempo = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.25, preferredTimescale: 600), queue: .main) { [weak self] _ in self?.atualizar() }
    }

    private func linha(_ v: [UIView]) -> UIStackView {
        let s = UIStackView(arrangedSubviews: v); s.spacing = 12; s.alignment = .center; return s
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        camada.frame = tela.bounds
        barraCorte.axis = view.bounds.width > view.bounds.height ? .horizontal : .vertical   // em pé: uma linha para cada coisa
    }

    private func atualizar() {
        let t = player.currentTime().seconds
        if !posicao.isTracking { posicao.value = Float(t) }
        hora.text = Videos.duracao(t * 1000) + " / " + Videos.duracao(dur * 1000)
        if player.rate > 0, t >= Double(cFim.value) - 0.05 { player.pause() }   // para no fim do corte
        let tocando = player.rate > 0
        Estilo.icone(tocar, tocando ? "pause.fill" : "play.fill", tocando ? "Pausar" : "Tocar", ligado: true, tam: 44)
    }
    private func mostrarCorte() {
        corteT.text = Videos.duracao(Double(cIni.value) * 1000) + " a " + Videos.duracao(Double(cFim.value) * 1000)
    }
    private func mostrarAviso(_ t: String?) {
        aviso.text = t; aviso.isHidden = t == nil
        if t != nil { DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in if self?.aviso.text == t { self?.aviso.isHidden = true } } }
    }

    @objc private func tocaPausa() {
        if player.rate > 0 { player.pause() } else {
            let t = player.currentTime().seconds
            if t < Double(cIni.value) || t >= Double(cFim.value) - 0.1 { player.seek(to: CMTime(seconds: Double(cIni.value), preferredTimescale: 600)) }
            player.play()
        }
        atualizar()
    }
    @objc private func moveu() { player.seek(to: CMTime(seconds: Double(posicao.value), preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero) }
    @objc private func abreCorte() { player.pause(); cortando.toggle() }
    @objc private func moveuCorte(_ s: UISlider) {
        if cIni.value > cFim.value - 1 { if s === cIni { cIni.value = max(0, cFim.value - 1) } else { cFim.value = min(Float(dur), cIni.value + 1) } }
        player.pause()
        player.seek(to: CMTime(seconds: Double(s.value), preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
        mostrarCorte()
    }
    @objc private func desisteCorte() {
        cIni.value = Float(item.cIni ?? 0); cFim.value = Float(item.cFim ?? dur); mostrarCorte(); cortando = false
    }
    @objc private func guardaCorte() {
        let i = Double(cIni.value), f = Double(cFim.value)
        item.cIni = i < 0.2 ? nil : i
        item.cFim = f > dur - 0.2 ? nil : f
        Videos.trocar(item); aoMudar?()
        Registro.anotar("vídeo: corte \(item.arquivo) \(Videos.duracao(i * 1000))–\(Videos.duracao(f * 1000))")
        cortando = false
        mostrarAviso("Corte guardado: \(Videos.duracao(i * 1000)) a \(Videos.duracao(f * 1000)). O vídeo inteiro continua guardado; ao compartilhar, vai só esse trecho.")
    }
    @objc private func manda() {
        player.pause()
        mandar.isEnabled = false; mostrarAviso("Preparando o vídeo…")
        Task { @MainActor in
            defer { mandar.isEnabled = true }
            do {
                let u = try await Videos.arquivoParaMandar(item)
                let folha = UIActivityViewController(activityItems: [u], applicationActivities: nil)
                folha.popoverPresentationController?.sourceView = mandar
                aviso.isHidden = true
                present(folha, animated: true)
                Registro.anotar("vídeo: compartilhar \(item.arquivo)")
            } catch {
                mostrarAviso("Não consegui preparar o vídeo (\(error.localizedDescription)).")
            }
        }
    }
    @objc private func renomeia() {
        let a = UIAlertController(title: "Nome do vídeo", message: nil, preferredStyle: .alert)
        a.addTextField { [item] t in t.text = Videos.titulo(item); t.clearButtonMode = .whileEditing; t.autocapitalizationType = .sentences }
        a.addAction(UIAlertAction(title: "Cancelar", style: .cancel))
        a.addAction(UIAlertAction(title: "Guardar", style: .default) { [weak self, weak a] _ in
            guard let self else { return }
            let n = (a?.textFields?.first?.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            self.item.nome = n.isEmpty ? nil : String(n.prefix(80))
            Videos.trocar(self.item); self.titulo.text = Videos.titulo(self.item); self.aoMudar?()
        })
        present(a, animated: true)
    }
    @objc private func apaga() {
        player.pause()
        let a = UIAlertController(title: "Apagar este vídeo?", message: "Não dá para desfazer.", preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Não", style: .cancel))
        a.addAction(UIAlertAction(title: "Apagar", style: .destructive) { [weak self] _ in
            guard let self else { return }
            Videos.apagar(self.item); Registro.anotar("vídeo: apagou \(self.item.arquivo)")
            self.aoMudar?(); self.fecha()
        })
        present(a, animated: true)
    }
    @objc private func fecha() {
        player.pause()
        if let o = obsTempo { player.removeTimeObserver(o); obsTempo = nil }
        dismiss(animated: true)
    }
}

/// Texto com margem por dentro (os avisos sobre a câmera).
final class Etiqueta: UILabel {
    var margem = UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 14)
    override func drawText(in r: CGRect) { super.drawText(in: r.inset(by: margem)) }
    override var intrinsicContentSize: CGSize {
        let s = super.intrinsicContentSize
        return CGSize(width: s.width + margem.left + margem.right, height: s.height + margem.top + margem.bottom)
    }
    override func textRect(forBounds b: CGRect, limitedToNumberOfLines n: Int) -> CGRect {
        let r = super.textRect(forBounds: b.inset(by: margem), limitedToNumberOfLines: n)
        return r.inset(by: UIEdgeInsets(top: -margem.top, left: -margem.left, bottom: -margem.bottom, right: -margem.right))
    }
}

/// Controle pequeno da câmera em cima da partitura, na faixa vazia da lateral (longe da ilha da câmera):
/// gravar/parar com a câmera já ajustada, o tempo gravado e abrir a câmera de novo. O X desliga a câmera.
final class PilulaCamera: UIView {
    private weak var camera: TelaCamera?
    var aoAbrir: (() -> Void)?
    private let rec = UIButton(type: .system), abrir = UIButton(type: .system), desligar = UIButton(type: .system)
    private let tempo = UILabel(), aviso = Etiqueta()
    private let fundo = UIVisualEffectView(effect: UIBlurEffect(style: .systemThinMaterialDark))
    private var relogio: Timer?
    private static let vermelho = UIColor(red: 0.95, green: 0.33, blue: 0.35, alpha: 1)

    init(camera: TelaCamera) {
        self.camera = camera
        super.init(frame: .zero)
        translatesAutoresizingMaskIntoConstraints = false
        fundo.layer.cornerRadius = 26; fundo.clipsToBounds = true
        fundo.translatesAutoresizingMaskIntoConstraints = false
        addSubview(fundo)
        tempo.font = .monospacedDigitSystemFont(ofSize: 12, weight: .bold); tempo.textColor = Self.vermelho; tempo.textAlignment = .center
        Estilo.icone(abrir, "camera.fill", "Abrir a câmera", tam: 44)
        Estilo.icone(desligar, "xmark", "Desligar a câmera", tam: 44)
        rec.addTarget(self, action: #selector(alterna), for: .touchUpInside)
        abrir.addTarget(self, action: #selector(abre), for: .touchUpInside)
        desligar.addTarget(self, action: #selector(desliga), for: .touchUpInside)
        let pilha = UIStackView(arrangedSubviews: [rec, tempo, abrir, desligar])
        pilha.axis = .vertical; pilha.spacing = 10; pilha.alignment = .center
        pilha.translatesAutoresizingMaskIntoConstraints = false
        addSubview(pilha)
        Estilo.rotulo(aviso, 14); aviso.numberOfLines = 0; aviso.textAlignment = .center
        aviso.backgroundColor = UIColor(white: 0.1, alpha: 0.88); aviso.layer.cornerRadius = 12; aviso.clipsToBounds = true; aviso.isHidden = true
        NSLayoutConstraint.activate([
            fundo.topAnchor.constraint(equalTo: topAnchor), fundo.bottomAnchor.constraint(equalTo: bottomAnchor),
            fundo.leadingAnchor.constraint(equalTo: leadingAnchor), fundo.trailingAnchor.constraint(equalTo: trailingAnchor),
            pilha.topAnchor.constraint(equalTo: topAnchor, constant: 4), pilha.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -4),
            pilha.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 4), pilha.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -4),
            tempo.widthAnchor.constraint(equalToConstant: 44),
        ])
        atualizar()
    }
    required init?(coder: NSCoder) { fatalError() }

    /// O aviso fica fora da pílula, ao lado dela; quem coloca a pílula na tela coloca o aviso também.
    var etiqueta: UILabel { aviso }

    func atualizar() {
        let g = camera?.gravando ?? false
        Estilo.icone(rec, g ? "stop.fill" : "record.circle.fill", g ? "Parar a gravação" : "Gravar", tam: 44, cor: Self.vermelho)
        desligar.isEnabled = !g; desligar.alpha = g ? 0.35 : 1
        tempo.isHidden = !g
        relogio?.invalidate()
        if g {
            let tique = { [weak self] in
                guard let self, let c = self.camera else { return }
                self.tempo.text = Videos.duracao(Date().timeIntervalSince1970 * 1000 - c.inicioGravacao)
            }
            tique(); relogio = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { _ in tique() }
        }
    }
    func avisar(_ t: String) {
        aviso.text = t; aviso.isHidden = false
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in if self?.aviso.text == t { self?.aviso.isHidden = true } }
    }
    @objc private func alterna() { camera?.alternarGravacao() }
    @objc private func abre() { aoAbrir?() }
    @objc private func desliga() { camera?.encerrar() }
    func parar() { relogio?.invalidate() }
}
