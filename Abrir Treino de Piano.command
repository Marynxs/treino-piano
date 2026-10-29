#!/bin/bash
# Duplo clique: liga o servidor local, abre o app no Chrome e manda o link para o iPhone por AirDrop.
cd "$(dirname "$0")"
URL="http://localhost:8000/treino-piano.html"
if ! curl -s -o /dev/null "$URL"; then
  perl ferramentas/servidor.pl 8000 &
  SRV=$!
  sleep 1
fi
osascript ferramentas/abrir-chrome.applescript "$URL" 2>/dev/null || open -a "Google Chrome" "$URL" 2>/dev/null || open "$URL"
sleep 2
curl -s -o /dev/null http://localhost:8000/api/airdrop
echo "Na janela do AirDrop, clique no seu iPhone (ou feche a janela se não for usar o iPhone)."
if [ -n "$SRV" ]; then
  echo "Deixe esta janela aberta enquanto treina. Para desligar, feche a janela."
  wait $SRV
fi
