// Treino de Piano no iPhone.
// Com o Mac na rede: mostra a tela do celular servida pelo Mac e manda as notas do cabo para ele (o Mac corrige e guarda tudo).
// Sem o Mac: o próprio iPhone vira o cérebro. Roda a mesma página do Mac numa cópia guardada aqui (ServidorLocal), lê e toca o
// piano pelo cabo (PonteMIDI) e, quando reencontra o Mac, junta o que treinou com o que o Mac tem (treino-piano.js, djJuntar).
import SwiftUI
import WebKit
import CoreMIDI
import AVFoundation

@main
struct TreinoPianoApp: App {
    @UIApplicationDelegateAdaptor(Delegado.self) var delegado
    var body: some Scene {
        WindowGroup { TelaWeb().ignoresSafeArea() }
    }
}

struct TelaWeb: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> ControladorWeb { ControladorWeb() }
    func updateUIViewController(_ vc: ControladorWeb, context: Context) {}
}

/// Endereço do Mac: o nome .local (não muda quando o roteador reinicia). Pode ser trocado na tela de erro.
enum Endereco {
    static let chave = "enderecoMac"
    static var atual: String {
        get { UserDefaults.standard.string(forKey: chave) ?? EnderecoPadrao.mac }
        set { UserDefaults.standard.set(newValue, forKey: chave) }
    }
    static var base: String { atual.trimmingCharacters(in: .whitespaces) }
    static var local: String { "http://127.0.0.1:\(ServidorLocal.porta)" }
}

/// Treinou sem o Mac desde a última vez que entregou os dados a ele.
enum Pendente {
    static var tem: Bool {
        get { UserDefaults.standard.bool(forKey: "treinouSozinho") }
        set { UserDefaults.standard.set(newValue, forKey: "treinouSozinho") }
    }
}

final class ControladorWeb: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {
    enum Modo { case procurando, mac, sozinho }
    private var modo = Modo.procurando
    private var web: WKWebView!            // a tela que você vê
    private var cerebro: WKWebView?        // a página do Mac rodando aqui (só sem o Mac, ou para entregar os dados)
    private let midi = LeitorMIDI()
    private let ouvido = Ouvido()
    private let gravadorReplay = GravadorReplay()
    private lazy var servidor = ServidorLocal(raiz: Copia.site, backups: Copia.backups)
    private var vigia: Timer?
    private var falhas = 0
    private var entregando = false
    private var ultimoCabo = ""

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.075, green: 0.086, blue: 0.106, alpha: 1)
        try? AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        web = novaWeb(cerebro: false)
        web.frame = view.bounds
        view.addSubview(web)
        UIApplication.shared.isIdleTimerDisabled = true   // a tela não apaga durante o treino

        midi.aoReceber = { [weak self] lista in self?.notas(lista) }
        midi.aoMudar = { [weak self] in self?.portasMudaram() }
        midi.comecar()
        ouvido.aoTocar = { [weak self] l in self?.notasSom(l) }
        if somLigado { ligarSom(true) }
        NotificationCenter.default.addObserver(self, selector: #selector(voltou), name: UIApplication.willEnterForegroundNotification, object: nil)
        procurar()
        // para conferir as telas no simulador: -abrirCamera, -abrirVideo
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-abrirCamera") { DispatchQueue.main.asyncAfter(deadline: .now() + 2) { self.abrirCamera() } }
        if args.contains("-pilula") { DispatchQueue.main.asyncAfter(deadline: .now() + 5) { self.camera?.irParaPartitura() } }
        if args.contains("-abrirVideo"), let i = Videos.lista().first { DispatchQueue.main.asyncAfter(deadline: .now() + 2) { Videos.ver(i, em: 0, de: self) } }
    }

    private func novaWeb(cerebro: Bool) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.websiteDataStore = .default()
        if cerebro {
            cfg.userContentController.add(self, name: "midiOut")
            cfg.userContentController.addUserScript(WKUserScript(source: PonteMIDI.script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
            let dados = Copia.scriptDadosMac
            if !dados.isEmpty { cfg.userContentController.addUserScript(WKUserScript(source: dados, injectionTime: .atDocumentStart, forMainFrameOnly: true)) }
        } else {
            cfg.userContentController.add(self, name: "endereco")
            cfg.userContentController.add(self, name: "acao")
        }
        let w = WKWebView(frame: view.bounds, configuration: cfg)
        w.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        w.navigationDelegate = self
        w.scrollView.contentInsetAdjustmentBehavior = .never
        w.isOpaque = false
        w.backgroundColor = view.backgroundColor
        return w
    }

    // MARK: Mac ou sozinho

    /// Voltou para a tela: sem o Mac, confere se o Mac voltou; senão religa o servidor daqui (o iOS desliga no fundo) e recarrega
    @objc private func voltou() {
        guard modo != .mac else { return }
        Task { @MainActor in
            if await macResponde() { entrarMac(); return }
            if modo == .sozinho, servidor.rodando, await localResponde() { return }
            Registro.anotar("voltou para a tela: religando o modo sozinho")
            entrarSozinho()
        }
    }

    private func localResponde() async -> Bool {
        guard let u = URL(string: Endereco.local + "/api/time") else { return false }
        return (try? await Copia.pedir(u, tempo: 1.5)) != nil
    }

    private func macResponde(_ tempo: TimeInterval = 3) async -> Bool {
        guard let u = URL(string: Endereco.base + "/api/info") else { return false }
        // o servidor responder não basta: a aba do Treino de Piano no Mac precisa estar aberta (manda uma tela pelo menos a cada 10 s)
        guard let d = try? await Copia.pedir(u, tempo: tempo) else { return false }
        if let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any], let idade = (o["idade"] as? NSNumber)?.doubleValue { return idade < 25 }
        return true
    }

    private func procurar() {
        modo = .procurando
        aviso("Procurando o Mac…", "Se ele não responder em alguns segundos, o iPhone treina sozinho.")
        Task { @MainActor in
            if await macResponde(4) { entrarMac() } else { entrarSozinho() }
        }
    }

    private func entrarMac() {
        modo = .mac
        Registro.mac = Endereco.base
        Registro.anotar("modo Mac: \(Endereco.atual)")
        falhas = 0
        pararCerebro()
        if let u = URL(string: Endereco.base + "/celular.html?app=1") { web.load(URLRequest(url: u, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 8)) }
        Task { @MainActor in
            if let n = try? await Copia.atualizarArquivos(mac: Endereco.base), n > 0 { Registro.anotar("copiou \(n) arquivo(s) do Mac") }
            try? await Copia.atualizarDados(mac: Endereco.base)
            if Pendente.tem { entregarAoMac() }
        }
        vigiar()
    }

    private func entrarSozinho() {
        guard Copia.temCopia else {
            erro("Não encontrei o Mac em \(Endereco.atual).", "Para treinar sem o Mac, abra o app uma vez em casa com o Mac ligado: ele guarda uma cópia aqui.")
            return
        }
        servidor.parar()   // sempre um servidor novo: o de antes pode ter sido desligado pelo iOS
        do { try servidor.iniciar() } catch { erro("Não consegui ligar o modo sem o Mac.", error.localizedDescription); return }
        modo = .sozinho
        Pendente.tem = true
        Registro.mac = nil
        Registro.anotar("modo sozinho: o Mac não respondeu")
        abrirCerebro(enviar: false)
        if let u = URL(string: Endereco.local + "/celular.html?app=1") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
                guard let self, self.modo == .sozinho else { return }
                self.web.load(URLRequest(url: u, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 8))
            }
        }
        vigiar()
    }

    /// A página do Mac rodando no iPhone, atrás da tela que você vê.
    private func abrirCerebro(enviar: Bool) {
        pararCerebro()
        let c = novaWeb(cerebro: true)
        c.frame = view.bounds
        view.insertSubview(c, belowSubview: web)
        cerebro = c
        if let u = URL(string: Endereco.local + "/treino-piano.html?cerebro=1" + (enviar ? "&enviar=1" : "")) { c.load(URLRequest(url: u)) }
    }

    private func pararCerebro() {
        cerebro?.configuration.userContentController.removeScriptMessageHandler(forName: "midiOut")
        cerebro?.removeFromSuperview()
        cerebro = nil
        if modo != .sozinho && !entregando { servidor.parar() }
    }

    /// Com o Mac: confere se ele continua aí. Sem o Mac: confere se ele voltou (e só troca com o exercício parado).
    private func vigiar() {
        vigia?.invalidate()
        vigia = Timer.scheduledTimer(withTimeInterval: modo == .mac ? 10 : 15, repeats: true) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor in
                let ok = await self.macResponde()
                switch self.modo {
                case .mac:
                    if ok { self.falhas = 0; try? await Copia.atualizarDados(mac: Endereco.base) }
                    else { self.falhas += 1; Registro.anotar("Mac não respondeu (\(self.falhas)ª vez)"); if self.falhas >= 2, Copia.temCopia { self.entrarSozinho() } }
                case .sozinho:
                    if ok && !self.servidor.tocando { self.entrarMac() }
                default: break
                }
            }
        }
    }

    /// Entrega ao Mac o que foi treinado sem ele: o cérebro junta com a cópia mais nova do Mac e o resultado vai para o Mac.
    private func entregarAoMac() {
        guard !entregando else { return }
        entregando = true
        do { try servidor.iniciar() } catch { entregando = false; return }
        abrirCerebro(enviar: true)
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in
            guard let self, let c = self.cerebro else { self?.entregando = false; return }
            c.evaluateJavaScript("JSON.stringify(window.__RESULTADO||null)") { valor, _ in
                guard let s = valor as? String, s != "null", let d = s.data(using: .utf8),
                      let obj = try? JSONSerialization.jsonObject(with: d) as? [String: Any],
                      let dados = obj["dados"], let corpo = try? JSONSerialization.data(withJSONObject: dados),
                      let u = URL(string: Endereco.base + "/api/dados?de=iphone&usou=\(obj["usou"] as? String ?? "")") else {
                    self.fimEntrega(false); return
                }
                var r = URLRequest(url: u, timeoutInterval: 20)
                r.httpMethod = "POST"
                r.httpBody = corpo
                URLSession.shared.dataTask(with: r) { _, resp, _ in
                    let ok = (resp as? HTTPURLResponse)?.statusCode == 200
                    DispatchQueue.main.async {
                        if ok { c.evaluateJavaScript("cerebroEnviado()") { _, _ in self.fimEntrega(true) } } else { self.fimEntrega(false) }
                    }
                }.resume()
            }
        }
    }
    private func fimEntrega(_ ok: Bool) {
        Registro.anotar(ok ? "entregou ao Mac o que treinou sozinho" : "não conseguiu entregar os dados ao Mac (tenta de novo depois)")
        if ok { Pendente.tem = false }
        entregando = false
        if modo == .mac { pararCerebro() }
    }

    // MARK: piano

    private func notas(_ lista: [[Double]]) {
        guard let dados = try? JSONSerialization.data(withJSONObject: lista), let json = String(data: dados, encoding: .utf8) else { return }
        if modo == .sozinho, let c = cerebro { c.evaluateJavaScript("window.__midiIn&&window.__midiIn(\(json))", completionHandler: nil) }
        else { web.evaluateJavaScript("window.nativeMidi&&window.nativeMidi(\(json))", completionHandler: nil) }
    }

    private func portasMudaram() {
        let t = midi.entradas.first.map { "Piano no iPhone: \($0.nome)" } ?? "Piano no iPhone: sem cabo"
        if t != ultimoCabo { ultimoCabo = t; Registro.anotar(t) }
        web.evaluateJavaScript("window.nativeMidiStatus&&window.nativeMidiStatus(\(String(reflecting: t)))", completionHandler: nil)
        mandarPortas()
    }
    private func mandarPortas() {
        guard let c = cerebro else { return }
        let l: [String: Any] = ["ins": midi.entradas.map { ["nome": $0.nome, "fab": $0.fab] }, "outs": midi.saidas.map { ["nome": $0.nome, "fab": $0.fab] }]
        guard let d = try? JSONSerialization.data(withJSONObject: l), let s = String(data: d, encoding: .utf8) else { return }
        c.evaluateJavaScript("window.__midiPortas&&window.__midiPortas(\(s))", completionHandler: nil)
    }

    // MARK: notas pelo som

    private var somLigado: Bool {
        get { UserDefaults.standard.bool(forKey: "notasPeloSom") }
        set { UserDefaults.standard.set(newValue, forKey: "notasPeloSom") }
    }

    private func pedirMicrofone(_ ok: @escaping (Bool) -> Void) {
        AVAudioApplication.requestRecordPermission { r in DispatchQueue.main.async { ok(r) } }
    }

    private func ligarSom(_ on: Bool) {
        if !on { ouvido.desligar(); somLigado = false; Registro.anotar("notas pelo som: desligado"); estadoSom(); return }
        pedirMicrofone { [weak self] ok in
            guard let self else { return }
            guard ok else { self.somLigado = false; self.estadoSom(); self.aviso("Sem acesso ao microfone", "Para ouvir o piano, permita o microfone em Ajustes do iPhone → Treino de Piano."); return }
            do { try self.ouvido.ligar(); self.somLigado = true; Registro.anotar("notas pelo som: ligado (\(self.ouvido.calibradas) teclas calibradas)") }
            catch { self.somLigado = false; Registro.anotar("notas pelo som: não ligou (\(error.localizedDescription))") }
            self.estadoSom()
        }
    }

    private func estadoSom() {
        let js = "window.nativeSomEstado&&window.nativeSomEstado({ligado:\(ouvido.ligado),calibrado:\(ouvido.calibradas)})"
        web.evaluateJavaScript(js, completionHandler: nil)
        cerebro?.evaluateJavaScript("window.__fonteSom=\(ouvido.ligado)", completionHandler: nil)
    }

    private func calibrar() {
        pedirMicrofone { [weak self] ok in
            guard let self, ok else { return }
            let estava = self.ouvido.ligado
            try? self.ouvido.ligar()
            let t = TelaCalibracao(ouvido: self.ouvido)
            t.aoFechar = { [weak self] in guard let self else { return }; if !estava && !self.somLigado { self.ouvido.desligar() }; self.estadoSom() }
            self.present(t, animated: true)
        }
    }

    private var camera: TelaCamera?
    private var pilula: PilulaCamera?

    /// Gravar vídeo. As notas do cabo continuam indo ao Mac enquanto a câmera está aberta.
    /// Com a câmera ligada, dá para voltar à partitura: a gravação continua e um controle pequeno na lateral grava e para.
    private func abrirCamera() {
        guard presentedViewController == nil else { return }
        if let c = camera { tirarPilula(); present(c, animated: true); return }
        let estava = ouvido.ligado
        if estava { ouvido.desligar() }   // o microfone fica para o vídeo
        let t = TelaCamera(mac: modo == .mac ? Endereco.base : nil)
        t.aoFechar = { [weak self] in
            guard let self else { return }
            self.camera = nil; self.tirarPilula()
            if estava { self.ligarSom(true) } else { try? AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers]) }
            self.web.evaluateJavaScript("window.rcVideosMudaram&&window.rcVideosMudaram()", completionHandler: nil)
        }
        t.aoMinimizar = { [weak self] in self?.porPilula() }
        t.aoEstado = { [weak self] in self?.pilula?.atualizar() }
        t.aoAvisoFora = { [weak self] s in self?.pilula?.avisar(s) }
        camera = t
        present(t, animated: true)
    }

    private func porPilula() {
        guard let c = camera else { return }
        tirarPilula()
        let p = PilulaCamera(camera: c)
        p.aoAbrir = { [weak self] in self?.abrirCamera() }
        view.addSubview(p); view.addSubview(p.etiqueta)
        pilula = p
        posicionarPilula()
    }
    private func tirarPilula() { pilula?.parar(); pilula?.etiqueta.removeFromSuperview(); pilula?.removeFromSuperview(); pilula = nil }
    private var pilulaC: [NSLayoutConstraint] = []
    /// Na faixa vazia da lateral, do lado oposto à ilha da câmera.
    private func posicionarPilula() {
        guard let p = pilula else { return }
        NSLayoutConstraint.deactivate(pilulaC)
        let ilhaEsquerda = view.window?.windowScene?.interfaceOrientation != .landscapeLeft
        let e = p.etiqueta
        pilulaC = [p.centerYAnchor.constraint(equalTo: view.centerYAnchor), p.widthAnchor.constraint(equalToConstant: 52),
                   e.centerYAnchor.constraint(equalTo: view.centerYAnchor), e.widthAnchor.constraint(lessThanOrEqualToConstant: 320)]
        if ilhaEsquerda {
            pilulaC += [p.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -4), e.trailingAnchor.constraint(equalTo: p.leadingAnchor, constant: -12)]
        } else {
            pilulaC += [p.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 4), e.leadingAnchor.constraint(equalTo: p.trailingAnchor, constant: 12)]
        }
        NSLayoutConstraint.activate(pilulaC)
    }
    override func viewWillTransition(to size: CGSize, with c: UIViewControllerTransitionCoordinator) {
        super.viewWillTransition(to: size, with: c)
        c.animate(alongsideTransition: nil) { [weak self] _ in self?.posicionarPilula() }
    }

    private func notasSom(_ lista: [[Double]]) {
        guard let dados = try? JSONSerialization.data(withJSONObject: lista), let json = String(data: dados, encoding: .utf8) else { return }
        if modo == .sozinho, let c = cerebro { c.evaluateJavaScript("window.__fonteSom=true;window.__midiIn&&window.__midiIn(\(json))", completionHandler: nil) }
        else { web.evaluateJavaScript("window.nativeMidi&&window.nativeMidi(\(json),true)", completionHandler: nil) }
    }

    // MARK: páginas

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if webView === cerebro { mandarPortas(); estadoSom() } else { portasMudaram(); estadoSom() }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        guard webView === web, modo == .mac else { return }
        if Copia.temCopia { entrarSozinho() } else { erro("Não encontrei o Mac em \(Endereco.atual).", nil) }
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }

    private func esc(_ s: String) -> String {
        s.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: "\"", with: "&quot;")
    }
    private let estilo = """
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;font:17px -apple-system,sans-serif;background:#13161B;color:#ECEFF3;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
    div{max-width:560px;display:flex;flex-direction:column;gap:16px}b{font-size:22px}input{font:inherit;padding:12px;border-radius:12px;border:1px solid #313741;background:#1C2026;color:inherit}
    .r{display:flex;gap:12px;flex-wrap:wrap}button{font:inherit;font-weight:600;min-height:48px;padding:10px 20px;border:0;border-radius:12px;background:#262B33;color:inherit}button.p{background:#378ADD;color:#fff}span{color:#A9B0BB}</style>
    """
    private func aviso(_ t: String, _ s: String) {
        web.loadHTMLString("<!doctype html>\(estilo)<div><b>\(esc(t))</b><span>\(esc(s))</span></div>", baseURL: nil)
    }
    /// Tela de erro própria: diz o que fazer e deixa trocar o endereço do Mac.
    private func erro(_ t: String, _ s: String?) {
        Registro.anotar("tela de erro: \(t)")
        let dica = s ?? "Confira se o Mac está ligado, com o Treino de Piano aberto no Chrome, e se o iPhone está no mesmo Wi-Fi."
        web.loadHTMLString("""
        <!doctype html>\(estilo)<div><b>\(esc(t))</b><span>\(esc(dica))</span>
        <label>Endereço do Mac<br><input id="e" value="\(esc(Endereco.atual))" autocapitalize="off" autocorrect="off"></label>
        <div class="r"><button class="p" onclick="webkit.messageHandlers.endereco.postMessage(document.getElementById('e').value)">Tentar de novo</button></div></div>
        """, baseURL: nil)
    }

    func userContentController(_ uc: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "midiOut":
            guard let o = message.body as? [String: Any] else { return }
            if o["portas"] != nil { mandarPortas(); return }
            if let d = o["d"] as? [Int] { midi.enviar(d.map { UInt8(truncatingIfNeeded: $0) }, atrasoMs: (o["a"] as? Double) ?? 0) }
        case "acao":
            guard let o = message.body as? [String: Any] else { return }
            if let s = o["som"] as? Bool { ligarSom(s) }
            if o["calibrar"] != nil { calibrar() }
            if o["estado"] != nil { estadoSom() }
            if o.keys.contains("esp") { ouvido.esperar(o["esp"]) }
            if let c = o["compartilhar"] as? [String: Any], let s = c["url"] as? String, let u = URL(string: s) {
                Compartilhar.audio(url: u, nome: (c["nome"] as? String) ?? "Replay", de: self)
            }
            if o["camera"] != nil { abrirCamera() }
            if let sp = o["somPiano"] as? [String: Any], modo == .mac {   // som do piano no replay (cabo no iPhone)
                if let k = sp["parar"] as? String { gravadorReplay.parar(chave: k, mac: Endereco.base) }
                if let k = sp["gravar"] as? String {
                    gravadorReplay.gravar(chave: k, dif: (sp["dif"] as? NSNumber)?.doubleValue ?? 0, mac: Endereco.base, ocupado: camera != nil || ouvido.ligado)
                }
            }
            if let v = o["videoDe"] as? [String: Any], let id = v["id"] as? NSNumber, let ini = v["ini"] as? Double, let fim = v["fim"] as? Double {
                let tem = Videos.de(ini: ini, fim: fim) != nil
                web.evaluateJavaScript("window.rcVideo&&window.rcVideo(\(id.int64Value),\(tem))", completionHandler: nil)
            }
            if let v = o["verVideo"] as? [String: Any], let ini = v["ini"] as? Double, let fim = v["fim"] as? Double, let i = Videos.de(ini: ini, fim: fim) {
                Videos.ver(i, em: (ini - i.ini) / 1000, de: self)
            }
            if let l = o["midiOut"] as? [[Any]] {   // guia, metrônomo e gravação vindos do Mac, para o piano no cabo
                for x in l where x.count == 2 {
                    guard let d = x[0] as? [NSNumber] else { continue }
                    midi.enviar(d.map { UInt8(truncatingIfNeeded: $0.intValue) }, atrasoMs: (x[1] as? NSNumber)?.doubleValue ?? 0)
                }
            }
        case "endereco":
            if let s = message.body as? String {
                var e = s.trimmingCharacters(in: .whitespacesAndNewlines)
                if !e.isEmpty {
                    if !e.hasPrefix("http") { e = "http://" + e }
                    while e.hasSuffix("/") { e.removeLast() }
                    Endereco.atual = e
                }
            }
            procurar()
        default: break
        }
    }
}

/// O piano pelo cabo USB-C: lê teclas e pedal com a hora em que chegaram, e manda o guia e o metrônomo de volta para ele.
final class LeitorMIDI {
    struct Porta { let ref: MIDIEndpointRef; let nome: String; let fab: String }
    var aoReceber: (([[Double]]) -> Void)?
    var aoMudar: (() -> Void)?
    private(set) var entradas: [Porta] = []
    private(set) var saidas: [Porta] = []
    private var cliente = MIDIClientRef()
    private var porta = MIDIPortRef()
    private var portaSaida = MIDIPortRef()
    private var base = mach_timebase_info_data_t()

    func comecar() {
        mach_timebase_info(&base)
        MIDIClientCreateWithBlock("Treino de Piano" as CFString, &cliente) { [weak self] _ in
            DispatchQueue.main.async { self?.ligar() }   // cabo ligado ou tirado
        }
        MIDIInputPortCreateWithProtocol(cliente, "Entrada" as CFString, ._1_0, &porta) { [weak self] lista, _ in self?.ler(lista) }
        MIDIOutputPortCreate(cliente, "Saida" as CFString, &portaSaida)
        ligar()
    }

    private func texto(_ o: MIDIObjectRef, _ p: CFString) -> String {
        var s: Unmanaged<CFString>?
        return MIDIObjectGetStringProperty(o, p, &s) == noErr ? (s?.takeRetainedValue() as String? ?? "") : ""
    }

    private func ligar() {
        entradas = (0..<MIDIGetNumberOfSources()).map { i in
            let e = MIDIGetSource(i)
            MIDIPortConnectSource(porta, e, nil)
            return Porta(ref: e, nome: texto(e, kMIDIPropertyDisplayName), fab: texto(e, kMIDIPropertyManufacturer))
        }
        saidas = (0..<MIDIGetNumberOfDestinations()).map { i in
            let d = MIDIGetDestination(i)
            return Porta(ref: d, nome: texto(d, kMIDIPropertyDisplayName), fab: texto(d, kMIDIPropertyManufacturer))
        }
        aoMudar?()
    }

    /// Manda uma mensagem ao piano, no instante pedido (atraso em ms a partir de agora).
    func enviar(_ d: [UInt8], atrasoMs: Double) {
        guard let destino = saidas.first?.ref, let st = d.first, st >= 0x80, st < 0xF0 else { return }
        if st & 0xF0 == 0xB0, d.count > 1, d[1] == 123 { MIDIFlushOutput(destino) }   // "Parar": tira da fila o que ainda ia tocar
        let w: UInt32 = 0x2000_0000 | UInt32(st) << 16 | UInt32(d.count > 1 ? d[1] & 0x7F : 0) << 8 | UInt32(d.count > 2 ? d[2] & 0x7F : 0)
        let ticks = UInt64(max(0, atrasoMs) * 1_000_000 * Double(base.denom) / Double(base.numer))
        var lista = MIDIEventList()
        let pacote = MIDIEventListInit(&lista, ._1_0)
        var palavra = w
        _ = MIDIEventListAdd(&lista, MemoryLayout<MIDIEventList>.size, pacote, mach_absolute_time() + ticks, 1, &palavra)
        MIDISendEventList(portaSaida, destino, &lista)
    }

    /// Hora da mensagem (relógio do sistema) → milissegundos desde 1970.
    private func msEpoch(_ ts: MIDITimeStamp) -> Double {
        let agora = Date().timeIntervalSince1970 * 1000
        guard ts != 0 else { return agora }
        let msAtras = (Double(mach_absolute_time()) - Double(ts)) * Double(base.numer) / Double(base.denom) / 1_000_000
        return agora - max(0, msAtras)
    }

    private func ler(_ ponteiro: UnsafePointer<MIDIEventList>) {
        var saida: [[Double]] = []
        for pacote in ponteiro.unsafeSequence() {
            let t = msEpoch(pacote.pointee.timeStamp)
            let n = Int(pacote.pointee.wordCount)
            withUnsafePointer(to: pacote.pointee.words) { tupla in
                tupla.withMemoryRebound(to: UInt32.self, capacity: 64) { w in
                    for k in 0..<min(n, 64) {
                        let p = w[k]
                        guard (p >> 28) == 0x2 else { continue }        // MIDI 1.0: nota, pedal, controle
                        let tipo = (p >> 20) & 0xF
                        guard tipo == 0x8 || tipo == 0x9 || tipo == 0xB else { continue }
                        saida.append([Double((p >> 16) & 0xFF), Double((p >> 8) & 0x7F), Double(p & 0x7F), t])
                    }
                }
            }
        }
        if !saida.isEmpty { DispatchQueue.main.async { [weak self] in self?.aoReceber?(saida) } }
    }
}
