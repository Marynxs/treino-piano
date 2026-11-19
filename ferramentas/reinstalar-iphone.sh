#!/bin/sh
# Reassina e reinstala o app do iPhone quando a assinatura está perto de vencer.
# O servidor (porta 8000) chama uma vez por dia. Uso à mão: sh ferramentas/reinstalar-iphone.sh [agora]
#   sem argumento: só reinstala se faltarem 20 dias ou menos; "agora": reinstala já.
# Precisa do iPhone ligado (no cabo ou no mesmo Wi-Fi) e desbloqueado na hora.
cd "$(dirname "$0")/../ios" || exit 1
APP=build/Build/Products/Debug-iphoneos/TreinoPiano.app
BID=com.marynxs.treinopiano

dias() {
  exp=$(security cms -D -i "$APP/embedded.mobileprovision" 2>/dev/null | plutil -extract ExpirationDate raw -o - - 2>/dev/null)
  [ -z "$exp" ] && { echo 0; return; }
  e=$(date -j -u -f "%Y-%m-%dT%H:%M:%SZ" "$exp" +%s 2>/dev/null || echo 0)
  echo $(( (e - $(date +%s)) / 86400 ))
}

D=$(dias)
if [ "$1" != "agora" ] && [ "$D" -gt 20 ]; then echo "app do iPhone: assinatura vale mais $D dias"; exit 0; fi

DEV=$(xcrun devicectl list devices 2>/dev/null | grep -i iphone | grep "available" | grep -oE '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' | head -1)
if [ -z "$DEV" ]; then echo "app do iPhone: faltam $D dias, mas o iPhone não está disponível (tento de novo amanhã)"; exit 2; fi

# perto de vencer: tira o perfil antigo deste app para o Xcode pedir um novo (com validade nova)
if [ "$D" -le 20 ]; then
  for p in "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"/*.mobileprovision "$HOME/Library/MobileDevice/Provisioning Profiles"/*.mobileprovision; do
    [ -f "$p" ] && security cms -D -i "$p" 2>/dev/null | grep -q "$BID" && rm -f "$p"
  done
fi

if ! xcodebuild -scheme TreinoPiano -derivedDataPath build -destination generic/platform=iOS -allowProvisioningUpdates -quiet build >/tmp/reinstalar-iphone.log 2>&1; then
  echo "app do iPhone: não consegui compilar (veja /tmp/reinstalar-iphone.log)"; exit 3
fi
if xcrun devicectl device install app --device "$DEV" "$APP" >>/tmp/reinstalar-iphone.log 2>&1; then
  echo "app do iPhone: reinstalado; assinatura vale mais $(dias) dias"
else
  echo "app do iPhone: não consegui instalar (o iPhone estava bloqueado?); tento de novo amanhã"; exit 4
fi
