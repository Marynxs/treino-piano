/* Queda de notas (como nos vídeos de piano do YouTube): as notas descem até o teclado e devem ser tocadas
   quando encostam na linha. Usado pelo Mac (treino-piano.html) e pelo iPhone (celular.html).
   Modelo: {lo, hi, beats, notes:[[tempo, duração, midi|null, mão 'd'|'e', dedo, estado, nome], ...]}; estado 'x' = a outra mão (treino de uma mão só): cinza e apagada
   Mão direita = azul, esquerda = laranja; depois de julgada, a nota fica na cor do resultado (se as cores estiverem ligadas). */
var Queda=(function(){
 var HAND={d:'#378ADD',e:'#E8913A'},ST={ok:'#639922',warn:'#EF9F27',bad:'#E24B4A',miss:'#888780'};
 function isB(m){return [1,3,6,8,10].indexOf(((m%12)+12)%12)>=0}
 /* teclado mostrado: de um Dó até um Si, cobrindo todas as notas, com pelo menos 2 oitavas */
 function range(notes){var lo=999,hi=-1;notes.forEach(function(n){if(n[2]!=null){lo=Math.min(lo,n[2]);hi=Math.max(hi,n[2])}});
  if(hi<0){lo=60;hi=71}lo=lo-((lo%12)+12)%12;hi=hi-((hi%12)+12)%12+11;while(hi-lo<23){lo-=12;if(hi-lo<23)hi+=12}
  return [Math.max(21,lo),Math.min(108,hi)]}
 function keys(lo,hi,W){var whites=0,m;for(m=lo;m<=hi;m++)if(!isB(m))whites++;var kw=W/whites,pos={},i=0;
  for(m=lo;m<=hi;m++){if(!isB(m)){pos[m]={x:i*kw,w:kw,b:false};i++}else pos[m]={x:i*kw-kw*0.31,w:kw*0.62,b:true}}return {pos:pos,kw:kw}}
 function rr(c,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
 /* desenha um quadro. nb = tempo atual (em tempos, pode ser fracionário); o: {dark, live, played:{midi:'ok'|'bad'}, show:'f'|'n'|'x'} */
 function draw(cv,M,nb,o){o=o||{};var dpr=window.devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight;if(!W||!H||!M)return;
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
  var c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
  var dark=!!o.dark,bg=dark?'#161615':'#f4f3ee',grid=dark?'#2c2c2a':'#e2e0d8',bar=dark?'#4a4a47':'#c9c7bd';
  c.fillStyle=bg;c.fillRect(0,0,W,H);
  var lo=M.lo,hi=M.hi,K=keys(lo,hi,W),kbH=Math.max(56,Math.min(H*0.24,120)),hitY=H-kbH,ppb=Math.max(40,hitY/4.2),beats=M.beats||4;
  /* linhas das oitavas (em cada Dó) e linhas de tempo / compasso */
  c.lineWidth=1;for(var m=lo;m<=hi;m++)if(m%12===0){c.strokeStyle=grid;c.beginPath();c.moveTo(K.pos[m].x+0.5,0);c.lineTo(K.pos[m].x+0.5,hitY);c.stroke()}
  for(var b=Math.floor(nb);b<nb+hitY/ppb+1;b++){var y=hitY-(b-nb)*ppb;if(y<0||y>hitY)continue;var isBar=((b%beats)+beats)%beats===0;
   c.strokeStyle=isBar?bar:grid;c.lineWidth=isBar?1.5:1;c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}
  /* notas caindo */
  var active={};
  M.notes.forEach(function(n){var nbeg=n[0],dur=n[1],mid=n[2],h=n[3];if(nbeg+dur<nb-0.3||nbeg>nb+hitY/ppb+0.2)return;
   var p=mid!=null&&K.pos[mid]?K.pos[mid]:{x:W*0.45,w:W*0.1,b:false},y1=hitY-(nbeg-nb)*ppb,y0=hitY-(nbeg+dur-nb)*ppb,x=p.x+1.5,w=p.w-3;
   var st=n[5],gh=st==='x',col=gh?(dark?'#5F5E5A':'#B4B2A9'):(o.live&&st)?ST[st]:HAND[h]||HAND.d;
   if(!gh&&nbeg<=nb+0.02&&nb<nbeg+dur&&mid!=null)active[mid]=HAND[h]||HAND.d;
   c.globalAlpha=gh?0.4:(o.live&&st==='miss')?0.45:1;c.fillStyle=col;rr(c,x,y0+1,w,Math.max(4,y1-y0-2),Math.min(6,w/3));c.fill();
   c.globalAlpha=1;c.strokeStyle=dark?'rgba(255,255,255,.25)':'rgba(0,0,0,.18)';c.lineWidth=1;c.stroke();
   var lab=gh?'':o.show==='n'?n[6]:o.show==='x'?'':n[4];if(lab&&y1-y0>16&&w>12){c.fillStyle='#fff';c.font='600 '+Math.min(14,Math.max(9,w*0.45))+'px -apple-system,sans-serif';c.textAlign='center';c.textBaseline='bottom';c.fillText(lab,x+w/2,y1-3)}});
  /* linha de tocar */
  c.fillStyle=dark?'rgba(133,183,235,.55)':'rgba(55,138,221,.45)';c.fillRect(0,hitY-2,W,3);
  /* teclado: brancas, depois pretas; tecla da vez acende na cor da mão; tecla apertada: verde/vermelho (ou cinza se as cores estão desligadas) */
  var pl=o.played||{};function keyCol(m,base){var p=pl[m];if(p)return !o.live?'#9C9A92':p==='bad'?'#E24B4A':'#639922';return active[m]||base}
  for(m=lo;m<=hi;m++){var q=K.pos[m];if(q.b)continue;c.fillStyle=keyCol(m,'#ffffff');c.fillRect(q.x+0.5,hitY+1,q.w-1,kbH-1);c.strokeStyle='#8a887f';c.strokeRect(q.x+0.5,hitY+1,q.w-1,kbH-1);
   if(m%12===0){c.fillStyle='#6b6a63';c.font=Math.min(12,q.w*0.45)+'px -apple-system,sans-serif';c.textAlign='center';c.textBaseline='bottom';c.fillText(o.cName?o.cName(m):'C'+(Math.floor(m/12)-1),q.x+q.w/2,H-3)}}
  for(m=lo;m<=hi;m++){q=K.pos[m];if(!q.b)continue;c.fillStyle=keyCol(m,'#222220');rr(c,q.x,hitY+1,q.w,kbH*0.62,2);c.fill()}}
 return {draw:draw,range:range}})();

/* versão 2026-10-29 */
