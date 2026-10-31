# Treino de piano

App para estudar piano com um **piano digital ligado ao Mac por USB (MIDI)**. Ele mostra a partitura, ouve o que você toca e corrige nota por nota: se a tecla está certa, se entrou no tempo, se você segurou a nota pelo tempo todo. Você pode ver a tela no **iPhone** (apoiado na estante do piano) enquanto o Mac faz a correção.

Feito para quem está começando: as explicações e os avisos são em português, com o nome das notas em letra (C D E…) ou em sílaba (Dó Ré Mi…), e o app nunca exige mais de uma coisa nova por vez.

## O que ele faz

- **Correção pelo piano de verdade (MIDI):** nota certa ou errada, adiantou ou atrasou (em milissegundos) e soltou cedo ou segurou demais. No fim, um relatório com dicas e botões como "Repetir mais devagar" e "Treinar só os compassos com erro".
- **Dois modos:**
  - **Com tempo**, com metrônomo e contagem;
  - **Espera**, em que o app espera você achar a nota certa.
- **Partitura desenhada pelo app:** pauta dupla, armadura, pausas, barras de colcheia, ligaduras de valor, quiálteras e troca de clave na mão esquerda. Sobre as notas pode aparecer o dedo, o nome da nota ou a contagem.
- **Queda de notas:** as notas descem até o teclado, como nos vídeos de piano.
- **Treino por partes:**
  - uma mão só (o app pode tocar a outra);
  - uma linha ou um grupo de linhas da partitura;
  - **subir o andamento sozinho**: a cada vez que você acerta 90% ou mais, sobe 5 BPM até o andamento alvo.
- **Jogo das notas:** uma nota aparece na pauta e você aperta a tecla certa. Tem dois modos, "Uma por vez" (com dica pela nota-guia mais perto) e "Correndo" (as notas andam até a linha). São 9 níveis, das notas do meio até as linhas suplementares das duas claves. As notas que você mais erra voltam mais vezes. Há recordes com comemoração.
- **Leitura de notas:** sequências novas a cada vez, para ler na pauta e tocar.
- **Conceitos:** explicações curtas com desenho e som, liberadas conforme a página do livro, e dicas do que fazer e do que evitar ao estudar.
- **Resultado que diz o que fazer:** um foco por vez (onde, o que aconteceu, como treinar, quando está pronto), com um botão que prepara esse treino. Também compara com a última tentativa, guarda o recorde de cada música e sugere desligar ajudas (som guia, cores, nomes) quando você já não precisa delas.
- **Dinâmica:** mede a força de cada tecla (pp até ff) e tem um exercício de piano e forte.
- **Gravar e ouvir:** cada vez que você toca, o app grava. "Ouvir o que eu toquei" toca de volta.
- **Importar músicas:**
  - **MusicXML**;
  - **MIDI**, que vira partitura com as duas mãos e o nome das notas pelo acorde;
  - **PDF**, lido pelo Audiveris;
  - **PDF + MIDI combinados**: compasso por compasso, usa o melhor de cada um.
- **Rotina do dia, histórico, sequência de dias e perfis**: cada pessoa tem o próprio histórico, recordes e ajustes.
- **Tela no iPhone:** partitura, contagem e resultado em tela cheia. Os botões do iPhone comandam o Mac.
- **Atualização sem perder nada:** quando os arquivos do app mudam, ele se atualiza sozinho com o exercício parado e mantém tudo como estava. Antes de trocar, testa a versão nova escondido.

## Do que precisa

- **Mac** com o **Google Chrome** (ou Edge). O Safari não tem Web MIDI.
- **Piano digital com USB to Host**. Foi testado com o Yamaha P-225, que aparece como "P-Series".
- Mais nada para instalar: o servidor local usa o **Perl que já vem no macOS**.
- Opcional:
  - [Audiveris](https://github.com/Audiveris/audiveris), para converter partitura em PDF. O app procura em `/Applications/Audiveris.app`.
  - [MuseScore](https://musescore.org), para corrigir partituras importadas.

## Como usar

Passo a passo completo, para usar sem ajuda: **[COMO-USAR.md](COMO-USAR.md)**.

1. (Opcional, uma vez) Baixe os sons de piano, para o app funcionar sem internet:
   ```bash
   bash ferramentas/baixar-sons.sh
   ```
   Sem isso, o app busca os sons na internet.
2. Dê **duplo clique** em `Abrir Treino de Piano.command`. Ele liga o servidor local, abre o app no Chrome e oferece mandar o link para o iPhone por AirDrop.
3. No app, aperte **Conectar ao piano**, escolha um exercício e aperte **Começar**.
4. **iPhone:** abra no Safari o endereço que aparece no app (`http://<IP do Mac>:8000/celular.html`). O iPhone precisa estar no mesmo Wi-Fi.

Sem piano, dá para testar com o teclado do computador: `A S D F G H J K` = Dó a Dó a partir do Dó central.

## Arquivos

| Arquivo | O que é |
|---|---|
| `treino-piano.html` | O app inteiro (HTML + JavaScript, sem etapa de build) |
| `celular.html` | A tela do iPhone |
| `queda.js` | Desenho da queda de notas (usado pelo Mac e pelo iPhone) |
| `fontes/` | Fonte do app (Atkinson Hyperlegible Next, OFL) |
| `DESIGN.md` | Regras do visual (cores, letra, forma, texto) |
| `ferramentas/servidor.pl` | Servidor local em Perl: arquivos, tela do iPhone (SSE), comandos, conversão de PDF |
| `ferramentas/abrir-chrome.applescript` | Abre ou recarrega o app no Chrome sem duplicar abas |
| `ferramentas/airdrop.js` | Abre o AirDrop com o link do iPhone |
| `ferramentas/render-livro.js` | Transforma páginas de um PDF em imagens (para estudar um livro) |
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

Com exercícios de livro (`g: 'livro'` e `src: 'Livro p. N'`), aparece a aba **Livro** com "Estou na página": só aparecem os exercícios até a página escolhida.

## Seus dados

Tudo fica **no seu navegador** (localStorage): histórico, ajustes, perfis e músicas importadas. Na aba Histórico há **backup**: o app salva sozinho uma vez por dia na pasta `backups/` (e, se houver iCloud Drive, numa pasta "Treino de Piano" nele), e dá para restaurar, baixar ou abrir um arquivo de backup. A pasta `backups/` fica fora do repositório. Nada vai para a internet. O servidor só atende `localhost` e a rede da sua casa (IPs privados).

Se você abrir o app com `?teste` no fim do endereço, ele não fala com o iPhone nem toma o controle da aba principal. Serve para testar mudanças.

## O que não está no repositório

Ficam de fora (veja o `.gitignore`):
- **livros e partituras** (PDF, MIDI, MusicXML), que têm direitos autorais;
- as **páginas renderizadas** do livro;
- os **sons de piano**, que você baixa com o script;
- **anotações pessoais**.
- os **exercícios próprios** (`conteudo-pessoal.js`).

As músicas que você importa ficam só no seu navegador.

## Créditos

- Sons de piano: **FluidR3 GM** (Frank Wen), licença CC BY 3.0, via [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts).
- Fonte: **Atkinson Hyperlegible Next** (Braille Institute), licença SIL OFL 1.1 (`fontes/OFL.txt`).
- Tela sempre acesa no celular: **[NoSleep.js](https://github.com/richtr/NoSleep.js)** (Rich Tibbett), licença MIT (`nosleep.js`).
- Leitura de PDF: **[Audiveris](https://github.com/Audiveris/audiveris)** (AGPL-3.0). O app só chama o programa instalado; ele não vem junto.
