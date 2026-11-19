# Treino de piano

App para estudar piano com um **piano digital ligado por USB (MIDI)**. Ele mostra a partitura, ouve o que você toca e corrige nota por nota. Confere se a tecla está certa, se entrou no tempo e se você segurou a nota pelo tempo todo.

Roda no **Mac** (no Chrome). No **iPhone**, a tela fica apoiada na estante do piano, pelo app do iPhone ou pelo navegador. Com o app do iPhone, o piano também pode ficar ligado no próprio iPhone.

Feito para quem está começando. Tudo é em português, com o nome das notas em letra (C D E…) ou em sílaba (Dó Ré Mi…). O app nunca pede mais de uma coisa nova por vez.

## O que ele faz

### Tocar e ser corrigido
- **Correção pelo piano de verdade (MIDI):** nota certa ou errada, adiantou ou atrasou (em milissegundos), soltou cedo ou segurou demais, e a força de cada tecla (de pp a ff).
- **Dois modos:**
  - **Com tempo:** metrônomo e contagem.
  - **Espera:** o app espera você achar a nota certa. Opcionalmente, a música anda no andamento e para em cada nota até você tocá-la.
- **Play, pausa e continuar:** a pausa para onde você está. O ▶ continua do começo daquele compasso, e o ⏮ volta ao começo da música.
- **Partitura desenhada pelo app:** pauta dupla, armadura, pausas, barras de colcheia, ligaduras, quiálteras, troca de clave e cifra. Sobre as notas pode aparecer o dedo, o nome da nota ou a contagem.
- **Queda de notas:** as notas descem até o teclado, como nos vídeos de piano. O dedo e o nome aparecem mesmo nas notas curtas e nas teclas pretas. Com a música parada, dá para rolar para ver a música inteira.

### Treinar as partes difíceis
- **Trecho por toque:** toque no primeiro e no último compasso (na partitura, na queda de notas ou no iPhone) e aperte **Repetir sem parar**. O app conta as voltas e as voltas seguidas sem erro.
- **Repetir o que errei:** os compassos errados ficam marcados enquanto você toca. Um toque para e repete só esse pedaço.
- **Trechos para treinar:** o trecho que você repetiu fica guardado. Depois, na aba Hoje ou no Início do iPhone, um toque abre e já começa a repetir, com o mesmo andamento e a mesma mão.
- **Uma mão só** (o app pode tocar a outra), **linhas da partitura** e **subir o andamento sozinho** (sobe 5 BPM a cada 90% ou mais, até o alvo).

### Ver a evolução
- **Resultado que diz o que fazer:** um foco por vez (onde, o que aconteceu, como treinar, quando está pronto) e um botão que prepara esse treino.
- **Recorde por nível:** cada música tem um recorde para cada modo e andamento, por exemplo modo Espera, 50 BPM e 55 BPM, separado por mão. Assim você compara com você mesmo no mesmo nível.
- **Evolução:** a nota de cada tentativa fica guardada, com uma linha de evolução por música e por nível.
- **Replays:** no fim, **Salvar replay** guarda as teclas, o pedal, o resultado e o **som de verdade do seu piano**, gravado pelo cabo (no Mac ou no iPhone). Dá para ouvir, cortar o começo e o fim, renomear e compartilhar o áudio (.wav) ou o MIDI. Num replay sem som gravado, o app toca o replay no próprio piano e grava.

### Mais
- **Jogo das notas:** uma nota aparece na pauta e você aperta a tecla certa. São 9 níveis, com recordes, e as notas que você mais erra voltam mais vezes.
- **Leitura de notas:** sequências novas a cada vez.
- **Conceitos:** explicações curtas com desenho e som, liberadas conforme a página do livro.
- **Importar músicas:**
  - **MusicXML**;
  - **MIDI**;
  - **PDF**, lido pelo Audiveris;
  - **PDF + MIDI combinados**, compasso por compasso.
- **Rotina do dia, histórico e perfis:** cada pessoa tem o próprio histórico, recordes e ajustes.
- **Atualização sem perder nada:** o app se atualiza sozinho com o exercício parado e mantém tudo como estava. Antes de trocar, testa a versão nova escondido.

## App do iPhone (pasta `ios/`)

O app mostra a tela do celular e faz mais do que o navegador:
- **Piano no cabo do iPhone (USB-C):** as notas vão ao Mac já com a hora certa. O guia e o metrônomo voltam para o piano.
- **Sem o Mac:** o iPhone vira o app inteiro. Ao reencontrar o Mac, junta os dados.
- **Câmera:** grava vídeo tocando, com o som do piano pelo cabo. Com o cabo no Mac, o som vem do Mac. Dá para voltar à partitura enquanto grava e, depois, cortar, renomear e compartilhar os vídeos.
- **Notas pelo som:** quando não há cabo, o app ouve o piano pelo microfone.

Para instalar, é preciso o Xcode e uma conta Apple de desenvolvedor. Com conta gratuita, o app precisa ser reinstalado a cada 7 dias; com conta paga, a cada ano.

1. Gere o endereço do Mac:
   ```bash
   sh ios/gerar-endereco.sh
   ```
2. Compile:
   ```bash
   cd ios && xcodebuild -scheme TreinoPiano -destination generic/platform=iOS -allowProvisioningUpdates
   ```
3. Instale com `xcrun devicectl device install app`.

O servidor confere a assinatura uma vez por dia. Quando faltam 20 dias para vencer, ele reinstala sozinho (`ferramentas/reinstalar-iphone.sh`).

## Do que precisa

- **Mac** com o **Google Chrome** (ou Edge). O Safari não tem Web MIDI.
- **Piano digital com USB to Host.** Foi testado com o Yamaha P-225, que aparece como "P-Series" e manda também o som pelo cabo.
- Mais nada para instalar: o servidor local usa o **Perl que já vem no macOS**.
- Opcional:
  - [Audiveris](https://github.com/Audiveris/audiveris), para converter partitura em PDF. O app procura em `/Applications/Audiveris.app`.
  - [MuseScore](https://musescore.org), para corrigir partituras importadas.
  - Xcode, para o app do iPhone.

## Como usar

Passo a passo completo, para usar sem ajuda: **[COMO-USAR.md](COMO-USAR.md)**.

1. (Opcional, uma vez) Baixe os sons de piano, para o app funcionar sem internet:
   ```bash
   bash ferramentas/baixar-sons.sh
   ```
   Sem isso, o app busca os sons na internet.
2. Dê **duplo clique** em `Abrir Treino de Piano.command`. Ele liga o servidor local, abre o app no Chrome e oferece mandar o link para o iPhone por AirDrop.
3. No app, aperte **Conectar ao piano**, escolha um exercício e aperte o ▶.
4. **iPhone:** abra o app do iPhone, ou, no Safari, o endereço que aparece no app (`http://<IP do Mac>:8000/celular.html`). O iPhone precisa estar no mesmo Wi-Fi.

Sem piano, dá para testar com o teclado do computador: `A S D F G H J K` = Dó a Dó, a partir do Dó central.

## Arquivos

| Arquivo | O que é |
|---|---|
| `treino-piano.html`, `.css`, `.js` | O app do Mac (sem etapa de build) |
| `celular.html` | A tela do iPhone (no navegador ou dentro do app) |
| `queda.js` | Desenho da queda de notas (Mac e iPhone) |
| `qr.js`, `nosleep.js` | QR code do endereço; tela sempre acesa no celular |
| `ios/` | App do iPhone (Swift): cabo, modo sem o Mac, câmera, som do piano nos replays |
| `fontes/`, `icones/` | Fonte e ícones do app |
| `DESIGN.md`, `COMO-USAR.md` | Regras do visual e passo a passo de uso |
| `ferramentas/servidor.pl` | Servidor local em Perl: arquivos, tela do iPhone, comandos, replays, conversão de PDF |
| `ferramentas/reinstalar-iphone.sh` | Reassina e reinstala o app do iPhone perto do vencimento |
| `ferramentas/texto-para-musicxml.pl` | Gera MusicXML a partir de uma transcrição em texto |
| `ferramentas/abrir-chrome.applescript` | Abre ou recarrega o app no Chrome sem duplicar abas |
| `ferramentas/airdrop.js` | Abre o AirDrop com o link do iPhone |
| `ferramentas/render-livro.js`, `pdf-paginas.js` | Páginas de PDF em imagem; separar páginas de um PDF |
| `ferramentas/baixar-sons.sh` | Baixa os 88 sons de piano para `sons/` |
| `Abrir Treino de Piano.command` | Atalho de duplo clique |

## Exercícios próprios (opcional)

O app vem com exercícios gerais: aquecimento, ritmo e leitura. Para ter exercícios do **seu livro** ou das **suas músicas**, crie na pasta um arquivo `conteudo-pessoal.js`. Ele fica fora do repositório (`.gitignore`):

```js
window.CONTEUDO_PESSOAL = function () {
  // índice das notas: C4 (Dó central) = 28, D4 = 29 … (oitava*7 + C0 D1 E2 F3 G4 A5 B6)
  // Q(duração, índice, dedo, mão 'd'|'e')  ·  g: 'livro' (aba Livro) ou 'mus' (aba Músicas)
  add({ id: 'minha_musica', g: 'mus', title: 'Minha música', src: 'Livro p. 40', bpm: 80,
        ms: [[Q(1, 28, 1, 'd'), Q(1, 29, 2, 'd'), Q(2, 30, 3, 'd')]],
        desc: 'Mão direita, posição de Dó.' });
};
```

Com exercícios de livro (`g: 'livro'` e `src: 'Livro p. N'`), aparece a aba **Livro** com "Estou na página". Lá, só aparecem os exercícios até a página escolhida.

## Seus dados

Nada vai para a internet. O servidor só atende `localhost` e a rede da sua casa (IPs privados).

- **No navegador** (localStorage): histórico, recordes, trechos guardados, ajustes, perfis e músicas importadas.
- **No Mac**, na pasta do app: a evolução de cada tentativa e os replays salvos (`replays/`), e o registro do que acontece (`registro/`). Se houver iCloud Drive, os replays ganham uma cópia numa pasta "Treino de Piano".
- **Backup:** fica na aba Histórico. O app salva sozinho uma vez por dia em `backups/`, também com cópia no iCloud se houver, e dá para restaurar, baixar ou abrir um backup.

Se você abrir o app com `?teste` no fim do endereço, ele não fala com o iPhone nem toma o controle da aba principal. Serve para testar mudanças.

## O que não está no repositório

Ficam de fora (veja o `.gitignore`):
- **livros e partituras** (PDF, MIDI, MusicXML), que têm direitos autorais, e as páginas renderizadas do livro;
- os **sons de piano**, que você baixa com o script;
- os **exercícios próprios** (`conteudo-pessoal.js`) e as **anotações pessoais**;
- **replays, registros e backups**, que têm dados de quem usa o app;
- o **endereço do Mac** do app do iPhone (`ios/TreinoPiano/EnderecoPadrao.swift`, gerado pelo script) e a pasta de compilação do Xcode.

## Créditos

- Sons de piano: **FluidR3 GM** (Frank Wen), licença CC BY 3.0, via [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts).
- Fonte: **Atkinson Hyperlegible Next** (Braille Institute), licença SIL OFL 1.1 (`fontes/OFL.txt`).
- Tela sempre acesa no celular: **[NoSleep.js](https://github.com/richtr/NoSleep.js)** (Rich Tibbett), licença MIT (`nosleep.js`).
- Leitura de PDF: **[Audiveris](https://github.com/Audiveris/audiveris)** (AGPL-3.0). O app só chama o programa instalado; ele não vem junto.
