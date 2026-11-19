// Som do piano nos replays com o cabo no iPhone.
// Enquanto a tentativa dura, o Mac põe uma chave ("somk") no estado; a página manda {somPiano:{gravar:k, dif}} e,
// quando a chave some, {somPiano:{parar:k}}. Aqui gravamos a entrada USB do piano em m4a e mandamos o arquivo ao Mac
// (/api/somreplay) com a hora de início já no relógio do Mac (dif = Mac − iPhone, em ms). O Mac junta ao replay.
import AVFoundation
import Foundation

final class GravadorReplay {
    private var gravador: AVAudioRecorder?
    private var chave = ""
    private var p0Mac: Double = 0

    func gravar(chave k: String, dif: Double, mac: String, ocupado: Bool) {
        if gravador != nil { parar(chave: chave, mac: mac) }
        if ocupado { avisar(k, "camera ou microfone em uso", mac); return }
        let s = AVAudioSession.sharedInstance()
        do {
            try s.setCategory(.playAndRecord, mode: .default, options: [.mixWithOthers, .defaultToSpeaker, .allowBluetoothA2DP])
            try s.setActive(true)
        } catch { avisar(k, "sessao de som", mac); return }
        guard let usb = s.availableInputs?.first(where: { $0.portType == .usbAudio }) else {
            restaurar(); avisar(k, "o piano nao aparece como entrada de som no iPhone", mac); return
        }
        try? s.setPreferredInput(usb)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("replay-\(k).m4a")
        try? FileManager.default.removeItem(at: url)
        let canais = min(2, max(1, s.inputNumberOfChannels))
        let cfg: [String: Any] = [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 44100,
                                  AVNumberOfChannelsKey: canais, AVEncoderBitRateKey: 96000 * canais]
        guard let g = try? AVAudioRecorder(url: url, settings: cfg), g.prepareToRecord(), g.record() else {
            restaurar(); avisar(k, "nao consegui gravar", mac); return
        }
        gravador = g; chave = k
        // o som que entra agora saiu do piano um pouco antes (latência da entrada)
        p0Mac = Date().timeIntervalSince1970 * 1000 + dif - s.inputLatency * 1000
        Registro.anotar("som do replay: gravando pelo cabo (\(usb.portName), \(canais) canais)")
    }

    func parar(chave k: String, mac: String) {
        guard let g = gravador, k == chave else { return }
        let url = g.url, p0 = Int(p0Mac), dur = g.currentTime
        g.stop(); gravador = nil; chave = ""
        restaurar()
        guard let u = URL(string: "\(mac)/api/somreplay?k=\(k)&p0=\(p0)") else { return }
        var req = URLRequest(url: u); req.httpMethod = "POST"; req.timeoutInterval = 120
        URLSession.shared.uploadTask(with: req, fromFile: url) { _, resp, erro in
            let ok = (resp as? HTTPURLResponse)?.statusCode == 200
            Registro.anotar("som do replay: \(Int(dur)) s " + (ok ? "mandado ao Mac" : "não chegou ao Mac (\(erro?.localizedDescription ?? "erro"))"))
            try? FileManager.default.removeItem(at: url)
        }.resume()
    }

    private func restaurar() {
        try? AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
    }

    private func avisar(_ k: String, _ texto: String, _ mac: String) {
        Registro.anotar("som do replay: " + texto)
        guard let u = URL(string: "\(mac)/api/somreplay?k=\(k)&erro=" + texto.replacingOccurrences(of: " ", with: "+")) else { return }
        var req = URLRequest(url: u); req.httpMethod = "POST"
        URLSession.shared.dataTask(with: req).resume()
    }
}
