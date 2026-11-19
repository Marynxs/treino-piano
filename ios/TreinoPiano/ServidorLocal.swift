// O "Mac de mentira" dentro do iPhone: as mesmas rotas do ferramentas/servidor.pl, só no próprio iPhone (127.0.0.1).
// Assim a página do Mac (o cérebro) e a do celular conversam como em casa, sem o Mac.
import Foundation
import Network

final class ServidorLocal {
    static let porta: UInt16 = 8765
    let raiz: URL            // cópia do app (Documents/site)
    let pastaBackups: URL    // Documents/backups
    private var ouvinte: NWListener?
    private let fila = DispatchQueue(label: "servidor-local")
    private var estado = Data(), estadoV = "", dono = ""
    private var cmds: [(Int, String)] = []
    private var ultimoCmd = 0
    private var sse: [ObjectIdentifier: NWConnection] = [:]
    private var esperas: [UUID: () -> Bool] = [:]
    private var ping: DispatchSourceTimer?

    init(raiz: URL, backups: URL) { self.raiz = raiz; self.pastaBackups = backups }

    var rodando: Bool { ouvinte != nil }
    /// Exercício tocando agora (para não trocar para o Mac no meio)
    var tocando: Bool { fila.sync { String(decoding: estado.prefix(400_000), as: UTF8.self).contains("\"run\":true") } }

    func iniciar() throws {
        if ouvinte != nil { return }
        let p = NWParameters.tcp
        p.allowLocalEndpointReuse = true
        p.requiredInterfaceType = .loopback
        p.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: Self.porta)!)
        let o = try NWListener(using: p)
        // o iOS desliga o servidor quando o app vai para o fundo: marca como parado para religar na volta
        o.stateUpdateHandler = { [weak self, weak o] s in
            switch s { case .failed, .cancelled: if let self, self.ouvinte === o { self.ouvinte = nil }; default: break }
        }
        o.newConnectionHandler = { [weak self] c in
            guard let self else { return }
            c.start(queue: self.fila)
            self.receber(c, Data())
        }
        o.start(queue: fila)
        ouvinte = o
        let t = DispatchSource.makeTimerSource(queue: fila)
        t.schedule(deadline: .now() + 0.1, repeating: 0.1)
        t.setEventHandler { [weak self] in self?.pingar() }
        t.resume()
        ping = t
    }

    func parar() {
        fila.sync {
            ping?.cancel(); ping = nil
            sse.values.forEach { $0.cancel() }; sse.removeAll()
            esperas.removeAll()
            ouvinte?.cancel(); ouvinte = nil
        }
    }

    // MARK: pedido HTTP

    private func receber(_ c: NWConnection, _ acc: Data) {
        c.receive(minimumIncompleteLength: 1, maximumLength: 1 << 20) { [weak self] dado, _, fim, erro in
            guard let self else { c.cancel(); return }
            var buf = acc
            if let dado { buf.append(dado) }
            if let r = buf.range(of: Data("\r\n\r\n".utf8)) {
                let cab = String(decoding: buf[buf.startIndex..<r.lowerBound], as: UTF8.self)
                var tam = 0
                for l in cab.components(separatedBy: "\r\n") where l.lowercased().hasPrefix("content-length:") {
                    tam = Int(l.split(separator: ":", maxSplits: 1)[1].trimmingCharacters(in: .whitespaces)) ?? 0
                }
                if buf.endIndex - r.upperBound >= tam {
                    let corpo = Data(buf[r.upperBound..<(r.upperBound + tam)])
                    self.tratar(c, cab, corpo)
                    return
                }
            }
            if fim || erro != nil || buf.count > 60_000_000 { c.cancel(); return }
            self.receber(c, buf)
        }
    }

    private func tratar(_ c: NWConnection, _ cab: String, _ corpo: Data) {
        let linha = cab.components(separatedBy: "\r\n").first ?? ""
        let partes = linha.split(separator: " ")
        guard partes.count >= 2 else { responder(c, "400 Bad Request", "text/plain", Data()); return }
        let metodo = String(partes[0])
        var alvo = String(partes[1])
        if let h = alvo.firstIndex(of: "#") { alvo = String(alvo[..<h]) }
        var q: [String: String] = [:]
        var caminho = alvo
        if let i = alvo.firstIndex(of: "?") {
            caminho = String(alvo[..<i])
            for par in alvo[alvo.index(after: i)...].split(separator: "&") {
                let kv = par.split(separator: "=", maxSplits: 1).map(String.init)
                q[kv[0]] = kv.count > 1 ? (kv[1].removingPercentEncoding ?? kv[1]) : ""
            }
        }
        caminho = caminho.removingPercentEncoding ?? caminho
        let json = "application/json"
        switch caminho {
        case "/api/estado": estadoRota(c, metodo, q, corpo)
        case "/api/stream": abrirSSE(c)
        case "/api/cmd": cmdRota(c, metodo, q, corpo)
        case "/api/time": responder(c, "200 OK", json, Data("{\"t\":\(Int(Date().timeIntervalSince1970 * 1000))}".utf8))
        case "/api/log": responder(c, "200 OK", json, Data("{\"ok\":true}".utf8))
        case "/api/info": responder(c, "200 OK", json, Data("{\"ip\":\"127.0.0.1\",\"host\":\"\",\"port\":\(Self.porta),\"sozinho\":true}".utf8))
        case "/api/backup": backupRota(c, metodo, q, corpo)
        case "/api/backups": listaBackups(c)
        case "/api/registro":
            if metodo == "POST" { Registro.guardar(String(decoding: corpo, as: UTF8.self), de: q["de"] ?? "?") }
            responder(c, "200 OK", json, Data("{\"ok\":true}".utf8))
        default:
            if caminho.hasPrefix("/api/") { responder(c, "404 Not Found", "text/plain; charset=utf-8", Data("Só no Mac.".utf8)); return }
            arquivo(c, caminho == "/" ? "/treino-piano.html" : caminho)
        }
    }

    private func responder(_ c: NWConnection, _ status: String, _ tipo: String, _ corpo: Data, _ extra: String = "") {
        let cab = "HTTP/1.0 \(status)\r\nContent-Type: \(tipo)\r\nContent-Length: \(corpo.count)\r\nCache-Control: no-cache\r\n\(extra)Connection: close\r\n\r\n"
        c.send(content: Data(cab.utf8) + corpo, completion: .contentProcessed { _ in c.cancel() })
    }

    // MARK: arquivos da cópia do app

    private static let tipos: [String: String] = [
        "html": "text/html; charset=utf-8", "js": "text/javascript; charset=utf-8", "css": "text/css; charset=utf-8",
        "json": "application/json", "mp3": "audio/mpeg", "png": "image/png", "svg": "image/svg+xml",
        "woff2": "font/woff2", "woff": "font/woff", "ttf": "font/ttf", "otf": "font/otf", "txt": "text/plain; charset=utf-8"]

    private func arquivo(_ c: NWConnection, _ caminho: String) {
        let rel = caminho.split(separator: "/").map(String.init)
        guard !rel.isEmpty, !rel.contains(".."), !rel.contains(where: { $0.hasPrefix(".") }) else {
            responder(c, "404 Not Found", "text/plain", Data()); return
        }
        let url = rel.reduce(raiz) { $0.appendingPathComponent($1) }
        guard let d = try? Data(contentsOf: url) else {
            responder(c, "404 Not Found", "text/plain; charset=utf-8", Data("Arquivo não encontrado: \(caminho)".utf8)); return
        }
        responder(c, "200 OK", Self.tipos[url.pathExtension.lowercased()] ?? "application/octet-stream", d)
    }

    // MARK: tela (o cérebro grava, o celular lê)

    private func estadoRota(_ c: NWConnection, _ metodo: String, _ q: [String: String], _ corpo: Data) {
        if metodo == "POST" {
            let src = q["src"] ?? ""
            if q["claim"] != nil, !src.isEmpty { dono = src }
            if src != dono { responder(c, "409 Conflict", "application/json", Data("{\"ok\":false,\"dono\":false}".utf8)); return }
            estado = corpo
            estadoV = (q["v"].flatMap { Int($0) }).map(String.init) ?? String(Int(Date().timeIntervalSince1970))
            responder(c, "200 OK", "application/json", Data("{\"ok\":true}".utf8))
            mandarSSE(estado)
            acordar()
            return
        }
        let fim = Date().addingTimeInterval(20)
        let tentar: () -> Bool = { [weak self] in
            guard let self else { return true }
            let mesmo = (q["v"] ?? "") == self.estadoV
            if q["wait"] == nil || (!self.estadoV.isEmpty && !mesmo) || Date() >= fim {
                if self.estadoV.isEmpty || mesmo { self.responder(c, "204 No Content", "text/plain", Data()) }
                else { self.responder(c, "200 OK", "application/json", self.estado, "X-Versao: \(self.estadoV)\r\n") }
                return true
            }
            return false
        }
        esperar(tentar)
    }

    private func abrirSSE(_ c: NWConnection) {
        let cab = "HTTP/1.0 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-store\r\nConnection: close\r\n\r\nretry: 500\n\n"
        c.send(content: Data(cab.utf8), completion: .contentProcessed { _ in })
        sse[ObjectIdentifier(c)] = c
        c.stateUpdateHandler = { [weak self, weak c] s in
            guard let self, let c else { return }
            switch s { case .failed, .cancelled: self.sse.removeValue(forKey: ObjectIdentifier(c)); default: break }
        }
        if !estado.isEmpty { mandar(c, linhaSSE(estado)) }
    }

    private func linhaSSE(_ d: Data) -> Data {
        var s = String(decoding: d, as: UTF8.self)
        s = s.replacingOccurrences(of: "\r", with: " ").replacingOccurrences(of: "\n", with: " ")
        return Data("data: \(s)\n\n".utf8)
    }
    private func mandarSSE(_ d: Data) { let l = linhaSSE(d); sse.values.forEach { mandar($0, l) } }
    private func pingar() { let l = Data("event: ping\ndata: 1\n\n".utf8); sse.values.forEach { mandar($0, l) } }
    private func mandar(_ c: NWConnection, _ d: Data) {
        c.send(content: d, completion: .contentProcessed { [weak self] e in
            if e != nil { self?.sse.removeValue(forKey: ObjectIdentifier(c)); c.cancel() }
        })
    }

    // MARK: comandos (o celular manda, o cérebro lê)

    private func cmdRota(_ c: NWConnection, _ metodo: String, _ q: [String: String], _ corpo: Data) {
        if metodo == "POST" {
            ultimoCmd += 1
            let s = String(decoding: corpo, as: UTF8.self).replacingOccurrences(of: "\n", with: " ").replacingOccurrences(of: "\r", with: " ")
            cmds.append((ultimoCmd, s))
            if cmds.count > 200 { cmds.removeFirst(cmds.count - 200) }
            responder(c, "200 OK", "application/json", Data("{\"ok\":true}".utf8))
            acordar()
            return
        }
        let desde = q["id"].flatMap { Int($0) }
        let src = q["src"] ?? ""
        let fim = Date().addingTimeInterval(20)
        let tentar: () -> Bool = { [weak self] in
            guard let self else { return true }
            let novos = (desde != nil && src == self.dono) ? self.cmds.filter { $0.0 > desde! }.map { $0.1 } : []
            if desde == nil || !novos.isEmpty || q["wait"] == nil || Date() >= fim || self.ultimoCmd < desde! {
                self.responder(c, "200 OK", "application/json", Data("{\"last\":\(self.ultimoCmd),\"cmds\":[\(novos.joined(separator: ","))]}".utf8))
                return true
            }
            return false
        }
        esperar(tentar)
    }

    /// Pedidos que esperam novidade (até 20 s): respondem quando chega algo ou quando o tempo acaba.
    private func esperar(_ tentar: @escaping () -> Bool) {
        if tentar() { return }
        let id = UUID()
        esperas[id] = tentar
        fila.asyncAfter(deadline: .now() + 20.2) { [weak self] in
            if let t = self?.esperas.removeValue(forKey: id) { _ = t() }
        }
    }
    private func acordar() { for (id, t) in esperas where t() { esperas.removeValue(forKey: id) } }

    // MARK: backups do iPhone (os do Mac continuam no Mac)

    private func backupRota(_ c: NWConnection, _ metodo: String, _ q: [String: String], _ corpo: Data) {
        try? FileManager.default.createDirectory(at: pastaBackups, withIntermediateDirectories: true)
        if metodo == "POST" {
            guard corpo.first == UInt8(ascii: "{") else { responder(c, "400 Bad Request", "text/plain", Data("backup vazio".utf8)); return }
            let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd-HHmmss"; f.locale = Locale(identifier: "en_US_POSIX")
            let nome = "progresso-\(f.string(from: Date()))\(q["tipo"] == "auto" ? "-auto" : "").json"
            do { try corpo.write(to: pastaBackups.appendingPathComponent(nome), options: .atomic) }
            catch { responder(c, "500 Internal Server Error", "text/plain", Data("não consegui gravar".utf8)); return }
            let todos = nomesBackups()
            for n in todos.dropFirst(30) { try? FileManager.default.removeItem(at: pastaBackups.appendingPathComponent(n)) }
            responder(c, "200 OK", "application/json", Data("{\"ok\":true,\"nome\":\"\(nome)\"}".utf8))
            return
        }
        let nome = q["nome"] ?? ""
        guard nome.hasPrefix("progresso-"), nome.hasSuffix(".json"), !nome.contains("/"),
              let d = try? Data(contentsOf: pastaBackups.appendingPathComponent(nome)) else {
            responder(c, "404 Not Found", "text/plain; charset=utf-8", Data("backup não encontrado".utf8)); return
        }
        responder(c, "200 OK", "application/json", d)
    }
    private func nomesBackups() -> [String] {
        ((try? FileManager.default.contentsOfDirectory(atPath: pastaBackups.path)) ?? [])
            .filter { $0.hasPrefix("progresso-") && $0.hasSuffix(".json") }.sorted(by: >)
    }
    private func listaBackups(_ c: NWConnection) {
        let l = nomesBackups().map { n -> String in
            let t = (try? FileManager.default.attributesOfItem(atPath: pastaBackups.appendingPathComponent(n).path)[.size] as? Int) ?? 0
            return "{\"nome\":\"\(n)\",\"tam\":\(t)}"
        }
        responder(c, "200 OK", "application/json", Data("[\(l.joined(separator: ","))]".utf8))
    }
}
