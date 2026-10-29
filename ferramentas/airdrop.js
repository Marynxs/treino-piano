// Abre a janela do AirDrop do Mac com um link. Mandando para um iPhone da mesma conta Apple,
// o iPhone abre o link sozinho no Safari (sem precisar aceitar).
// Uso: osascript -l JavaScript ferramentas/airdrop.js "http://endereco"
ObjC.import('AppKit');
function run(argv){
 var app=$.NSApplication.sharedApplication;app.setActivationPolicy($.NSApplicationActivationPolicyAccessory);
 var url=$.NSURL.URLWithString(argv[0]),items=$.NSArray.arrayWithObject(url);
 var s=$.NSSharingService.sharingServiceNamed('com.apple.share.AirDrop.send');
 if(!s||!s.canPerformWithItems(items))return 'AirDrop indisponível (Bluetooth/Wi-Fi desligado?)';
 app.activateIgnoringOtherApps(true);s.performWithItems(items);
 // mantém o script vivo enquanto a janela do AirDrop está aberta (até 2 min)
 var end=Date.now()+120000;delay(1);
 while(Date.now()<end){$.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.5));
  var open=false,ws=app.windows;for(var i=0;i<ws.count;i++)if(ws.objectAtIndex(i).isVisible)open=true;if(!open)break}
 return 'ok'}
