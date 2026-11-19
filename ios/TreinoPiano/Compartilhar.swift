// Compartilhar um replay: baixa o áudio que o Mac fez (WAV), converte para m4a (o WhatsApp manda como áudio)
// e abre a folha de compartilhar do iOS (WhatsApp, AirDrop, Mensagens, Arquivos...).
import UIKit
import AVFoundation

enum Compartilhar {
    static func audio(url: URL, nome: String, de vc: UIViewController) {
        Task { @MainActor in
            do {
                let (d, resp) = try await URLSession.shared.data(from: url)
                guard (resp as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
                let pasta = FileManager.default.temporaryDirectory.appendingPathComponent("compartilhar", isDirectory: true)
                try? FileManager.default.removeItem(at: pasta)
                try FileManager.default.createDirectory(at: pasta, withIntermediateDirectories: true)
                let limpo = nome.replacingOccurrences(of: "/", with: "-")
                let wav = pasta.appendingPathComponent(limpo + ".wav")
                try d.write(to: wav)
                let arquivo = (try? await m4a(wav, pasta.appendingPathComponent(limpo + ".m4a"))) ?? wav
                let folha = UIActivityViewController(activityItems: [arquivo], applicationActivities: nil)
                folha.popoverPresentationController?.sourceView = vc.view
                folha.popoverPresentationController?.sourceRect = CGRect(x: vc.view.bounds.midX, y: vc.view.bounds.midY, width: 1, height: 1)
                vc.present(folha, animated: true)
                Registro.anotar("compartilhar replay: \(nome) (\(arquivo.pathExtension))")
            } catch {
                Registro.anotar("compartilhar replay falhou: \(error.localizedDescription)")
            }
        }
    }

    private static func m4a(_ de: URL, _ para: URL) async throws -> URL {
        let ativo = AVURLAsset(url: de)
        guard let exp = AVAssetExportSession(asset: ativo, presetName: AVAssetExportPresetAppleM4A) else { throw URLError(.cannotCreateFile) }
        try await exp.export(to: para, as: .m4a)
        return para
    }
}
