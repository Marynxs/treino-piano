#!/bin/sh
# Grava o endereço do Mac (nome .local) que o app do iPhone abre na primeira vez. Fica fora do git (tem o nome do Mac).
cd "$(dirname "$0")"
H=$(scutil --get LocalHostName 2>/dev/null)
printf '// Gerado por ios/gerar-endereco.sh (fora do git).\nenum EnderecoPadrao { static let mac = "http://%s.local:8000" }\n' "$H" > TreinoPiano/EnderecoPadrao.swift
echo "Endereço: http://$H.local:8000"
