# DESIGN.md: visual do Treino de piano

Direção **"Estante limpa"**, escolhida em 30/10/2026. A tela parece uma partitura na estante: papel frio, tinta preta e uma fonte feita para ler fácil. O azul aparece só onde há ação. Inspirações: flowkey e Skoove (sóbrios, para adultos) e musictheory.net (exercício limpo). Não copiar o estilo da Apple: seguir regras de design conhecidas.

## Cores

| Papel | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | `#F4F6F9` | `#13161B` | fundo (papel frio, nunca creme) |
| `--card` | `#FFFFFF` | `#1C2026` | cartões, pauta do jogo |
| `--tx` | `#1B1E24` | `#ECEFF3` | texto principal |
| `--tx2` | `#535A66` | `#A9B0BB` | texto de apoio |
| `--bd` | `#DCE0E7` | `#313741` | bordas finas |
| `--ink` | `#000` | `#ECEFF3` | partitura (pauta, notas, claves) |
| `--blue` | `#378ADD` | `#378ADD` | botão principal e botão **ligado** (regra fixa: fundo azul e texto branco, com "ligado"/"desligado" escrito) |

As cores de correção são as mesmas em todo o app:
- certo: verde `#3B6D11` / `#C0DD97`;
- quase: amarelo `#FAC775`;
- errado: vermelho `#E24B4A` / `#F7C1C1`;
- faltou: cinza.

## Letra

- **Atkinson Hyperlegible Next** (`fontes/`, licença OFL), feita para leitura fácil. Uma família só: 400 no texto, 600 a 700 nos títulos.
- Texto de 16 px, linhas com no máximo 80 caracteres.
- Sem rótulos em MAIÚSCULAS e sem emoji nos títulos.

## Forma

- **Uma ação principal por tela** (Começar / Começar o jogo, em azul). O resto fica em cinza claro (`--fill`).
- **Abas** com sublinhado azul na aba aberta.
- Cartões com borda de 1 px e cantos de 14 a 16 px, sem sombra. A sombra fica só para o que está **por cima** (Ajustes, menu, comemoração).
- Alvos de toque de 44 px e espaçamento em múltiplos de 8 px.
- **Revelação progressiva:** o que se usa pouco fica em ⚙ Ajustes ou dentro de "detalhes".
- O destaque fica num lugar só: **a pauta grande** (jogo das notas, partitura). O resto fica quieto.

## Movimento

- Só em resposta ao que você faz: acerto, sequência de acertos e **recorde**. O recorde tem um cartão com confete por 2,4 s e um arpejo curto.
- Se o Mac pede "reduzir movimento", não há animação.

## Texto

- Em português simples, falando com a pessoa ("Toque a tecla azul para seguir").
- O resultado diz **o que fazer**:
  - **um foco** por vez;
  - onde foi o problema;
  - o que aconteceu;
  - como treinar;
  - quando está pronto;
  - e um botão que prepara esse treino.
