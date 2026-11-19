// Registro do app do iPhone: o que acontece vai para registro/AAAA-MM-DD.log no Mac.
// Sem o Mac, fica guardado aqui (registro-pendente.log) e vai junto quando ele voltar.
import Foundation

enum Registro {
    private static let arquivo = Copia.docs.appendingPathComponent("registro-pendente.log")
    private static let fila = DispatchQueue(label: "registro")
    /// Endereço do Mac quando ele está por perto: o registro vai na hora (sem ele, fica guardado)
    static var mac: String? { didSet { if mac != nil { entregar(mac: mac!) } } }
    private static var marcado = false

    /// Uma linha do próprio app (modo, Mac encontrado ou perdido, cabo, dados entregues...)
    static func anotar(_ t: String) {
        let f = DateFormatter(); f.dateFormat = "HH:mm:ss"
        guardar("\(f.string(from: Date())) \(t)", de: "app-nativo")
    }

    /// Linhas vindas das páginas (quando estão sem o Mac) ou do próprio app.
    static func guardar(_ texto: String, de: String) {
        let linhas = texto.split(whereSeparator: \.isNewline).map { "[\(de)] \($0)" }.joined(separator: "\n")
        guard !linhas.isEmpty else { return }
        fila.async {
            let d = Data((linhas + "\n").utf8)
            if let h = try? FileHandle(forWritingTo: arquivo) { h.seekToEndOfFile(); h.write(d); try? h.close() }
            else { try? d.write(to: arquivo) }
            if let m = mac, !marcado { marcado = true; fila.asyncAfter(deadline: .now() + 3) { marcado = false; entregar(mac: m) } }
            // não deixa crescer sem fim se o Mac sumir por muito tempo
            if let a = try? FileManager.default.attributesOfItem(atPath: arquivo.path), (a[.size] as? Int ?? 0) > 2_000_000,
               let tudo = try? Data(contentsOf: arquivo) { try? tudo.suffix(1_000_000).write(to: arquivo) }
        }
    }

    /// Entrega ao Mac o que ficou guardado.
    static func entregar(mac: String) {
        fila.async {
            guard let d = try? Data(contentsOf: arquivo), !d.isEmpty, let u = URL(string: mac + "/api/registro?de=app") else { return }
            var r = URLRequest(url: u, timeoutInterval: 15)
            r.httpMethod = "POST"
            r.httpBody = d
            URLSession.shared.dataTask(with: r) { _, resp, _ in
                if (resp as? HTTPURLResponse)?.statusCode == 200 {
                    fila.async { if let agora = try? Data(contentsOf: arquivo) { try? Data(agora.dropFirst(d.count)).write(to: arquivo) } }
                }
            }.resume()
        }
    }
}
