// Tela de calibração: você toca cada tecla, uma por vez, e o app guarda como o SEU piano soa no SEU quarto.
// Uma vez só. Dá para pular teclas, voltar e terminar no meio (o que já foi tocado fica guardado).
import UIKit

final class TelaCalibracao: UIViewController {
    private let ouvido: Ouvido
    private var notas = Array(36...84)            // C2 (Dó 2) a C6 (Dó 6)
    private var i = 0
    private var moldes: [Int: [Float]]
    var aoFechar: (() -> Void)?
    private let titulo = UILabel(), nota = UILabel(), dica = UILabel(), progresso = UILabel()
    private let pular = UIButton(type: .system), voltar = UIButton(type: .system), terminar = UIButton(type: .system)

    init(ouvido: Ouvido) {
        self.ouvido = ouvido
        self.moldes = Ouvido.lerMoldes() ?? [:]
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
    }
    required init?(coder: NSCoder) { fatalError() }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }
    override var prefersStatusBarHidden: Bool { true }

    static func nome(_ m: Int) -> String {
        let en = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][m % 12]
        let pt = ["Dó", "Dó♯", "Ré", "Mi♭", "Mi", "Fá", "Fá♯", "Sol", "Lá♭", "Lá", "Si♭", "Si"][m % 12]
        return "\(en)\(m / 12 - 1) (\(pt))"
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.075, green: 0.086, blue: 0.106, alpha: 1)
        titulo.text = "Calibrar o som do piano"
        titulo.font = .systemFont(ofSize: 22, weight: .bold)
        nota.font = .systemFont(ofSize: 56, weight: .bold)
        dica.font = .systemFont(ofSize: 17); dica.numberOfLines = 0; dica.textAlignment = .center
        progresso.font = .monospacedDigitSystemFont(ofSize: 15, weight: .regular)
        [titulo, nota, dica, progresso].forEach { $0.textColor = UIColor(red: 0.925, green: 0.937, blue: 0.953, alpha: 1); $0.textAlignment = .center }
        dica.textColor = UIColor(red: 0.663, green: 0.69, blue: 0.733, alpha: 1)
        progresso.textColor = dica.textColor
        for (b, t) in [(voltar, "‹ Voltar uma"), (pular, "Pular esta tecla"), (terminar, "Terminar")] {
            b.setTitle(t, for: .normal)
            b.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
            b.backgroundColor = UIColor(red: 0.149, green: 0.169, blue: 0.2, alpha: 1)
            b.setTitleColor(.white, for: .normal)
            b.layer.cornerRadius = 12
            b.contentEdgeInsets = UIEdgeInsets(top: 12, left: 20, bottom: 12, right: 20)
        }
        terminar.backgroundColor = UIColor(red: 0.216, green: 0.541, blue: 0.867, alpha: 1)
        voltar.addTarget(self, action: #selector(volta), for: .touchUpInside)
        pular.addTarget(self, action: #selector(pula), for: .touchUpInside)
        terminar.addTarget(self, action: #selector(fecha), for: .touchUpInside)
        let botoes = UIStackView(arrangedSubviews: [voltar, pular, terminar]); botoes.spacing = 12
        let pilha = UIStackView(arrangedSubviews: [titulo, progresso, nota, dica, botoes])
        pilha.axis = .vertical; pilha.alignment = .center; pilha.spacing = 16
        pilha.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(pilha)
        NSLayoutConstraint.activate([pilha.centerXAnchor.constraint(equalTo: view.centerXAnchor), pilha.centerYAnchor.constraint(equalTo: view.centerYAnchor),
                                     pilha.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, constant: -48)])
        mostrar()
    }

    private func mostrar(_ aviso: String? = nil) {
        guard i < notas.count else { fecha(); return }
        let n = notas[i]
        nota.text = Self.nome(n)
        progresso.text = "Tecla \(i + 1) de \(notas.count)" + (moldes[n] != nil ? " · já calibrada (tocar de novo substitui)" : "")
        dica.text = aviso ?? "Toque só esta tecla, com força normal, e deixe soar. O iPhone perto do piano, como no treino."
        ouvido.capturar { [weak self] v in self?.chegou(v, n) }
    }

    private func chegou(_ v: [Float], _ n: Int) {
        guard i < notas.count, notas[i] == n else { return }
        if !ouvido.parece(v, nota: n) { mostrar("Parece que soou outra tecla. Toque \(Self.nome(n)) de novo."); return }
        moldes[n] = v
        ouvido.usarMoldes(moldes)
        Ouvido.gravarMoldes(moldes)
        i += 1
        mostrar()
    }

    @objc private func pula() { i += 1; mostrar() }
    @objc private func volta() { i = max(0, i - 1); mostrar() }
    @objc private func fecha() {
        ouvido.cancelarCaptura()
        Ouvido.gravarMoldes(moldes)
        Registro.anotar("calibração: \(moldes.count) teclas guardadas")
        dismiss(animated: true) { [aoFechar] in aoFechar?() }
    }
}
