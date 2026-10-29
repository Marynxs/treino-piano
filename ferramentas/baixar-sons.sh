#!/bin/bash
# Baixa os 88 sons de piano (FluidR3 GM, CC BY 3.0) para a pasta sons/ do app.
# Assim o app funciona sem internet e o som sai mais rápido. Uso: bash ferramentas/baixar-sons.sh
cd "$(dirname "$0")/.." || exit 1
mkdir -p sons
BASE="https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/acoustic_grand_piano-mp3"
NOTAS=(C Db D Eb E F Gb G Ab A Bb B)
for m in $(seq 21 108); do
  f="${NOTAS[$((m % 12))]}$((m / 12 - 1)).mp3"
  [ -s "sons/$f" ] || curl -sf -o "sons/$f" "$BASE/$f" || echo "não consegui baixar $f"
done
echo "Sons em sons/: $(ls sons | wc -l | tr -d ' ') de 88"
