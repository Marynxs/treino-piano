// Cópia do app e dos dados do Mac guardada no iPhone, para treinar sem o Mac.
// Os arquivos vêm da lista /api/arquivos (só baixa o que mudou). Os dados vêm de /api/dados?de=mac.
import Foundation

enum Copia {
    static let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    static let site = docs.appendingPathComponent("site")
    static let backups = docs.appendingPathComponent("backups")
    static let dadosMac = docs.appendingPathComponent("dados-mac.json")
    private static let lista = site.appendingPathComponent(".lista.json")

    /// Tem uma cópia do app pronta para usar sem o Mac?
    static var temCopia: Bool {
        FileManager.default.fileExists(atPath: site.appendingPathComponent("treino-piano.html").path) &&
        FileManager.default.fileExists(atPath: site.appendingPathComponent("celular.html").path)
    }

    private struct Item: Codable { let p: String; let t: Double; let n: Int }

    static func pedir(_ url: URL, tempo: TimeInterval = 15) async throws -> Data {
        var r = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: tempo)
        r.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        let (d, resp) = try await URLSession.shared.data(for: r)
        guard (resp as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
        return d
    }

    /// Baixa do Mac os arquivos que mudaram. Devolve quantos baixou.
    @discardableResult
    static func atualizarArquivos(mac: String) async throws -> Int {
        guard let u = URL(string: mac + "/api/arquivos") else { return 0 }
        let novos = try JSONDecoder().decode([Item].self, from: try await pedir(u))
        let antigos = (try? JSONDecoder().decode([Item].self, from: Data(contentsOf: lista))) ?? []
        var tinha: [String: Item] = [:]
        antigos.forEach { tinha[$0.p] = $0 }
        try FileManager.default.createDirectory(at: site, withIntermediateDirectories: true)
        var baixados = 0
        for it in novos {
            let destino = it.p.split(separator: "/").reduce(site) { $0.appendingPathComponent(String($1)) }
            if let v = tinha[it.p], v.t == it.t, v.n == it.n, FileManager.default.fileExists(atPath: destino.path) { continue }
            let caminho = it.p.split(separator: "/").map { String($0).addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? String($0) }.joined(separator: "/")
            guard let url = URL(string: mac + "/" + caminho) else { continue }
            let d = try await pedir(url)
            try FileManager.default.createDirectory(at: destino.deletingLastPathComponent(), withIntermediateDirectories: true)
            try d.write(to: destino, options: .atomic)
            baixados += 1
        }
        try JSONEncoder().encode(novos).write(to: lista, options: .atomic)
        return baixados
    }

    /// Guarda a cópia mais nova dos dados do Mac (histórico, recordes, ajustes...).
    static func atualizarDados(mac: String) async throws {
        guard let u = URL(string: mac + "/api/dados?de=mac") else { return }
        let d = try await pedir(u)
        guard d.first == UInt8(ascii: "{") else { return }
        try d.write(to: dadosMac, options: .atomic)
    }

    /// Script que entrega a cópia do Mac à página do cérebro antes de ela ler os dados (window.__MAC_DUMP).
    static var scriptDadosMac: String {
        guard let d = try? Data(contentsOf: dadosMac), let s = String(data: d, encoding: .utf8) else { return "" }
        return "window.__MAC_DUMP=\(s);"
    }
}
