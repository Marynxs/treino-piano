/* ENSAIO: a versão nova do app aberta escondida (numa janela invisível) para conferir se ela inicia sem erro antes de atualizar */
var ENSAIO=/[?&]ensaio\b/.test(location.search);
/* ---------- perfis: cada pessoa tem o próprio histórico, recordes e ajustes ----------
   Tudo o que o app guarda com nome "piano_..." passa a ser por perfil (piano_hist@p2...). O 1º perfil usa os nomes antigos,
   então nada do que já estava salvo se perde. Ficam em comum: as músicas importadas e a lista de perfis */
var PERFIS=[{id:'p0',nome:'Perfil 1'}],PERFIL='p0',RAWDEL=null,RAWSET=null,RAWGET=null;
(function(){var S=Storage.prototype,g=S.getItem,s=S.setItem,r=S.removeItem;RAWDEL=function(key){r.call(localStorage,key)};RAWSET=function(key,v){s.call(localStorage,key,v)};RAWGET=function(key){return g.call(localStorage,key)};var COMUM={piano_users:1,piano_perfis:1,piano_perfil:1,piano_excluidas:1,piano_celaj:1};
 try{PERFIS=JSON.parse(g.call(localStorage,'piano_perfis'))||PERFIS;PERFIL=g.call(localStorage,'piano_perfil')||'p0'}catch(e){}
 if(!PERFIS.some(function(p){return p.id===PERFIL}))PERFIL=PERFIS[0].id;
 function k(key){return this===localStorage&&/^piano_/.test(key)&&!COMUM[key]&&PERFIL!=='p0'?key+'@'+PERFIL:key}
 /* hora de cada mudança (piano_mod): ao juntar Mac e iPhone, o ajuste mudado por último vale */
 var MODC=null;function marca(rk){if(rk==='piano_mod'||!/^(piano_|tema_app$)/.test(rk))return;try{if(!MODC)MODC=JSON.parse(g.call(localStorage,'piano_mod')||'{}')||{};MODC[rk]=Date.now();s.call(localStorage,'piano_mod',JSON.stringify(MODC))}catch(e){}}
 S.getItem=function(key){return g.call(this,k.call(this,key))};
 S.setItem=function(key,v){var rk=k.call(this,key);if(this===localStorage&&g.call(this,rk)===String(v))return;var x=s.call(this,rk,v);if(this===localStorage)marca(rk);return x};
 S.removeItem=function(key){var rk=k.call(this,key);if(this===localStorage&&g.call(this,rk)!==null)marca(rk);return r.call(this,rk)}})();
var CEREBRO=/[?&]cerebro\b/.test(location.search);var COMMAC=CEREBRO&&/[?&]commac\b/.test(location.search);/* iPhone corrigindo com o Mac ligado: replays e estatísticas vão ao Mac */
if(CEREBRO)try{cerebroJunta()}catch(e){window.__JUNTA_ERRO=String(e)}
/* ---------- registro: o que acontece vai para registro/AAAA-MM-DD.log no Mac (ajuda a descobrir problemas depois) ---------- */
var REGF=[];
function reg(t){try{if(/[?&](teste|ensaio)\b/.test(location.search)||!/^https?:/.test(location.protocol))return;REGF.push(new Date().toTimeString().slice(0,8)+' '+String(t).replace(/\s+/g,' ').slice(0,600));if(REGF.length>300)REGF.shift();if(!reg.t)reg.t=setTimeout(regEnvia,3000)}catch(e){}}
function regEnvia(){clearTimeout(reg.t);reg.t=null;if(!REGF.length)return;var b=REGF.join('\n');REGF=[];try{fetch('/api/registro?de='+(CEREBRO?'cerebro':'mac'),{method:'POST',body:b,keepalive:true}).catch(function(){})}catch(e){}}
window.addEventListener('error',function(e){reg('ERRO '+(e.message||'')+' '+String(e.filename||'').split('/').pop()+':'+(e.lineno||''))});
window.addEventListener('unhandledrejection',function(e){reg('ERRO promessa '+((e.reason&&e.reason.message)||e.reason))});
window.addEventListener('pagehide',function(){reg('página fechada ou recarregada');regEnvia()});
reg('abriu '+location.pathname+location.search+' · arquivo de '+document.lastModified);
function perfilNome(){return (PERFIS.filter(function(p){return p.id===PERFIL})[0]||PERFIS[0]).nome}
function savePerfis(){try{localStorage.setItem('piano_perfis',JSON.stringify(PERFIS));localStorage.setItem('piano_perfil',PERFIL)}catch(e){}}
/* trocar de perfil recarrega a página: tudo é lido de novo com os dados da outra pessoa */
function usarPerfil(id){if(id===PERFIL||!PERFIS.some(function(p){return p.id===id}))return;if(run)resetAll();PERFIL=id;savePerfis();location.reload()}
function novoPerfil(){var n=(prompt('Nome da pessoa do novo perfil:')||'').trim();if(!n)return;var id='p'+Date.now().toString(36);PERFIS.push({id:id,nome:n.slice(0,30)});PERFIL=id;savePerfis();location.reload()}
function renomearPerfil(){var p=PERFIS.filter(function(x){return x.id===PERFIL})[0],n=(prompt('Novo nome deste perfil:',p.nome)||'').trim();if(!n)return;p.nome=n.slice(0,30);savePerfis();paintPerfil()}
function excluirPerfil(){if(PERFIS.length<2){alert('Precisa ter pelo menos um perfil.');return}
 if(!confirm('Excluir o perfil "'+perfilNome()+'" com todo o histórico, recordes e ajustes dele? Isso não dá para desfazer.'))return;
 var suf='@'+PERFIL,ks=[];for(var i=0;i<localStorage.length;i++){var key=localStorage.key(i);if(PERFIL==='p0'?(/^piano_/.test(key)&&key.indexOf('@')<0&&!/^piano_(users|perfis|perfil)$/.test(key)):key.slice(-suf.length)===suf)ks.push(key)}
 PERFIS=PERFIS.filter(function(x){return x.id!==PERFIL});PERFIL=PERFIS[0].id;savePerfis();
 ks.forEach(RAWDEL);location.reload()}
function paintPerfil(){var s=document.getElementById('perfilSel');if(!s)return;s.innerHTML=PERFIS.map(function(p){return '<option value="'+p.id+'">'+p.nome.replace(/</g,'&lt;')+'</option>'}).join('');s.value=PERFIL;document.title='Treino de piano · '+perfilNome()}
/* ---------- notas ---------- */
var L=['C','D','E','F','G','A','B'],PT=['Dó','Ré','Mi','Fá','Sol','Lá','Si'];
var CHR=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'],CHRP=['Dó','Dó♯','Ré','Mi♭','Mi','Fá','Fá♯','Sol','Lá♭','Lá','Si♭','Si'];
function wm(i){return 12*(Math.floor(i/7)+1)+[0,2,4,5,7,9,11][i%7]}
function mid(n){return wm(n[0])+(n[1]||0)}
function nm(n){var a=n[1]===-1?'♭':n[1]===1?'♯':'';return {en:L[n[0]%7]+a,pt:PT[n[0]%7]+a}}
/* nomes das notas: NOMES = 'en' (C D E) ou 'pt' (Dó Ré Mi), escolhido pelo aluno */
var NOMES='en';try{NOMES=localStorage.getItem('piano_nomes')||'en'}catch(e){}
function nmT(n){var x=nm(n);return NOMES==='pt'?x.pt:x.en}
function chrT(m){return (NOMES==='pt'?CHRP:CHR)[m%12]}
function mname(m){return chrT(m)+(Math.floor(m/12)-1)}
/* textos (títulos e explicações) escritos com Dó Ré Mi: no modo C D E viram letras */
var SOLF={'Dó':'C','Ré':'D','Mi':'E','Fá':'F','Sol':'G','Lá':'A','Si':'B'};
/* música que no app está incompleta em relação ao livro: aviso fixo em cima da descrição (ex.parcial = o que falta) */
function parcialHtml(e){return e&&e.parcial?'<div class="parcial"><b>⚠ Música incompleta.</b> '+e.parcial+'</div>':''}
function tDesc(s){if(NOMES==='pt'||!s)return s;return String(s).replace(/(^|[^A-Za-zÀ-ú])(Dó|Ré|Mi|Fá|Sol|Lá|Si)(?![A-Za-zÀ-ú])/g,function(a,p,w){return p+SOLF[w]})}
/* ev: [dur, notas, dedos, mão]  notas = [[idx,acc],...] ; 'any' = qualquer tecla */
function Q(d,idx,f,h,acc){return [d,[[idx,acc||0]],String(f),h]}
function C(d,notes,f,h){return [d,notes,f,h]}
var ANY='any';
function rhythm(rows){return rows.map(function(m){return m.map(function(d){return [d,ANY,'3','d']})})}
/* ---------- exercícios ---------- */
var EX=[];
function add(o){o.beats=o.beats||4;o.key=o.key||0;EX.push(o);return o}
/* aquecimento */
(function(){var ms=[];for(var s=28;s<=35;s++){ms.push([Q(1,s,1,'d'),Q(1,s+1,2,'d'),Q(1,s+2,3,'d')]);ms.push([C(3,[[s,0],[s+2,0]],'1-3','d')])}
 add({id:'aq_23_md',g:'aq',title:'2as e 3as, mão direita',src:'Livro p. 26 (3-Minute Technique)',bpm:72,beats:3,ms:ms,desc:'Padrão de 3 notas (dedos 1-2-3) e depois a 3ª junta (dedos 1 e 3). O mesmo padrão sobe uma tecla de cada vez: isso se chama sequência. Mão arredondada, ponta firme dos dedos.'})})();
(function(){var ms=[];for(var s=28;s>=21;s--){ms.push([Q(1,s,1,'e'),Q(1,s-1,2,'e'),Q(1,s-2,3,'e')]);ms.push([C(3,[[s-2,0],[s,0]],'3-1','e')])}
 add({id:'aq_23_me',g:'aq',title:'2as e 3as, mão esquerda',src:'Livro p. 26 (3-Minute Technique)',bpm:72,beats:3,ms:ms,desc:'O mesmo padrão descendo, com a mão esquerda: polegar (1) na primeira nota, depois 2 e 3. Desce uma tecla de cada vez.'})})();
add({id:'aq_penta_md',g:'aq',title:'Pentascala de Dó, mão direita',src:'Exercício clássico de 5 dedos',bpm:72,ms:[[Q(1,28,1,'d'),Q(1,29,2,'d'),Q(1,30,3,'d'),Q(1,31,4,'d')],[Q(1,32,5,'d'),Q(1,31,4,'d'),Q(1,30,3,'d'),Q(1,29,2,'d')],[Q(1,28,1,'d'),Q(1,29,2,'d'),Q(1,30,3,'d'),Q(1,31,4,'d')],[Q(1,32,5,'d'),Q(1,31,4,'d'),Q(1,30,3,'d'),Q(1,29,2,'d')],[Q(4,28,1,'d')]],desc:'Dó Ré Mi Fá Sol e volta, um dedo por tecla (1 a 5). Treina dedos independentes e som igual em todas as notas.'});
add({id:'aq_penta_me',g:'aq',title:'Pentascala de Dó, mão esquerda',src:'Exercício clássico de 5 dedos',bpm:72,ms:[[Q(1,21,5,'e'),Q(1,22,4,'e'),Q(1,23,3,'e'),Q(1,24,2,'e')],[Q(1,25,1,'e'),Q(1,24,2,'e'),Q(1,23,3,'e'),Q(1,22,4,'e')],[Q(1,21,5,'e'),Q(1,22,4,'e'),Q(1,23,3,'e'),Q(1,24,2,'e')],[Q(1,25,1,'e'),Q(1,24,2,'e'),Q(1,23,3,'e'),Q(1,22,4,'e')],[Q(4,21,5,'e')]],desc:'Dó Ré Mi Fá Sol (Dó abaixo do Dó central) com a esquerda: mindinho (5) no Dó, polegar (1) no Sol.'});
add({id:'aq_penta_jt',g:'aq',title:'Pentascala, mãos juntas',src:'Exercício clássico de 5 dedos',bpm:60,ms:[[Q(1,28,1,'d'),Q(1,29,2,'d'),Q(1,30,3,'d'),Q(1,31,4,'d')],[Q(1,32,5,'d'),Q(1,31,4,'d'),Q(1,30,3,'d'),Q(1,29,2,'d')],[Q(4,28,1,'d')]].map(function(m,mi){return m.concat(m.map(function(e){return [e[0],[[e[1][0][0]-7,0]],String(6-(+e[2])),'e']}))}),desc:'As duas mãos tocam a mesma nota (uma oitava de distância) ao mesmo tempo. Dedos diferentes: quando a direita usa o 1, a esquerda usa o 5.'});
/* livro */
/* posição explícita no compasso (formato "abs"): para pausas no começo (anacruse) e para mãos que se revezam
   dentro de um compasso em peças de mãos juntas. P(dur, índice, dedo, mão, posição, acidente) */
function P(d,idx,f,h,pos,acc){return [d,[[idx,acc||0]],String(f),h,pos]}
/* conteúdo pessoal (livro e músicas de quem usa o app): conteudo-pessoal.js, fora do repositório. Sem ele o app funciona com os exercícios gerais */
if(window.CONTEUDO_PESSOAL)try{CONTEUDO_PESSOAL();EX.forEach(function(e){var p=window.LIVRO_PARCIAIS&&LIVRO_PARCIAIS[e.id];if(p)e.parcial=p})}catch(e){console.error(e)}
/* ritmo */
add({id:'r_dyn',g:'ritmo',title:'Piano e forte (dinâmica)',src:'Conceito',bpm:72,ms:rhythm([[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1]]),dynm:['p','p','f','f','p','f','mf','mf'],desc:'Qualquer tecla, dedo 3. <b>p</b> (piano) = fraco: o dedo desce devagar, do alto da tecla. <b>f</b> (forte) = forte: deixe o peso do braço cair na ponta do dedo, sem bater. <b>mf</b> = meio-forte, o meio-termo. A nota no tempo certo mas com força errada fica amarela. Ao lado de "Última tecla" aparece a força de cada nota.'});
add({id:'r_colch',g:'ritmo',title:'Colcheias',src:'Conceito',bpm:60,ms:rhythm([[1,1,.5,.5,.5,.5],[.5,.5,.5,.5,2],[1,.5,.5,1,1],[4]]),desc:'Colcheia vale meio tempo. Conte "1 e 2 e 3 e 4 e": a colcheia cai no número ou no "e". Qualquer tecla.'});
add({id:'r_pont',g:'ritmo',title:'Semínima pontuada',src:'Conceito',bpm:60,ms:rhythm([[1.5,.5,1.5,.5],[1,1,2],[1.5,.5,2],[4]]),desc:'O ponto soma metade: 1 + ½ = 1 tempo e meio. Quase sempre vem seguida de uma colcheia. Conte "1 (e) 2 e".'});
add({id:'r_mista',g:'ritmo',title:'Mínima pontuada em 3/4',src:'Conceito',bpm:66,beats:3,ms:rhythm([[1,1,1],[3],[1,2],[2,1],[3]]),desc:'Em 3/4 a mínima pontuada (3 tempos) enche o compasso. Bom para sentir o "UM-dois-três".'});
/* ---------- estado ---------- */
var OPT={cnt:true,hl:true,kb:true,pno:false,clk:true,live:true,outra:true,subir:false,simples:false,ini:true,voz:false,pcmd:false,avisos:true,tut:true,letra:1,trc:true,espT:true,somR:true},MODE='time',SHOW='f',run=false,timers=[],played={},startPerf=0,spb=1,CUR=null,EV=[],TAB='hoje';
/* cada mão conta seus tempos no compasso (mãos juntas); com ex.seq as mãos se revezam e contam no mesmo relógio */
function load_ex(ex){if(run)resetAll();CUR=ex;EV=[];var b=0;ex.ms.forEach(function(me,mi){var pos={};me.forEach(function(ev){var h=ev[3],k=ex.seq?'_':h;pos[k]=pos[k]||0;var notes=ev[1]===ANY?null:ev[1];
  EV.push({dur:ev[0],notes:notes,midis:notes?notes.map(mid):null,f:ev[2],h:h,m:mi,dyn:ex.dynm?ex.dynm[mi]:null,pos:pos[k],beat:b+pos[k],st:null,info:'',got:{},t0:null});pos[k]+=ev[0]});b+=ex.beats});
 EV.sort(function(a,b){return a.beat-b.beat||(a.h==='e'?-1:1)});afterLoad();
 document.getElementById('exTitle').textContent=tDesc(ex.title)+maoTag();document.getElementById('exDesc').innerHTML=parcialHtml(ex)+(ex.src?'<b>'+ex.src+'.</b> ':'')+tDesc(ex.desc);
 document.getElementById('bpm').value=ex.bpm;document.getElementById('bv').textContent=ex.bpm+' BPM';resetAll();showPanel();
 document.getElementById('practice').scrollIntoView({behavior:'smooth',block:'start'})}
/* ---------- partitura ---------- */
var NS='http://www.w3.org/2000/svg';function el(p,t,a,x){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);if(x!=null)e.textContent=x;p.appendChild(e);return e}
var TRE="M44.3,290.1C27.7,284.4 19.0,268.4 25.0,254.6C31.2,239.9 50.0,238.4 56.9,251.9C63.7,265.2 55.2,278.8 40.6,277.9C35.6,277.6 35.5,279.2 40.3,283.2C54.8,295.4 79.7,285.8 82.6,266.7C83.1,263.8 80.4,247.4 76.5,229.5C75.7,225.7 75.0,222.3 75.0,222.0C75.0,221.7 69.2,221.6 62.1,221.8C46.4,222.3 36.6,219.6 24.9,211.6C-2.8,192.6 -7.8,150.4 14.5,124.3C15.1,123.7 16.4,121.9 17.5,120.4C18.6,118.9 25.9,111.2 33.7,103.3L47.8,89.1 L45.8,77.8C44.8,71.6 43.5,64.0 42.9,61.0C39.0,37.9 51.0,3.7 64.3,0.5C69.8,-0.9 76.9,9.9 80.6,25.6C83.3,36.7 83.3,63.8 80.6,72.4C76.1,86.9 68.4,99.8 58.6,109.1C56.5,111.1 56.6,112.2 59.8,128.0L61.6,136.5 L69.5,137.1C98.0,139.3 112.8,156.5 109.9,183.9C109.0,192.5 104.8,201.1 98.2,207.9C93.7,212.6 83.3,219.0 80.2,219.0C78.6,219.0 79.0,226.5 81.0,234.0C82.0,237.8 84.8,251.5 86.1,259.3C87.6,268.2 84.7,275.6 76.6,283.5C68.1,291.7 56.2,294.1 44.3,290.1ZM72.4,216.9C73.3,216.1 71.9,204.7 69.5,195.0C68.8,192.0 67.2,183.9 66.0,177.0C62.5,157.5 62.9,158.5 58.7,158.7C49.7,159.3 41.0,170.4 41.0,181.4C41.0,190.2 43.8,195.3 51.1,199.9C60.3,205.6 58.3,207.2 48.4,201.9C41.4,198.3 36.8,194.1 33.2,188.0C29.1,181.1 29.2,164.8 33.3,157.5C38.2,148.9 47.2,141.1 54.3,139.2C57.3,138.4 57.5,138.1 57.2,134.4C56.6,126.9 53.5,115.5 51.9,115.2C50.0,114.9 32.4,131.8 27.3,139.0C19.4,150.0 13.0,166.4 13.0,175.3C13.0,196.9 30.6,215.2 54.0,218.0C61.1,218.8 71.0,218.2 72.4,216.9ZM83.3,213.9C87.9,211.4 92.5,206.6 95.3,201.5C98.9,194.8 98.5,178.3 94.5,171.1C89.8,162.6 80.1,157.0 69.9,157.0L66.1,157.0 L66.7,160.8C67.0,162.8 67.9,167.7 68.7,171.5C69.5,175.3 70.8,181.9 71.5,186.0C72.3,190.1 73.6,196.7 74.4,200.5C75.2,204.3 76.1,209.2 76.4,211.2C77.1,215.3 79.1,216.1 83.3,213.9ZM57.0,81.2C72.6,64.1 81.9,37.4 76.2,26.0C72.9,19.4 65.8,23.1 57.2,36.0C51.7,44.3 50.0,51.9 50.0,68.6C50.0,88.2 50.3,88.7 57.0,81.2Z",BAS="M0.5,129.2C1.1,128.7 4.0,127.5 7.0,126.5C27.6,120.0 51.3,97.3 61.8,74.0C73.3,48.4 67.4,15.8 49.5,6.2C44.0,3.2 30.5,3.9 24.5,7.4C18.2,11.1 12.3,17.4 11.4,21.2C10.6,25.1 11.1,25.5 16.6,24.1C26.8,21.5 35.2,26.0 36.6,34.8C36.9,36.8 37.2,38.7 37.3,39.0C37.8,42.4 35.5,48.5 32.5,51.4C22.7,61.0 6.7,56.5 4.0,43.3C-0.9,20.0 17.1,0.1 43.1,0.0C67.8,-0.0 83.1,10.6 88.3,31.3C95.2,58.7 78.6,88.9 43.9,112.1C35.5,117.8 22.5,125.0 20.8,125.0C20.3,125.0 17.8,125.9 15.3,127.1C10.4,129.3 -1.3,131.0 0.5,129.2ZM103.6,64.7C96.3,57.4 105.8,46.4 113.4,53.2C117.1,56.6 117.6,60.2 114.8,63.4C111.3,67.3 106.8,67.9 103.6,64.7ZM105.6,27.3C99.8,25.8 98.3,17.3 103.2,13.7C108.9,9.4 116.6,14.4 115.2,21.5C114.5,25.6 109.8,28.3 105.6,27.3Z";
var SCOL={ok:'#3B6D11',warn:'#BA7517',bad:'#E24B4A',miss:'#888780'};
var FLATS=[34,37,33,36,32,35,31],SHARPS=[38,35,39,36,33,37,34];
function keyMap(k){var m={};if(k<0)FLATS.slice(0,-k).forEach(function(i){m[i%7]=-1});if(k>0)SHARPS.slice(0,k).forEach(function(i){m[i%7]=1});return m}
function nextIdx(){var i=-1,mb=1e9;EV.forEach(function(e,j){if(!e.st&&e.beat<mb){mb=e.beat;i=j}});return i}
function curGroup(){var i=nextIdx();if(i<0)return [];var b=EV[i].beat;return EV.filter(function(e){return !e.st&&Math.abs(e.beat-b)<1e-6})}
/* modo Espera sem nenhuma tecla por 5 minutos: para sozinho (senão o app fica "tocando" e o Mac não se atualiza) */
var ESPINI=0;setInterval(function(){if(run&&MODE==='wait'&&Date.now()-Math.max(typeof lastAct!=='undefined'&&lastAct||0,ESPINI)>300000){reg('modo Espera parado: 5 minutos sem tocar');resetAll();show('Parei o modo Espera: 5 minutos sem tocar. Aperte "Começar" para voltar.',true);render()}},30000);
/* Espera no tempo (OPT.espT): um relógio anda no andamento e PARA na próxima nota até você tocá-la; a nota só acende (e só vale) quando o relógio chega nela */
var WT=null,WTI=0;
function wtLigar(){WT={beat:Math.min(0,EV.length?EV[0].beat:0),t:performance.now(),ult:-1};clearInterval(WTI);WTI=setInterval(wtPasso,30)}
function wtPasso(){if(!run||MODE!=='wait'||!OPT.espT||!WT){clearInterval(WTI);WT=null;return}var now=performance.now(),g=curGroup(),lim=g.length?g[0].beat:1e9,sp=60/(+document.getElementById('bpm').value||60);WT.beat=Math.min(lim,WT.beat+(now-WT.t)/1000/sp);WT.t=now;var on=g.length&&WT.beat>=lim-0.25;if(on!==WT.on){WT.on=on;render()}}
/* folga para tocar um pouco antes: até 3/4 de tempo, proporcional à distância da nota anterior (nota rápida = folga menor) */
function wtFolga(g){var gap=g[0].beat-(WT&&WT.ult>=0?WT.ult:g[0].beat-1);return Math.max(0.25,Math.min(0.75,0.75*gap))}
function wtPronto(g){return !OPT.espT||!WT||!g.length||WT.beat>=g[0].beat-wtFolga(g)}
/* nota acesa em azul. Modo espera: a próxima a tocar. Modo com tempo: a nota cuja HORA chegou (pelo relógio da música, não pelo que você já tocou); fica acesa enquanto dura */
function hlGroup(){if(MODE==='wait'&&run){var g0=curGroup();return wtPronto(g0)?g0:[]}if(!ASS&&(MODE!=='time'||!run||!startPerf))return curGroup();var nb=(performance.now()-startPerf)/1000/spb,b=null;
 EV.forEach(function(e){if(e.beat<=nb+0.001&&(b===null||e.beat>b))b=e.beat});if(b===null)return [];
 return EV.filter(function(e){return Math.abs(e.beat-b)<1e-6&&nb<e.beat+e.dur})}
/* compassos por linha: 4 normalmente; menos quando o compasso tem muitas notas (música de verdade, importada) */
/* conta pelo exercício inteiro (base): um trecho mantém as mesmas linhas da partitura inteira */
/* música com cifra: 3 compassos por linha em largura menor, para a nota sair maior (no celular, principalmente) */
function largura(){return CUR&&(CUR.base||CUR).cif?675:900}
function perLine(){return CUR?perTr(CUR.base||CUR):4}
/* compassos por linha como a partitura desenha (com cifra, no máximo 3): o mesmo número vale para "Trecho" (linhas) */
function perTr(src){var p=perFor(src);return src.cif?Math.min(p,3):p}
function perFor(ex){if(ex._perB)return ex._perB;var mx=0;ex.ms.forEach(function(me){var on={},pos={};me.forEach(function(ev){if(ex.abs)on[ev[4]]=1;else{var k=ex.seq?'_':ev[3];pos[k]=pos[k]||0;on[pos[k]]=1;pos[k]+=ev[0]}});mx=Math.max(mx,Object.keys(on).length)});
 return ex._perB=mx<=8?4:mx<=12?3:mx<=20?2:1}
/* quais linhas desenhar: "linhas" = a linha da música e a seguinte (troca sozinha, como no iPhone); "inteira" = todas */
var VISTA='linhas';try{VISTA=localStorage.getItem('piano_vista')||'linhas'}catch(e){}
/* linha da vez: a da 1ª nota ainda não julgada. No modo com tempo, uma nota já julgada mas ainda soando (um acorde
   segurado no fim da linha) segura a linha até acabar; senão a linha sumia do celular antes de a cor dela chegar lá */
function curSys(){var nb=run&&MODE==='time'&&startPerf?(performance.now()-startPerf)/1000/spb:null;
 var e=EV.filter(function(x){return !x.st||(nb!=null&&nb<x.beat+(x.ndur||x.dur)-0.05)})[0]||EV[EV.length-1];return e?Math.floor(e.m/perLine()):0}
function scoreWin(sys){if(VISTA==='inteira'||sys<=2)return [0,sys];var c=Math.max(0,Math.min(curSys(),sys-2));return [c,c+2]}
/* posição da nota dentro do compasso (0 a 1): metade pelo tempo e metade pela ordem, para colcheias e semicolcheias não se amontoarem.
   As pausas também ocupam lugar */
function onsets(m){CUR._ons=CUR._ons||{};var u=CUR._ons[m];if(!u){var o={};allEv().forEach(function(x){if(x.m===m)o[x.pos]=1});restsOf(m).forEach(function(r){if(!r.full)o[r.pos]=1});
 u=CUR._ons[m]=Object.keys(o).map(Number).sort(function(a,b){return a-b})}return u}
function posX(m,pos){var u=onsets(m),k=u.indexOf(pos);if(k<0){k=0;while(k<u.length&&u[k]<pos)k++}return 0.5*pos/CUR.beats+0.5*(u.length>1?k/u.length:0)}
function noteX(e){return posX(e.m,e.pos)}
/* pausas: os pedaços do compasso em que uma mão não toca nada. Mão que não aparece no exercício inteiro não ganha pausas.
   Compasso vazio = pausa de semibreve no meio; o resto é dividido em figuras que começam no lugar certo do tempo */
/* clave de Sol na mão esquerda (como no papel quando a esquerda sobe): só em música importada, no compasso em que todas as notas da esquerda
   estão do Lá abaixo do Dó central para cima e a média fica do Mi central para cima */
function lhG(m){if(!CUR||!CUR.abs)return false;CUR._lhg=CUR._lhg||{};if(m in CUR._lhg)return CUR._lhg[m];var ix=[];allEv().forEach(function(e){if(e.m===m&&e.h==='e'&&e.notes)e.notes.forEach(function(n){ix.push(n[0])})});
 return CUR._lhg[m]=ix.length>0&&Math.min.apply(null,ix)>=26&&ix.reduce(function(a,b){return a+b},0)/ix.length>=30}
var RV=[4,2,1,0.5,0.25];
function restsOf(m){CUR._rst=CUR._rst||{};if(CUR._rst[m])return CUR._rst[m];var out=[],B=CUR.beats,ev=allEv();
 if(!CUR._hands){CUR._hands={};ev.forEach(function(x){CUR._hands[x.h]=1})}
 ['d','e'].forEach(function(h){if(!CUR._hands[h])return;
  var iv=ev.filter(function(x){return x.m===m&&x.h===h}).map(function(x){return [x.pos,x.pos+(x.ndur||x.dur)]}).sort(function(a,b){return a[0]-b[0]});
  if(!iv.length){out.push({h:h,pos:0,v:B,full:true});return}
  var cur=0,gaps=[];iv.forEach(function(r){if(r[0]>cur+1e-6)gaps.push([cur,r[0]]);cur=Math.max(cur,r[1])});if(cur<B-1e-6)gaps.push([cur,B]);
  gaps.forEach(function(g){var p=g[0];while(g[1]-p>1e-6){var rem=g[1]-p,v=RV.filter(function(v){return v<=rem+1e-6&&Math.abs(p/v-Math.round(p/v))<1e-6})[0];if(!v)break;out.push({h:h,pos:p,v:v});p+=v}})});
 return CUR._rst[m]=out}
function drawRest(P,x,yc,v,col){var st='fill:'+col,sk=function(w){return 'fill:none;stroke:'+col+';stroke-width:'+w+';stroke-linecap:round;stroke-linejoin:round'};
 if(v>=4)el(P,'rect',{x:x-7,y:yc-12,width:14,height:6,style:st});/* semibreve: pendurada na 4ª linha */
 else if(v>=2)el(P,'rect',{x:x-7,y:yc-6,width:14,height:6,style:st});/* mínima: sentada na linha do meio */
 else if(v>=1)el(P,'path',{d:'M'+(x-3)+' '+(yc-16)+' l7 8 l-6 6 l7 8 q-9 -3 -4 9',style:sk(2.6)});/* semínima */
 else{el(P,'circle',{cx:x-3,cy:yc-6,r:2.8,style:st});el(P,'path',{d:'M'+(x-3)+' '+(yc-4)+' q5 1 8 -5 l-6 20',style:sk(1.6)});/* colcheia */
  if(v<=0.25){el(P,'circle',{cx:x-5,cy:yc+1,r:2.8,style:st});el(P,'path',{d:'M'+(x-5)+' '+(yc+3)+' q5 1 8 -5',style:sk(1.6)})}}}/* semicolcheia */
/* barras: colcheias e semicolcheias seguidas, da mesma mão, dentro do mesmo tempo e sem pausa entre elas */
function beamGroups(list){var gs=[],g=[];
 list.forEach(function(e){var D=e.ndur||e.dur,L=g[g.length-1],cont=L&&Math.abs(L.pos+(L.ndur||L.dur)-e.pos)<1e-6&&Math.floor(g[0].pos+1e-6)===Math.floor(e.pos+1e-6)&&!!g[0].x===!!e.x;
  if(D<1&&(!L||cont))g.push(e);else{if(g.length>1)gs.push(g);g=D<1?[e]:[]}});
 if(g.length>1)gs.push(g);return gs}
/* desenha a partitura. Sem argumentos: no #score da tela. drawScore(svg,true): a partitura inteira num svg à parte (para o iPhone) */
function drawScore(target,full){var s=target||document.getElementById('score');s.innerHTML='';if(!CUR)return;var INK=getComputedStyle(document.body).getPropertyValue('--ink').trim()||'#1f1f1d';
 var nm_=CUR.ms.length,per=perLine(),sys=Math.ceil(nm_/per),win=full?[0,sys]:scoreWin(sys);var LG=largura();s.setAttribute('viewBox','0 '+(win[0]*230)+' '+LG+' '+((win[1]-win[0])*230+10));
 if(!target)zoomUi(sys);
 var km=keyMap(CUR.key),ksw=Math.abs(CUR.key)*12,x0=70+ksw,mw=(LG-10-x0)/per,grp=hlGroup(),SV=s,ALL=allEv();
 ALL.forEach(function(e){e._sy=null;e._bm=null});
 /* cada linha (sistema) num <g data-sy>: o iPhone troca só as linhas que mudaram na partitura inteira que ele guarda */
 for(var sy=win[0];sy<win[1];sy++){var tt=40+sy*230,bt=tt+84;s=el(SV,'g',{'data-sy':String(sy)});
  for(var l=0;l<5;l++){el(s,'line',{x1:12,x2:LG-10,y1:tt+l*12,y2:tt+l*12,style:'stroke:'+INK});el(s,'line',{x1:12,x2:LG-10,y1:bt+l*12,y2:bt+l*12,style:'stroke:'+INK})}
  el(s,'line',{x1:12,x2:12,y1:tt,y2:bt+48,style:'stroke:'+INK+';stroke-width:1.5'});
  el(s,'path',{d:TRE,transform:'translate(8,'+(tt-20)+') scale(0.301)',style:'fill:'+INK+';fill-rule:evenodd'});
  /* linha que começa com a esquerda na clave de Sol: a pauta de baixo já começa com clave de Sol (e a armadura no lugar dela) */
  var lg0=lhG(sy*per);el(s,'path',lg0?{d:TRE,transform:'translate(8,'+(bt-20)+') scale(0.301)',style:'fill:'+INK+';fill-rule:evenodd'}:{d:BAS,transform:'translate(8,'+bt+') scale(0.292)',style:'fill:'+INK+';fill-rule:evenodd'});
  var ks=CUR.key<0?FLATS:SHARPS,sym=CUR.key<0?'♭':'♯';for(var q=0;q<Math.abs(CUR.key);q++){var it=ks[q];el(s,'text',{x:50+q*12,y:tt+(38-it)*6+6,style:'font-size:22px;fill:'+INK},sym);el(s,'text',{x:50+q*12,y:lg0?bt+(38-it)*6+6:bt+(26-(it-14))*6+6,style:'font-size:22px;fill:'+INK},sym)}
  if(sy===0){[tt,bt].forEach(function(y){el(s,'text',{x:x0-12,y:y+23,'text-anchor':'middle',style:'font-size:24px;font-weight:700;fill:'+INK},String(CUR.beats));el(s,'text',{x:x0-12,y:y+47,'text-anchor':'middle',style:'font-size:24px;font-weight:700;fill:'+INK},'4')})}
  el(s,'text',{x:14,y:tt-18,style:'font-size:12px;fill:#888780'},String(CUR.mmap?CUR.mmap[sy*per]:sy*per+1));
  for(var mi=0;mi<per&&sy*per+mi<nm_;mi++){var bx=x0+(mi+1)*mw,last=sy*per+mi===nm_-1;el(s,'line',{x1:bx,x2:bx,y1:tt,y2:bt+48,style:'stroke:'+INK+';stroke-width:'+(last?4:1)})}
  selFundo(s,sy,per,nm_,x0,mw,tt,bt);
  for(mi=0;mi<per&&sy*per+mi<nm_;mi++){var mm=sy*per+mi,g1=lhG(mm),g0=mi>0?lhG(mm-1):false,cx=x0+mi*mw+(mi?3:-30);
   if(mi>0&&g1!==g0){if(g1)el(s,'path',{d:TRE,transform:'translate('+cx+','+(bt-14)+') scale('+(mi?0.22:0.301)+')',style:'fill:'+INK+';fill-rule:evenodd'});
    else if(mi>0)el(s,'path',{d:BAS,transform:'translate('+cx+','+(bt+2)+') scale(0.2)',style:'fill:'+INK+';fill-rule:evenodd'})}}
  /* dinâmica marcada (p, mf, f…): entre as pautas, no começo do compasso em que muda */
  if(CUR.dynm)for(mi=0;mi<per&&sy*per+mi<nm_;mi++){var dm=sy*per+mi,dv=CUR.dynm[dm];if(dv&&(mi===0||CUR.dynm[dm-1]!==dv))el(s,'text',{x:x0+mi*mw+10,y:tt+70,style:'font-size:17px;font-style:italic;font-weight:700;font-family:Georgia,serif;fill:'+INK},dv)}
  /* cifra (ex.cif = [[compasso, tempo, 'C'], ...]): os acordes em cima da pauta */
  if(CUR.cif)CUR.cif.forEach(function(c){if(c[0]<sy*per||c[0]>=(sy+1)*per)return;el(s,'text',{x:x0+(c[0]%per)*mw+26+posX(c[0],c[1])*(mw-38),y:tt-26,'text-anchor':'middle',style:'font-size:17px;font-weight:700;fill:'+INK},c[2])});
  /* pausas (cinza-escuro, na cor da tinta) */
  for(mi=0;mi<per&&sy*per+mi<nm_;mi++)restsOf(sy*per+mi).forEach(function(r){var m=sy*per+mi,x=r.full?x0+mi*mw+mw/2:Math.round((x0+mi*mw+26+posX(m,r.pos)*(mw-38))*10)/10;
   drawRest(s,x,(r.h==='d'?tt:bt)+24,r.v,INK)});
  var SE=ALL.filter(function(e){return Math.floor(e.m/per)===sy}),BG=[];
  for(mi=0;mi<per;mi++)['d','e'].forEach(function(h){var L=SE.filter(function(e){return e.m===sy*per+mi&&e.h===h}).sort(function(a,b){return a.pos-b.pos});
   beamGroups(L).forEach(function(g){BG.push(g);g.forEach(function(e){e._bm=g})})});
  /* a mão que você não está treinando fica apagada (cinza claro) e sem números */
  SE.forEach(function(e){var mi=e.m%per,x=Math.round((x0+mi*mw+26+noteX(e)*(mw-38))*10)/10,tre=e.h==='d',P=e.x?el(s,'g',{opacity:'0.28'}):s,D=e.ndur||e.dur;
   var GC=tre||lhG(e.m),T0=tre?tt:bt,isNext=!e.x&&OPT.hl&&run&&grp.indexOf(e)>=0,col=(e.st&&liveFb())?SCOL[e.st]:(isNext?'#185FA5':INK);
   if(isNext)el(P,'rect',{x:x-16,y:tt-10,width:32,height:bt+58-tt,rx:6,style:'fill:#B5D4F4;opacity:0.45'});
   var notes=e.notes||[[GC?32:22,0]],ys=[];
   notes.forEach(function(n){var i=n[0],y=GC?T0+(38-i)*6:T0+(26-i)*6;ys.push(y);
    var lg=[];if(GC){for(var l=28;l>=i;l-=2)lg.push(l);for(var l=40;l<=i;l+=2)lg.push(l)}else{for(var l=16;l>=i;l-=2)lg.push(l);for(var l=28;l<=i;l+=2)lg.push(l)}
    lg.forEach(function(l){var yy=GC?T0+(38-l)*6:T0+(26-l)*6;el(P,'line',{x1:x-12,x2:x+12,y1:yy,y2:yy,style:'stroke:'+INK})});
    var ka=km[i%7]||0;if((n[1]||0)!==ka&&!(e.tcd))el(P,'text',{x:x-22,y:y+6,'text-anchor':'middle',style:'font-size:18px;fill:'+col},n[1]===1?'♯':n[1]===-1?'♭':'♮');
    var open=D>=2;
    if(!e.notes){el(P,'rect',{x:x-6,y:y-5,width:12,height:10,rx:2,style:'fill:'+(open?'none':col)+';stroke:'+col+';stroke-width:2'})}
    else el(P,'ellipse',{cx:x,cy:y,rx:7.5,ry:5.5,transform:'rotate(-20 '+x+' '+y+')',style:'fill:'+(open?'none':col)+';stroke:'+col+';stroke-width:'+(open?2.2:1)});
    if(D===3||D===1.5||D===0.75)el(P,'circle',{cx:x+13,cy:y-2,r:2.4,style:'fill:'+col})});
   var top=Math.min.apply(null,ys),bot=Math.max.apply(null,ys),avg=notes.reduce(function(a,n){return a+n[0]},0)/notes.length,up=GC?avg<34:avg<22;
   e._sy=sy;e._x=x;e._ys=ys;e._top=top;e._bot=bot;e._col=col;e._P=P;e._up=up;
   if(D<4&&!e._bm){
    if(up){el(P,'line',{x1:x+6.5,x2:x+6.5,y1:bot-2,y2:top-36,style:'stroke:'+col+';stroke-width:1.4'});if(D<1)el(P,'path',{d:'M'+(x+6.5)+' '+(top-36)+' q 10 10 6 22',style:'fill:none;stroke:'+col+';stroke-width:2'});if(D<=0.25)el(P,'path',{d:'M'+(x+6.5)+' '+(top-28)+' q 10 10 6 22',style:'fill:none;stroke:'+col+';stroke-width:2'})}
    else{el(P,'line',{x1:x-6.5,x2:x-6.5,y1:top+2,y2:bot+36,style:'stroke:'+col+';stroke-width:1.4'});if(D<1)el(P,'path',{d:'M'+(x-6.5)+' '+(bot+36)+' q 10 -10 6 -22',style:'fill:none;stroke:'+col+';stroke-width:2'});if(D<=0.25)el(P,'path',{d:'M'+(x-6.5)+' '+(bot+28)+' q 10 -10 6 -22',style:'fill:none;stroke:'+col+';stroke-width:2'})}}
   if(e.x||e.tcd||SHOW==='x'||CUR.leit)return;
   /* dedos, nomes ou contagem: acima da pauta de cima (mão direita) e abaixo da de baixo (esquerda); nunca em cima de nota alta ou baixa.
      Acorde: um número por nota, empilhados (o de cima é o da nota mais aguda). Dedos sugeridos pelo app ficam em itálico */
   var lines=[];
   if(SHOW==='f'&&e.f){var fs=String(e.f).split('-');if(e.notes&&fs.length===e.notes.length&&fs.length>1)lines=e.notes.map(function(n,i){return [n[0],fs[i]]}).filter(function(p){return p[1]}).sort(function(a,b){return b[0]-a[0]}).map(function(p){return p[1]});else lines=[e.f]}
   if(SHOW==='n'&&e.notes)lines=e.notes.slice().sort(function(a,b){return b[0]-a[0]}).map(function(n){return nmT(n)});
   if(SHOW==='c')lines=[cntLab(e.pos,D)];
   if(!lines.length)return;
   var gap=11,fsz=mw<200?10:SHOW==='f'?12:11,st='font-size:'+fsz+'px;fill:'+col+(SHOW==='f'?';font-weight:500':'')+(SHOW==='f'&&e.fa?';font-style:italic':'');
   if(tre){var y0=Math.min(tt-12,(up?top-40:top-12));y0=Math.max(y0,tt-34+(lines.length-1)*gap);lines.forEach(function(t,i){el(s,'text',{x:x,y:y0-(lines.length-1-i)*gap,'text-anchor':'middle',style:st},t)})}
   else{var y1=Math.max(bt+72,(up?bot+18:bot+48));lines.forEach(function(t,i){el(s,'text',{x:x,y:y1+i*gap,'text-anchor':'middle',style:st},t)})}});
  /* barras: haste de todas as notas do grupo até uma barra comum, um pouco inclinada; semicolcheias ganham a 2ª barra */
  BG.forEach(function(g){var tre=g[0].h==='d'||lhG(g[0].m),sum=0,n=0;g.forEach(function(e){(e.notes||[[tre?32:22]]).forEach(function(q){sum+=q[0];n++})});var up=tre?sum/n<34:sum/n<22,dx=up?6.5:-6.5;
   var a=g[0],b=g[g.length-1],xa=a._x+dx,xb=b._x+dx,ya=up?a._top-32:a._bot+32,yb=up?b._top-32:b._bot+32,sl=Math.max(-10,Math.min(10,yb-ya));
   function Y(x){return xb===xa?ya:ya+sl*(x-xa)/(xb-xa)}
   var adj=0;g.forEach(function(e){var y=Y(e._x+dx);adj=up?Math.min(adj,e._top-26-y):Math.max(adj,e._bot+26-y)});
   function Yb(x){return Y(x)+adj}
   g.forEach(function(e){e._up=up});var P=a.x?el(s,'g',{opacity:'0.28'}):s,th=up?5:-5;
   g.forEach(function(e){var x=e._x+dx;el(P,'line',{x1:x,x2:x,y1:up?e._bot-2:e._top+2,y2:Yb(x),style:'stroke:'+e._col+';stroke-width:1.4'})});
   el(P,'path',{d:'M'+xa+' '+Yb(xa)+' L'+xb+' '+Yb(xb)+' L'+xb+' '+(Yb(xb)+th)+' L'+xa+' '+(Yb(xa)+th)+' Z',style:'fill:'+INK});
   if(g.some(eTri))el(P,'text',{x:(xa+xb)/2,y:up?Math.min(Yb(xa),Yb(xb))-6:Math.max(Yb(xa),Yb(xb))+16,'text-anchor':'middle',style:'font-size:13px;font-style:italic;font-weight:600;fill:'+INK},'3');
   var o2=up?8:-8;g.forEach(function(e,i){if((e.ndur||e.dur)>0.25)return;var nx=g[i+1],pv=g[i-1],x=e._x+dx,x2;
    if(nx&&(nx.ndur||nx.dur)<=0.25)x2=nx._x+dx;else if(pv&&(pv.ndur||pv.dur)<=0.25)return;else x2=pv?x-9:x+9;
    el(P,'path',{d:'M'+x+' '+(Yb(x)+o2)+' L'+x2+' '+(Yb(x2)+o2)+' L'+x2+' '+(Yb(x2)+o2+th)+' L'+x+' '+(Yb(x)+o2+th)+' Z',style:'fill:'+INK})})});
  /* ligaduras de valor: arco da nota até a continuação; se a continuação está na linha seguinte, o arco vai até o fim da linha e recomeça no início da outra */
  function arc(x1,x2,y,below){var sg=below?1:-1;if(x2-x1<14){var mx=(x1+x2)/2;x1=Math.min(x1,mx-7)-4;x2=Math.max(x2,mx+7)+4}el(s,'path',{d:'M'+x1+' '+(y+sg*6)+' Q'+((x1+x2)/2)+' '+(y+sg*15)+' '+x2+' '+(y+sg*6),style:'fill:none;stroke:'+INK+';stroke-width:1.5'})}
  SE.forEach(function(q){if(!q.tl)return;q.tl.forEach(function(L){var p=L[1],y=q._ys[L[0]];if(y==null)return;
   if(p._sy===sy&&p._ys)arc(p._x+9,q._x-9,p._ys[L[2]],p._up);else arc(x0-14,q._x-9,y,q._up)})});
  SE.forEach(function(p){if(!p.tnext)return;p.tnext.forEach(function(L){var q=L[1];if(Math.floor(q.m/per)!==sy&&p._ys)arc(p._x+9,888,p._ys[L[0]],p._up)})});selTopo(s,sy,per,nm_,x0,mw,tt,bt)}}
/* ---------- teclado ---------- */
function isB(m){return [1,3,6,8,10].indexOf(m%12)>=0}
function drawKb(){var s=document.getElementById('kb');s.style.display=OPT.kb?'':'none';s.innerHTML='';if(!OPT.kb)return;
 var lo=60,hi=72;allEv().forEach(function(e){if(e.midis)e.midis.forEach(function(m){lo=Math.min(lo,m);hi=Math.max(hi,m)})});lo-=2;hi+=2;while(isB(lo))lo--;while(isB(hi))hi++;
 var wc=0;for(var m=lo;m<=hi;m++)if(!isB(m))wc++;var kw=900/wc,x=0,pos={};var nx={};hlGroup().forEach(function(e){if(e.midis&&OPT.hl&&run)e.midis.forEach(function(m){if(!e.got[m])nx[m]=1})});
 for(var m=lo;m<=hi;m++){if(!isB(m)){pos[m]=x;x+=kw}else pos[m]=x-kw*0.3}
 for(var m=lo;m<=hi;m++){if(isB(m))continue;var p=played[m],fill=p?(!liveFb()?'#C9C7BE':p==='bad'?'#F09595':'#97C459'):(nx[m]?'#85B7EB':'#ffffff');
  el(s,'rect',{x:pos[m],y:2,width:kw,height:140,rx:3,style:'fill:'+fill+';stroke:#888780'});
  el(s,'text',{x:pos[m]+kw/2,y:132,'text-anchor':'middle',style:'font-size:'+(kw>30?12:10)+'px;fill:#444441'},chrT(m)+(m===60?'•':''))}
 for(var m=lo;m<=hi;m++){if(!isB(m))continue;var p=played[m];el(s,'rect',{x:pos[m],y:2,width:kw*0.6,height:84,rx:2,style:'fill:'+(p?(!liveFb()?'#5F5E5A':p==='bad'?'#E24B4A':'#639922'):(nx[m]?'#378ADD':'#2C2C2A'))})}}
function render(){try{selPinta()}catch(e){}try{goPinta()}catch(e){}var fall=VIS==='fall';document.getElementById('score').style.display=fall?'none':'';document.getElementById('fallCv').style.display=fall?'block':'none';
 if(fall){zoomUi(0);fallStart()}else drawScore();drawKb();if(fall)document.getElementById('kb').style.display='none';var er=[];EV.forEach(function(e){if(e.info&&liveFb())er.push('<span style="color:'+(SCOL[e.st]||'inherit')+'">Compasso '+mnum(e)+', tempo '+(Math.floor(e.pos)+1)+(e.pos%1?' e':'')+': '+e.info+'</span>')});document.getElementById('errs').innerHTML=er.join(' · ')}
/* ---------- áudio ---------- */
var AC=null,BUF={},LD={},GP=null,GA=null,GR=null,GC=null,GL=null,UG=null,COMP=null,base='https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/acoustic_grand_piano-mp3/';
function ctx(){if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();COMP=AC.createDynamicsCompressor();COMP.threshold.value=-10;COMP.knee.value=6;COMP.ratio.value=8;COMP.attack.value=0.003;COMP.release.value=0.2;COMP.connect(AC.destination);
 GP=AC.createGain();GP.connect(COMP);GP.gain.value=OPT.pno?1.5:0;GC=AC.createGain();GC.connect(COMP);GC.gain.value=OPT.clk?(+document.getElementById('clkVol').value)/100:0;
 GL=AC.createGain();GL.connect(COMP);GL.gain.value=(+document.getElementById('liveVol').value)/100;UG=AC.createGain();UG.connect(COMP);UG.gain.value=(+document.getElementById('usbVol').value)/100;GA=AC.createGain();GA.connect(COMP);GA.gain.value=OPT.outra?1.2:0;GR=AC.createGain();var LIMR=AC.createDynamicsCompressor();LIMR.threshold.value=-2;LIMR.knee.value=0;LIMR.ratio.value=20;LIMR.attack.value=0.002;LIMR.release.value=0.1;GR.connect(LIMR);LIMR.connect(AC.destination);GR.gain.value=recF()}
 if(AC.state==='suspended')AC.resume();return AC}
function fnm(m){return['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'][m%12]+(Math.floor(m/12)-1)}
function load(m){if(BUF[m])return Promise.resolve(BUF[m]);if(LD[m])return LD[m];/* primeiro da pasta sons/ do Mac (sem internet, mais rápido); se faltar, da internet */
 LD[m]=(/^https?:/.test(location.protocol)?fetch('sons/'+fnm(m)+'.mp3').then(function(r){if(!r.ok)throw 0;return r}):Promise.reject()).catch(function(){return fetch(base+fnm(m)+'.mp3')}).then(function(r){if(!r.ok)throw 0;return r.arrayBuffer()}).then(function(a){return new Promise(function(res,rej){ctx().decodeAudioData(a,res,rej)})}).then(function(b){BUF[m]=b;OFS[m]=onset(b);return b}).catch(function(){document.getElementById('snd').textContent='Sem internet para as amostras de piano: o som guia fica sintetizado.';return null});return LD[m]}
/* OFS[m] = segundos de silêncio no começo da amostra (se houver); a reprodução pula esse trecho para o som
   sair exatamente na hora marcada. Nas amostras atuais é ~0–2 ms, mas protege contra amostras com silêncio */
var OFS={};
function onset(b){var d=b.getChannelData(0),pk=0,i;for(i=0;i<d.length;i++)pk=Math.max(pk,Math.abs(d[i]));
 for(i=0;i<d.length;i++)if(Math.abs(d[i])>pk*0.05)break;return Math.max(0,i/b.sampleRate-0.002)}
/* sons agendados (guia e cliques): guardados para cortar todos ao apertar "Parar" */
var SCHED=[];
function sched(s,g,t,end){SCHED.push({s:s,g:g,t:t,end:end});var now=ctx().currentTime;SCHED=SCHED.filter(function(x){return x.end>now})}
function stopSched(){midiStop();if(!AC){SCHED=[];return}var now=AC.currentTime;SCHED.forEach(function(x){try{if(x.t>now){x.s.stop(0);x.g.disconnect()}else{x.g.gain.cancelScheduledValues(now);x.g.gain.setTargetAtTime(0,now,0.02);x.s.stop(now+0.15)}}catch(e){}});SCHED=[]}
/* ---------- guia e cliques saindo pelo próprio piano (MIDI pelo USB) ----------
   Fila com "olhar adiante" de 120 ms: as notas só são enviadas pouco antes da hora, então "Parar" corta na hora.
   Guia no canal 2; cliques no canal 10 (bateria: bloco de madeira, 76 forte / 77 fraco). As teclas do piano chegam no canal 1. */
var MOUT=null,MQ=[],MON={};
function viaPiano(){return document.getElementById('outdev').value==='piano'&&MOUT}
function mq(t,kind,ch,note,vel,dur){var p=soundPerf(ctx(),t);vel=Math.max(1,Math.min(127,Math.round(vel)));
 MQ.push({p:p,k:kind,d:[0x90|ch,note,vel]});MQ.push({p:p+dur*1000,k:'off',d:[0x80|ch,note,0]})}
function midiTick(){if(ASS)assTick();if(!MQ.length||!MOUT)return;var now=performance.now(),keep=[];
 MQ.forEach(function(x){if(x.p>now+(MOUT.remoto?800:120)){keep.push(x);return}/* pelo iPhone: manda 800 ms antes (engasgos do Wi-Fi de até 0,8 s não fazem o guia sumir) (o Wi-Fi no meio) */
  if((x.k==='pno'&&!OPT.pno)||(x.k==='acc'&&!OPT.outra)||(x.k==='clk'&&!OPT.clk))return;
  try{MOUT.send(x.d,Math.max(x.p,now));if(x.k==='off')delete MON[(x.d[0]&0x0f)+'_'+x.d[1]];else MON[(x.d[0]&0x0f)+'_'+x.d[1]]=x.d}catch(e){}});MQ=keep}
function midiStop(){MQ=[];if(!MOUT)return;try{Object.keys(MON).forEach(function(k){var d=MON[k];MOUT.send([0x80|(d[0]&0x0f),d[1],0])});[1,2,9].forEach(function(ch){MOUT.send([0xB0|ch,123,0])})}catch(e){}MON={}}
/* acc = a outra mão (quando treina uma mão só): sai pelo GA, que liga e desliga com "O app toca a outra mão" */
/* gravação ('rec'): v = força da tecla (0 a 1). No piano sai com a força original (o volume vai no CC7 do canal 3);
   no Mac usa a mesma curva do piano sampleado (liveOn), para soar como quando você tocou */
function tone(m,t,d,v,acc){if(!acc&&somAtivo())return;/* notas pelo som: o guia sairia no alto-falante e o microfone acharia que foi você */
if(viaPiano()){mq(t,acc==='rec'?'rec':acc?'acc':'pno',acc==='rec'?2:1,m,acc==='rec'?127*Math.min(1,v):v*110,d);return}if(acc==='rec')v=Math.pow(Math.min(1,v),1.5)*1.2+0.05;var c=ctx(),g=c.createGain();g.connect(acc==='rec'?GR:acc?GA:GP);
 if(BUF[m]){var s=c.createBufferSource();s.buffer=BUF[m];s.connect(g);g.gain.setValueAtTime(v,t);g.gain.setTargetAtTime(0,t+d,0.1);s.start(t,OFS[m]||0);s.stop(t+d+1);sched(s,g,t,t+d+1)}
 else{var f=440*Math.pow(2,(m-69)/12),o=c.createOscillator();o.type='triangle';o.frequency.value=f;o.connect(g);g.gain.setValueAtTime(v*0.5,t);g.gain.setTargetAtTime(0,t+d,0.1);o.start(t);o.stop(t+d+0.6);sched(o,g,t,t+d+0.6)}}
function clickPiano(){return document.getElementById('clkdev').value==='piano'&&MOUT}
/* volume do que sai no piano: CC7 (volume do canal) muda na hora, mesmo tocando; não mexe no volume das suas teclas */
function pianoVols(){if(!MOUT)return;try{MOUT.send([0xB2,7,Math.round(127*Math.min(1,recF()))]);MOUT.send([0xB1,7,Math.round(1.27*document.getElementById('pnoVol').value)]);MOUT.send([0xB9,7,Math.round(1.27*document.getElementById('pclkVol').value)])}catch(e){}}
function drumKit(){try{MOUT.send([0xB9,0,127]);MOUT.send([0xB9,32,0]);MOUT.send([0xC9,0])}catch(e){}}/* canal 10 = kit de bateria */
/* sons da bateria do piano (canal 10): [tempo 1, outros tempos] */
var CLKS={metro:[33,33],wood:[76,77],claves:[75,75],stick:[37,37]};
function click(t,a,teste){if(clickPiano()){var ks=CLKS[document.getElementById('clksnd').value]||CLKS.metro;mq(t,teste?'clkt':'clk',9,a?ks[0]:ks[1],a?120:80,0.08);return}var c=ctx(),o=c.createOscillator(),g=c.createGain();o.frequency.value=a?1500:1000;o.connect(g);g.connect(GC);g.gain.setValueAtTime(a?0.3:0.15,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.05);o.start(t);o.stop(t+0.06);sched(o,g,t,t+0.06)}
/* relógios num Worker: com a janela do Chrome escondida (olhando o iPhone) o Chrome atrasa o setTimeout da página
   em até 1 s; o do Worker não. Ids negativos = Worker */
var TW=null,TWF={},TWN=0,TWN0=0;
try{TW=new Worker(URL.createObjectURL(new Blob(['var T={};onmessage=function(e){var d=e.data;if(d[0]==="s")T[d[1]]=setTimeout(function(){delete T[d[1]];postMessage(d[1])},d[2]);else if(d[0]==="i")setInterval(function(){postMessage("tick")},d[1]);else{clearTimeout(T[d[1]]);delete T[d[1]]}}'],{type:'text/javascript'})));
 TW.onmessage=function(e){if(e.data==="tick"){midiTick();if(++TWN0%500===0&&window.CEL_BEAT)window.CEL_BEAT();return}var f=TWF[e.data];delete TWF[e.data];if(f)f()};TW.postMessage(["i",20])}catch(e){TW=null}
if(!TW){setInterval(midiTick,20);setInterval(function(){if(window.CEL_BEAT)window.CEL_BEAT()},10000)}
function at(tt,f){var ms=Math.max(0,(tt-ctx().currentTime)*1000);if(!TW){timers.push(setTimeout(f,ms));return}var id=++TWN;TWF[id]=f;TW.postMessage(['s',id,ms]);timers.push(-id)}
function clearAt(id){if(id<0){delete TWF[-id];TW.postMessage(['c',-id])}else clearTimeout(id)}
/* piano sampleado (ouvir no fone) */
var LIVE=false,VO={},SUS=false,SUSTAINED={};
function liveOn(m,vel){if(!LIVE)return;var c=ctx();if(!BUF[m]){load(m);return}liveOff(m,true);var s=c.createBufferSource(),g=c.createGain();s.buffer=BUF[m];s.connect(g);g.connect(GL);
 var v=Math.pow(vel/127,1.5)*1.2+0.05;g.gain.setValueAtTime(v,c.currentTime);s.start(0,OFS[m]||0);VO[m]={s:s,g:g};delete SUSTAINED[m]}
function liveOff(m,now){var v=VO[m];if(!v)return;if(SUS&&!now){SUSTAINED[m]=v;delete VO[m];return}var c=ctx();v.g.gain.setTargetAtTime(0,c.currentTime,now?0.02:0.12);v.s.stop(c.currentTime+1);delete VO[m]}
function pedal(on){SUS=on;if(!on){var c=ctx();Object.keys(SUSTAINED).forEach(function(k){var v=SUSTAINED[k];v.g.gain.setTargetAtTime(0,c.currentTime,0.15);v.s.stop(c.currentTime+1.2)});SUSTAINED={}}}
/* som real do Yamaha pela USB: só aceita a entrada do Yamaha */
var USB=false,USTREAM=null,USRC=null,YRE=/yamaha|p-?series|p-?22|digital piano|\(0499:/i;/* no Mac o P-225 aparece como "P-Series" (0499 = código USB da Yamaha) */
function stopUsb(){if(USTREAM)USTREAM.getTracks().forEach(function(t){t.stop()});if(USRC)USRC.disconnect();USTREAM=null;USRC=null}
function startUsb(){var st=document.getElementById('audStat');function fail(msg){USB=false;paintAudio();stopUsb();st.textContent=msg}
 if(!navigator.mediaDevices){fail('Esta página não tem acesso a áudio de entrada. Abra pelo localhost (veja as instruções do Claude).');return}
 navigator.mediaDevices.enumerateDevices().then(function(ds){var named=ds.some(function(d){return d.kind==='audioinput'&&d.label});
  return (named?Promise.resolve():navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){s.getTracks().forEach(function(t){t.stop()})})).then(function(){return navigator.mediaDevices.enumerateDevices()})})
 .then(function(ds){var y=ds.filter(function(d){return d.kind==='audioinput'&&YRE.test(d.label)})[0];
  if(!y){var ins=ds.filter(function(d){return d.kind==='audioinput'}).map(function(d){return d.label||'(sem nome)'});fail('O Mac não mostra o Yamaha como entrada de áudio. Entradas encontradas: '+(ins.join(', ')||'nenhuma')+'. Não vou usar outro microfone (como o do fone). Use o "Piano sampleado".');return}
  return navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:y.deviceId},echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:2}}).then(function(s){
   var lbl=s.getAudioTracks()[0].label;if(!YRE.test(lbl)){s.getTracks().forEach(function(t){t.stop()});fail('A entrada aberta não era o Yamaha. Desliguei por segurança.');return}
   USTREAM=s;ctx();USRC=AC.createMediaStreamSource(s);USRC.connect(UG);st.textContent='Ouvindo o som real do '+lbl})})
 .catch(function(e){fail('O Chrome ou o Mac bloqueou o áudio de entrada ('+e.name+'). Ajustes do Sistema → Privacidade e Segurança → Microfone → ligue o Google Chrome. E abra o app pelo localhost.')})}
function paintAudio(){var b=document.getElementById('liveBtn');b.textContent='Piano sampleado no fone: '+(LIVE?'ligado':'desligado');b.classList.toggle('on',LIVE);
 var u=document.getElementById('usbBtn');u.textContent='Som real do Yamaha (USB): '+(USB?'ligado':'desligado');u.classList.toggle('on',USB)}
document.getElementById('liveBtn').onclick=function(){LIVE=!LIVE;paintAudio();var st=document.getElementById('audStat');
 if(LIVE){ctx();var ps=[];for(var m=28;m<=103;m++)ps.push(load(m));st.textContent='Carregando os sons de piano...';Promise.all(ps).then(function(){st.textContent='Piano sampleado pronto ('+Object.keys(BUF).length+' teclas). Toque no Yamaha.'})}else{Object.keys(VO).forEach(function(k){liveOff(+k,true)});st.textContent=''}};
document.getElementById('usbBtn').onclick=function(){USB=!USB;paintAudio();if(USB)startUsb();else{stopUsb();document.getElementById('audStat').textContent=''}};
function bindVol(id,getG){var r=document.getElementById(id),v=document.getElementById(id+'V');r.oninput=function(){if(v)v.textContent=r.value+'%';var g=getG();if(g)g.gain.value=r.value/100;saveSet()}}
bindVol('liveVol',function(){return GL});bindVol('usbVol',function(){return UG});
document.getElementById('clkVol').oninput=function(){if(GC&&OPT.clk)GC.gain.value=this.value/100;saveSet()};
/* ---------- MIDI ---------- */
var midi=null,curIn=null;
function stat(ok,t){if(stat.u!==t){stat.u=t;reg('piano: '+t)}document.getElementById('midiStat').innerHTML='<span class="dot '+(ok?'ok':'bad')+'"></span>'+t+(!ok&&OPT.avisos!==false&&/não/i.test(t)?'<span class="dica-st"> Ligue o piano, confira o cabo USB atrás dele e aperte "Conectar ao piano".</span>':'');if(ok&&typeof avisar==='function')avisar('')}
/* piano ligado no iPhone: o guia, o metrônomo e a gravação vão ao piano pelo app do iPhone (o Mac fica sem cabo).
   O iPhone avisa a cada 8 s que o cabo está nele (cmd iphcabo); cada mensagem vai com a hora do Mac em que deve soar */
var IPHCABO=null;
function pianoIphone(){return !!(IPHCABO&&IPHCABO.nome&&Date.now()-IPHCABO.t<25000)}
var MOUT_IPH={name:'Piano no iPhone',manufacturer:'Yamaha',remoto:true,fila:[],t:null,send:function(d,ts){var me=this;
 me.fila.push(Array.prototype.slice.call(d).concat([Math.round(Date.now()-performance.now()+(ts||performance.now()))]));
 if(!me.t)me.t=setTimeout(function(){me.t=null;var l=me.fila;me.fila=[];if(l.length)fetch('/api/midiout',{method:'POST',body:JSON.stringify(l)}).catch(function(){})},0)}};
function iphCabo(nome){IPHCABO={nome:nome||'',t:Date.now()};var tem=pianoIphone();
 if(!curIn&&tem){if(MOUT!==MOUT_IPH){MOUT=MOUT_IPH;try{pianoVols()}catch(e){}}stat(true,'Piano no iPhone: '+nome)}
 else if(!tem&&MOUT===MOUT_IPH){MOUT=null;if(!curIn)stat(false,'Nenhuma entrada MIDI. Confira o cabo USB e se o piano está ligado.')}}
setInterval(function(){if(MOUT===MOUT_IPH&&!pianoIphone())iphCabo('')},10000);
/* uma mensagem do piano (pelo cabo no Mac, ou repassada pelo app do iPhone com o horário já no relógio do Mac) */
function midiIn(d,ts){var cmd=d[0]&0xf0;if(cmd<0xF0&&((d[0]&0x0f)===1||(d[0]&0x0f)===9))return;/* canais do guia e dos cliques: não são teclas tocadas */ if(cmd===0x90&&d[2]>0){liveOn(d[1],d[2]);noteOn(d[1],d[2],ts)}else if(cmd===0x80||(cmd===0x90&&d[2]===0)){liveOff(d[1]);noteOff(d[1],ts)}else if(cmd===0xB0&&d[1]===64){pedal(d[2]>=64);recPed(d[2]>=64)}}
/* piano ligado no iPhone: o app do iPhone manda cada mensagem com a hora do Mac (Date.now) em que a tecla foi tocada */
var IPHMIDI=0;
/* notas reconhecidas pelo som (microfone do iPhone): sem julgar quando soltou e sem o som guia */
var SOMT=0;function somAtivo(){return window.__fonteSom===true||(SOMT>0&&Date.now()-SOMT<15000)}
function midiIphone(lista,som){if(som)SOMT=Date.now();if(!Array.isArray(lista))return;var dif=Date.now()-performance.now();if((!IPHMIDI||Date.now()-IPHMIDI>5000)&&!curIn)stat(true,'Piano no iPhone'+(IPHCABO&&IPHCABO.nome?': '+IPHCABO.nome:''));IPHMIDI=Date.now();
 lista.forEach(function(x){if(!Array.isArray(x)||x.length<4)return;var d=x.slice(0,3).map(function(v){return (+v)&255}),ts=Math.min(performance.now(),(+x[3])-dif);if(isFinite(ts))midiIn(d,ts)})}
function attach(inp){if(curIn)curIn.onmidimessage=null;if(typeof ACTIVE!=='undefined'&&!ACTIVE){curIn=null;return}curIn=inp;if(!inp){if(pianoIphone()){stat(true,'Piano no iPhone: '+IPHCABO.nome);return}stat(false,'Nenhuma entrada MIDI. Confira o cabo USB e se o piano está ligado.');return}
 inp.onmidimessage=function(e){midiIn(e.data,e.timeStamp)};
 stat(true,'Conectado: '+inp.name)}
function fillInputs(){var sel=document.getElementById('inSel'),ins=[];midi.inputs.forEach(function(i){ins.push(i)});
 /* saída MIDI para o guia e os cliques tocarem no próprio piano: a do mesmo aparelho da entrada */
 var outs=[];midi.outputs.forEach(function(o){outs.push(o)});MOUT=outs.filter(function(o){return /yamaha|p-?2|p-?series|piano|digital/i.test((o.manufacturer||'')+' '+o.name)})[0]||null;if(!MOUT&&pianoIphone())MOUT=MOUT_IPH;pianoVols();sel.innerHTML='';
 ins.forEach(function(i,k){var o=document.createElement('option');o.value=k;o.textContent=i.name;sel.appendChild(o)});sel.style.display=ins.length>1?'':'none';
 var pick=ins.filter(function(i){return /yamaha|p-?2|piano|digital/i.test((i.manufacturer||'')+' '+i.name)})[0]||ins[0];if(pick)sel.value=ins.indexOf(pick);attach(pick);sel.onchange=function(){attach(ins[+sel.value])}}
function connectMidi(auto){if(!navigator.requestMIDIAccess){if(!auto)stat(false,'Este navegador não tem MIDI. Use o Google Chrome.');return}
 navigator.requestMIDIAccess({sysex:false}).then(function(a){midi=a;fillInputs();a.onstatechange=fillInputs},function(err){if(!auto)stat(false,'O Chrome recusou o MIDI ('+(err&&err.name)+'). Clique no cadeado ao lado do endereço e permita "Dispositivos MIDI".')})}
document.getElementById('connect').onclick=function(){connectMidi(false)};
var KEYMAP={z:55,x:57,c:59,v:60,a:60,s:62,d:64,f:65,g:67,h:69,j:71,k:72};
document.addEventListener('keydown',function(e){if(e.repeat||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;var m=KEYMAP[e.key.toLowerCase()];if(m){liveOn(m,90);noteOn(m,90,performance.now())}});
document.addEventListener('keyup',function(e){var m=KEYMAP[e.key.toLowerCase()];if(m){liveOff(m);noteOff(m,performance.now())}});
/* ---------- correção ---------- */
var cd=document.getElementById('cd');function show(h,force){cd.innerHTML=(OPT.cnt||force)?h:'<span class="lb">Contagem escondida neste exercício: conte você mesmo</span>'}
/* modo com tempo: ao SOLTAR a tecla confere se ela ficou apertada pelo tempo escrito (ex.: mínima = 2 tempos).
   A regra é pela PROPORÇÃO da nota, não por milissegundos fixos: pianistas sempre soltam um pouco antes da próxima
   nota (articulação), e numa nota repetida (Dó Dó) é obrigatório levantar o dedo antes de tocar de novo.
   - soltou cedo: certo se segurou ≥ 70% do valor (≥ 50% quando a próxima nota é a mesma tecla); "quase" se ≥ 50% (≥ 35%);
     errado só se segurou menos que isso (ex.: mínima segurada só 1 tempo).
   - segurou demais: só "quase" (nunca errado), e só se passou de 25% do valor por cima da próxima nota; a última nota pode durar à vontade.
   Soltura é detalhe secundário: piora a cor da nota, mas o principal continua sendo apertar na hora certa. */
/* "Cores durante a música" desligado: nada de verde/vermelho enquanto toca (nem na partitura, nem no teclado, nem na lista de erros); tudo aparece no fim, no relatório */
function liveFb(){return OPT.live!==false||!run}
var RANK={ok:0,warn:1,bad:2};
function relJudge(e,ms){var durMs=e.dur*spb*1000,T=tol();
 if(ms<0){var held=Math.max(0,durMs+ms)/durMs,same=EV.some(function(x){return x!==e&&x.h===e.h&&Math.abs(x.beat-(e.beat+e.dur))<1e-6&&x.midis&&e.midis&&x.midis.some(function(m){return e.midis.indexOf(m)>=0})});
  if(-ms<=T.ok+50||held>=(same?0.5:0.7))return 'ok';return held>=(same?0.35:0.5)?'warn':'bad'}
 var last=!EV.some(function(x){return x.h===e.h&&x.beat>=e.beat+e.dur-1e-6});if(last)return 'ok';
 return ms<=Math.max(T.ok+50,durMs*0.25)?'ok':'warn'}
function noteOff(m,ts){recNote(m,0,false,ts);delete played[m];drawKb();if(MODE!=='time'||!run||!startPerf||somAtivo())return;
 var lat=+document.getElementById('lat').value,t=((ts||performance.now())-startPerf-lat)/1000/spb,ch=false;
 EV.forEach(function(e){if(!e.hold||!e.hold[m]||e.relDone||!(e.st in RANK)||e.noRel)return;e.relDone=true;ch=true;
  var ms=Math.round((t-(e.beat+e.dur))*spb*1000);e.relMs=ms;var r=relJudge(e,ms);e.relSt=r;
  if(r!=='ok')e.info=(e.info?e.info+'; ':'')+(ms<0?'soltou cedo: ficou ':'segurou demais: ficou ')+tempos(Math.max(0,e.dur+ms/1000/spb))+' de '+tempos(e.dur);
  if(RANK[r]>RANK[e.st])e.st=r});
 if(ch)render()}

function matches(e,m){return e.midis?e.midis.indexOf(m)>=0:true}
var LASTM=null;
function noteOn(m,vel,ts){activity();LASTM=m;recNote(m,vel,true,ts);document.getElementById('last').textContent=mname(m)+' · força '+velName(vel);
 if(cmdPiano(m))return;
 if(jogoTecla(m))return;
 if(!run||!CUR){played[m]='ok';drawKb();return}
 if(MODE==='wait'){var g=curGroup();if(!g.length)return;if(!wtPronto(g)){show('Cedo: espere a nota acender (a música está no andamento)',true);return}var hit=null;g.forEach(function(e){if(!hit&&matches(e,m)&&!(e.midis&&e.got[m]))hit=e});
  if(hit){played[m]='ok';if(hit.midis){hit.got[m]=1;if(Object.keys(hit.got).length>=hit.midis.length){hit.st=hit.bad?'warn':'ok';hit.info=hit.bad?'acertou depois de errar':''}dynCheck(hit,vel)}else{hit.st='ok';dynCheck(hit,vel)}
   /* acertou antes da hora: a música se ajusta a esta nota (não fica uma nota encavalada na outra) */
   if(WT&&!curGroup().filter(function(e){return Math.abs(e.beat-hit.beat)<1e-6}).length){WT.beat=Math.max(WT.beat,hit.beat);WT.ult=hit.beat;WT.t=performance.now()}
   if(!curGroup().length&&nextIdx()<0)finish()}
  else{played[m]='bad';var e=g[0];e.bad=true;e.wrongs=(e.wrongs||[]).concat(m);e.info='tocou '+chrT(m)+', era '+g.map(function(x){return x.notes?x.notes.map(function(n){return nmT(n)}).join('+'):'?'}).join(' / ');}
  render();return}
 var lat=+document.getElementById('lat').value,t=(ts-startPerf-lat)/1000/spb;markMissed(t);
 var best=null,bd=9;EV.forEach(function(e){var d=t-e.beat,ad=Math.abs(d);if(e.st&&e.st!=='miss')return;if(e.midis&&e.got[m])return;
  var inWin=(!e.st&&ad<=0.5)||(!e.late&&d>0.5&&d<=1.0);if(!inWin||!matches(e,m))return;if(ad<bd){bd=ad;best=e}});
 if(!best){var near=null,nd=9;EV.forEach(function(e){var ad=Math.abs(t-e.beat);if(!e.st&&ad<=0.5&&ad<nd){nd=ad;near=e}});
  played[m]='bad';if(near){near.wrongs=(near.wrongs||[]).concat(m);near.st='bad';near.info='tocou '+chrT(m)+' no lugar'}else{EXTRA.push({m:m,t:t});if(liveFb())show('Nota extra: '+chrT(m)+' fora de hora',true)}render();return}
 var e=best;played[m]='ok';if(e.t0==null)e.t0=t;e.hold=e.hold||{};e.hold[m]=1;if(e.midis)e.got[m]=1;
 if(e.midis&&Object.keys(e.got).length<e.midis.length){render();return}
 var ms=Math.round((e.t0-e.beat)*spb*1000);e.pressMs=ms;if(e.st==='miss')e.late=true;
 var T=tol();if(Math.abs(ms)<=T.ok){e.st='ok';e.info=''}else if(Math.abs(ms)<=T.warn){e.st='warn';e.info=(ms>0?'atrasou ':'adiantou ')+Math.abs(ms)+' ms'}else{e.st='bad';e.info='fora do tempo ('+(ms>0?'+':'')+ms+' ms)'}
 dynCheck(e,vel);render()}
/* em que instante (relógio do MIDI) o som marcado para o tempo t do áudio SAI do alto-falante.
   getOutputTimestamp já inclui o atraso da saída (alto-falante do Mac ~20–40 ms; Bluetooth bem mais).
   Sem isso o app achava que você atrasou exatamente esse tanto. */
function soundPerf(c,t){var o=c.getOutputTimestamp&&c.getOutputTimestamp();
 if(o&&o.performanceTime>0)return o.performanceTime+(t-o.contextTime)*1000;
 return performance.now()+(t-c.currentTime+(c.outputLatency||0)+(c.baseLatency||0))*1000}
/* exigência do ritmo: até "ok" ms = verde; até "warn" ms = amarelo; mais = vermelho */
var TOL={ini:{ok:150,warn:300},nor:{ok:100,warn:250},exi:{ok:60,warn:150}};
function tol(){return TOL[document.getElementById('tol').value]||TOL.ini}
function markMissed(t){var ch=false;EV.forEach(function(e){if(!e.st&&t>e.beat+0.5){var n=e.midis?Object.keys(e.got).length:0;e.st=n?'bad':'miss';e.info=n?'faltou nota do acorde':'faltou';ch=true}});if(ch)render()}
var EXTRA=[];
/* GOID muda a cada Começar e a cada Parar: um início antigo que ainda estava carregando os sons não agenda nada */
var GOID=0;
function resetAll(){GOID++;if(typeof ASS!=='undefined'&&ASS){ASS=null;stopSched()}REPPEND=null;if(typeof PG!=='undefined'&&PG.g)pgDescartar();PAUSA=null;if(typeof FOFF!=='undefined')FOFF=0;pararSubir();RECON=false;EXTRA=[];timers.forEach(clearAt);timers=[];stopSched();run=false;startPerf=0;played={};EV.forEach(function(e){e.st=null;e.info='';e.got={};e.t0=null;e.late=false;e.bad=false;e.hold=null;e.relDone=false;e.wrongs=null;e.pressMs=null;e.relMs=null;e.relSt=null});document.getElementById('res').innerHTML='';
 document.getElementById('go').textContent='Começar';show('<span class="lb">Coloque as mãos na posição e aperte "Começar"</span>',true);render()}
/* ---------- relatório do fim: aparece sempre, mesmo com contagem e destaque desligados ---------- */
function mnum(e){return CUR&&CUR.mmap?CUR.mmap[e.m]:e.m+1}
var DURN={4:'semibreve',3:'mínima pontuada',2:'mínima',1.5:'semínima pontuada',1:'semínima',0.75:'colcheia pontuada',0.5:'colcheia',0.25:'semicolcheia'};
function tempos(x){x=Math.round(x*10)/10;return String(x).replace('.',',')+(x===1?' tempo':' tempos')}
function evName(e){return e.notes?e.notes.map(nmT).join('+'):'qualquer tecla'}
/* resultado nota por nota: tecla com a oitava (Dó4 = Dó central), tempo do compasso (2, 2 e…), dedo e mão */
function tecla(e){var ms=e.midis0||e.midis;return ms?ms.map(mname).join(' + '):'qualquer tecla'}
/* quanto antes/depois do tempo a tecla entrou (só no modo com tempo) */
function tmLab(e){if(e.pressMs==null)return '';var a=Math.abs(e.pressMs);return a<=10?'no tempo exato':a+' ms '+(e.pressMs<0?'antes':'depois')}
function posLab(p){var b=Math.floor(p+1e-6),f=Math.round((p-b)*4)%4;return (b+1)+['',' i',' e',' a'][f]}
function dedo(e){return e.f?String(e.f).replace(/-/g,' + '):''}
/* por que a nota ficou com essa cor */
function whys(e){var T=tol(),r=[];if(e.st==='miss')return ['não foi tocada'];
 if(e.wrongs&&e.wrongs.length)r.push('tocou '+e.wrongs.map(chrT).join(', ')+' no lugar de '+evName(e)+(MODE==='wait'?' (depois acertou)':''));
 if(e.midis&&e.info==='faltou nota do acorde')r.push('faltou '+e.midis.filter(function(m){return !e.got[m]}).map(chrT).join('+')+' do acorde');
 if(e.pressMs!=null&&Math.abs(e.pressMs)>T.ok)r.push((e.pressMs>0?'apertou atrasado ':'apertou adiantado ')+Math.abs(e.pressMs)+' ms');
 if(e.relSt&&e.relSt!=='ok')r.push((e.relMs<0?'soltou cedo: ':'segurou demais: ')+'ficou '+tempos(Math.max(0,e.dur+e.relMs/1000/spb))+' de '+tempos(e.dur));
 if(!r.length&&e.st!=='ok'&&e.info)r.push(e.info);return r}
function report(c,pct,prev){var T=tol(),tm=MODE==='time',tips=[],h='',n=EV.length,ms=[];
 var dyn=EV.filter(function(e){return /fraco demais|forte demais/.test(e.info||'')});if(dyn.length)tips.push(['Força das teclas',dyn.length+' nota(s) com a força diferente da pedida. Para <b>p</b>: dedo desce devagar, perto da tecla. Para <b>f</b>: peso do braço caindo na ponta do dedo firme, sem bater nem levantar o dedo alto. Olhe a força de cada nota ao lado de "Última tecla".']);
 EV.forEach(function(e){if(e.st!=='ok'&&ms.indexOf(mnum(e))<0)ms.push(mnum(e))});
 /* análise: o que se repetiu e o que fazer */
 if(tm){var P=EV.filter(function(e){return e.pressMs!=null}).map(function(e){return e.pressMs});
  if(P.length>=3){var avg=Math.round(P.reduce(function(a,b){return a+b},0)/P.length),sd=Math.round(Math.sqrt(P.reduce(function(a,b){return a+(b-avg)*(b-avg)},0)/P.length));
   if(avg<-T.ok/2)tips.push(['Você está adiantando','Em média você apertou <b>'+(-avg)+' ms antes</b> do tempo. É muito comum: a mão "corre" para a próxima nota. <b>Dica:</b> conte em voz alta "1, 2, 3, 4" junto com o clique e aperte <i>no</i> número, nunca antes. Pense que a nota cai em cima do clique, sem pressa.']);
   else if(avg>T.ok/2)tips.push(['Você está atrasando','Em média você apertou <b>'+avg+' ms depois</b> do tempo. Quase sempre é porque procura a próxima tecla na hora. <b>Dica:</b> olhe uma nota à frente na partitura (o "olhar adiante" da p. 41) e deixe o dedo já em cima da próxima tecla antes de tocar.']);
   if(sd>T.ok)tips.push(['O tempo variou','Às vezes antes, às vezes depois (variação de ±'+sd+' ms). <b>Dica:</b> abaixe o andamento 10 BPM. Devagar e regular ensina mais do que rápido e irregular. Suba 5 BPM só quando sair tudo verde.'])}
  var early=EV.filter(function(e){return e.relSt&&e.relSt!=='ok'&&e.relMs<0}),late=EV.filter(function(e){return e.relSt&&e.relSt!=='ok'&&e.relMs>0});
  if(early.length){var longs=early.filter(function(e){return e.dur>=2}).length;
   tips.push(['Soltou cedo ('+early.length+(early.length>1?' notas':' nota')+')',(longs?'Principalmente nas notas longas (mínima = 2 tempos, mínima pontuada = 3, semibreve = 4). ':'')+'A tecla fica apertada até o tempo da próxima nota. <b>Dica:</b> conte os tempos em voz alta <i>segurando</i> ("1-2" na mínima) e só levante o dedo no instante em que a próxima nota começa: um dedo desce enquanto o outro sobe (é o legato, p. 38).'])}
  if(late.length)tips.push(['Segurou demais ('+late.length+(late.length>1?' notas':' nota')+')','A nota continuou soando por cima da seguinte. <b>Dica:</b> solte no mesmo instante em que aperta a próxima, como andar: um pé sobe enquanto o outro desce.']);
  if(EXTRA.length)tips.push(['Teclas extras ('+EXTRA.length+')','Teclas apertadas fora de hora ou sem querer. <b>Dica:</b> mão arredondada e relaxada, tocando com a ponta firme do dedo (p. 40), sem encostar nas teclas vizinhas.'])}
 var wr=EV.filter(function(e){return e.wrongs&&e.wrongs.length});
 if(wr.length)tips.push(['Notas erradas ('+wr.length+')',wr.slice(0,6).map(function(e){return 'compasso '+mnum(e)+': tocou '+e.wrongs.map(chrT).join(', ')+' em vez de '+evName(e)}).join('; ')+(wr.length>6?'…':'')+'. <b>Dica:</b> antes de tocar, confira a posição da mão (qual dedo em qual tecla). Toque no <b>modo Espera</b>, sem tempo, até as notas saírem certas; só depois volte para o modo com tempo.']);
 if(c.miss)tips.push([(c.miss>1?'Faltaram ':'Faltou ')+c.miss+(c.miss>1?' notas':' nota'),(function(){var l=EV.filter(function(e){return e.st==='miss'}).map(mnum).filter(function(x,i,a){return a.indexOf(x)===i});return (l.length>1?'Compassos ':'Compasso ')+l.join(', ')})()+'. Se a mão não chegou a tempo, abaixe o andamento. Se você se perdeu na partitura, ligue a <b>Contagem</b> e o <b>Acender próxima nota</b>.']);
 /* resumo */
 var co=coach(c,pct,tm,T),nvR=nivelAgora(),rec=recNivel(fbKey(),nvR);
 var seg=[['ok','#C0DD97','#27500A','certas'],['warn','#FAC775','#633806','quase'],['bad','#F7C1C1','#791F1F','erradas'],['miss','#D3D1C7','#444441','faltaram']];
 h+='<div class="fb"><div class="fbhead"><span class="fbpct">'+pct+'%</span><span>'+(tm?'modo com tempo · '+(+document.getElementById('bpm').value)+' BPM · exigência '+document.getElementById('tol').selectedOptions[0].textContent.split(' (')[0].toLowerCase():'modo espera')+(prev!=null?' · seu melhor hoje: '+prev+'%':'')+(CUR.mmap?'':rec?' · recorde '+nivelNome(nvR)+': '+rec.pct+'%'+(pct>rec.pct?' <b>(novo recorde neste nível!)</b>':''):' · primeira vez '+nivelNome(nvR))+'</span></div>';
 h+='<div class="fbbar">'+seg.map(function(s){return c[s[0]]?'<span style="flex:'+c[s[0]]+';background:'+s[1]+';color:'+s[2]+'">'+c[s[0]]+' '+s[3]+'</span>':''}).join('')+'</div><div class="fbleg">'+seg.filter(function(s){return c[s[0]]}).map(function(s){return '<span><i style="background:'+s[1]+'"></i>'+c[s[0]]+' '+(c[s[0]]===1?{certas:'certa',quase:'quase',erradas:'errada',faltaram:'faltou'}[s[3]]:s[3])+'</span>'}).join('')+'</div>';
 /* o que se faz logo depois de ver o resultado fica no topo: tentar de novo e ouvir a gravação */
 h+='<div class="fbtop"><button data-act="repeat" class="fbgo">Tentar de novo</button><button data-act="ouvir">▶ Ouvir o que eu toquei</button><button data-act="assistir" class="ass-res">'+GOI.olho+'Assistir o que eu toquei</button></div>';
 h+=coachHtml(co);
 /* compassos com erro viram botões na cor do pior erro: um toque prepara o treino só daquele compasso */
 if(ms.length&&ms.length<CUR.ms.length){var pior={},rk={warn:1,miss:2,bad:3};EV.forEach(function(e){if(e.st&&e.st!=='ok'){var k=mnum(e);if(!pior[k]||rk[e.st]>rk[pior[k]])pior[k]=e.st}});
  h+='<div class="fbcmp"><span>Treinar só:</span>'+ms.slice(0,10).map(function(k){var s=seg.filter(function(x){return x[0]===(pior[k]||'miss')})[0]||seg[3];return '<button data-act="m:'+k+'" style="background:'+s[1]+';color:'+s[2]+'">compasso '+k+'</button>'}).join('')+'</div>'}
 if(tips.length)h+='<details class="fbdet"><summary>Tudo o que apareceu nesta tentativa ('+tips.length+')</summary><div class="fbtips">'+tips.map(function(t){return '<div class="fbtip"><b>'+t[0]+(/[.!?]$/.test(t[0])?'':'.')+'</b> '+t[1]+'</div>'}).join('')+'</div></details>';
 /* nota por nota */
 var bym={};EV.forEach(function(e){(bym[mnum(e)]=bym[mnum(e)]||[]).push(e)});
 h+='<details class="fbdet"'+(c.ok<n?' open':'')+'><summary>Nota por nota</summary><div class="fbms">';
 Object.keys(bym).sort(function(a,b){return a-b}).forEach(function(k){var ev=bym[k];
  h+='<div class="fbm"><div class="lb">Compasso '+k+'</div>'+ev.map(function(e){var s=seg.filter(function(x){return x[0]===e.st})[0]||seg[3],w=whys(e);
   return '<div class="fbn'+(e.st==='ok'?' okn':'')+'" style="background:'+s[1]+';color:'+s[2]+'"><b>'+tecla(e)+'</b> <small>'+(dedo(e)?'dedo '+dedo(e)+' · ':'')+'mão '+(e.h==='e'?'esq.':'dir.')+'</small><br><small>tempo '+posLab(e.pos)+' · '+(DURN[e.ndur||e.dur]||tempos(e.ndur||e.dur))+'</small><br><span class="why">'+(w.length?w.join('; '):'certo'+(tmLab(e)?' · '+tmLab(e):''))+'</span>'+(!w.length&&tmLab(e)?'<span class="okms"> '+tmLab(e)+'</span>':'')+'</div>'}).join('')+'</div>'});
 h+='</div></details>';
 /* próximos passos */
 h+='<div class="row fbact">'+(tm?'<button data-act="slower">Repetir mais devagar (−10 BPM)</button>':'')+(ms.length&&ms.length<CUR.ms.length?'<button data-act="m:'+ms.join(',')+'">Treinar só '+(ms.length>1?'os compassos ':'o compasso ')+ms.join(', ')+'</button>':'')+(CUR.base?'<button data-act="full">Voltar ao exercício inteiro</button>':'')+(function(){var s=proxEtapa();if(!s||(!s.jogo&&s.id===(CUR.base||CUR).id))return '';return '<button data-act="prox">Próxima etapa da rotina: '+(s.jogo?'Jogo das notas':tDesc(s.t))+'</button>'})()+'</div></div>';
 return h}
/* botões do relatório (funcionam também pelo iPhone) */
/* trocar entre trechos da MESMA música mantém o andamento que você escolheu (não volta ao padrão da música) */
function keepBpm(fn){var b=document.getElementById('bpm'),v=+b.value;fn();b.value=v;b.oninput()}
function practiceMeasures(list,label){var src=CUR.base||CUR,map=CUR.mmap||src.ms.map(function(_,i){return i+1});var orig=list.map(function(k){return k});
 var ex={};Object.keys(src).forEach(function(k){ex[k]=src[k]});ex.base=src;ex.id=src.id+'_parte';ex.mmap=orig;ex.ms=orig.map(function(k){return src.ms[k-1]});ex.title=src.title+' · '+(label||((orig.length>1?'compassos ':'compasso ')+orig.join(', ')));keepBpm(function(){load_ex(ex)})}
/* treinar um trecho por linhas da partitura: da linha a até a linha b (1 = primeira). Todas = a partitura inteira */
function linhas(){var src=CUR?CUR.base||CUR:null;return src?Math.ceil(src.ms.length/perTr(src)):0}
function trecho(a,b){if(!CUR||run)return;var src=CUR.base||CUR,per=perTr(src),n=linhas();a=Math.max(1,Math.min(n,+a||1));b=Math.max(a,Math.min(n,+b||a));
 if(a===1&&b===n){keepBpm(function(){load_ex(src)});return}var l=[];for(var k=(a-1)*per+1;k<=Math.min(b*per,src.ms.length);k++)l.push(k);
 practiceMeasures(l,(a===b?'linha '+a:'linhas '+a+' a '+b)+' (compassos '+l[0]+(l.length>1?' a '+l[l.length-1]:'')+')')}
function trAtual(){var n=linhas();if(!CUR||!CUR.mmap)return [1,n];var per=perTr(CUR.base);return [Math.floor((CUR.mmap[0]-1)/per)+1,Math.floor((CUR.mmap[CUR.mmap.length-1]-1)/per)+1]}
function paintTrecho(){var n=linhas(),a=document.getElementById('trA'),b=document.getElementById('trB');if(!a)return;document.getElementById('trBox').style.display=n>1?'':'none';
 var src=CUR.base||CUR,per=perTr(src),o='';for(var i=1;i<=n;i++)o+='<option value="'+i+'">Linha '+i+' ('+((i-1)*per+1)+'–'+Math.min(i*per,src.ms.length)+')</option>';a.innerHTML=o;b.innerHTML=o;var t=trAtual();a.value=t[0];b.value=t[1];document.getElementById('trAll').style.display=CUR.base?'':'none'}
/* ---------- trecho por toque: tocar no compasso escolhe o trecho, "Repetir" volta sozinho sem parar,
   e os compassos errados ficam marcados enquanto você toca ("Parar e repetir o que errei").
   SEL usa a numeração do exercício inteiro; funciona na partitura, na queda de notas e no celular. Desliga em Facilidades. ---------- */
var SEL=null,LOOP=null;
function selBase(){return CUR?CUR.base||CUR:null}
function selNum(i){return CUR&&CUR.mmap?CUR.mmap[i]:i+1}
function selTem(i){if(!SEL||!CUR||!OPT.trc||SEL.id!==selBase().id)return false;var n=selNum(i);return n>=SEL.a&&n<=SEL.b}
function errMs(){var o={};if(!OPT.trc)return o;EV.forEach(function(e){if(e.st==='bad'||e.st==='miss')o[e.m]=1});return o}
function selNome(){return SEL?(SEL.a===SEL.b?'compasso '+SEL.a:'compassos '+SEL.a+' a '+SEL.b):''}
function selToque(n){if(!OPT.trc||!CUR||run||!(n>=1))return;var id=selBase().id;
 if(!SEL||SEL.id!==id)SEL={id:id,a:n,b:n};else if(SEL.a===SEL.b){if(n===SEL.a)SEL=null;else SEL={id:id,a:Math.min(n,SEL.a),b:Math.max(n,SEL.a)}}else SEL={id:id,a:n,b:n};
 LOOP=null;reg('trecho escolhido: '+(SEL?selNome():'nenhum'));selPinta(true);render()}
function selLista(){var l=[];for(var k=SEL.a;k<=SEL.b;k++)l.push(k);return l}
function selRepetir(){if(!SEL||!CUR)return;if(run)resetAll();practiceMeasures(selLista(),selNome());LOOP={volta:0,limpas:0,id:CUR.id,tm:0,pausa:false};reg('repetindo '+selNome());selPinta(true);document.getElementById('go').click()}
function selUmaVez(){if(!SEL)return;LOOP=null;practiceMeasures(selLista(),selNome());selPinta(true)}
function selLimpar(){SEL=null;loopParar();render()}
function loopParar(){if(LOOP&&LOOP.volta>0&&OPT.trc)try{trGuardar()}catch(e){}if(LOOP&&LOOP.tm)clearTimeout(LOOP.tm);var era=!!LOOP;LOOP=null;if(era){document.getElementById('go').textContent=run?'Parar':'Começar';reg('parou de repetir')}selPinta(true)}
/* parar no meio e repetir o primeiro grupo de compassos errados (até 4 compassos seguidos) */
function selErros(){if(!CUR||!run)return;var e=errMs(),ix=Object.keys(e).map(Number).sort(function(a,b){return a-b});if(!ix.length)return;
 var ns=ix.map(selNum),a=ns[0],b=a;ns.forEach(function(n){if(n<=a+3)b=Math.max(b,n)});resetAll();SEL={id:selBase().id,a:a,b:b};reg('parou para repetir o que errou: '+selNome());selRepetir()}
/* fim de uma volta: conta, mostra e começa de novo (o resultado completo não abre a cada volta) */
function loopVolta(c,pct){LOOP.volta++;LOOP.limpas=(!c.bad&&!c.miss)?LOOP.limpas+1:0;LOOP.melhor=Math.max(LOOP.melhor||0,LOOP.limpas);reg('volta '+LOOP.volta+' de '+selNome()+': '+pct+'%');
 var msg='Volta '+LOOP.volta+': '+pct+'%'+(LOOP.limpas?' · '+LOOP.limpas+(LOOP.limpas>1?' seguidas':'')+' sem erro':'');
 if(LOOP.limpas===3)msg='3 voltas seguidas sem erro! Pode subir o andamento ou escolher um trecho maior.';
 show(msg,true);document.getElementById('go').textContent='Parar';LOOP.pausa=true;selPinta(true);
 LOOP.tm=setTimeout(function(){if(!LOOP)return;LOOP.pausa=false;LOOP.tm=0;document.getElementById('go').click()},LOOP.limpas===3?2500:700)}
var SELH='';
var SIC={guarda:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16l-5-4-5 4z"/></svg>',guardado:'<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ch" d="M7 4h10v16l-5-4-5 4z"/></svg>',rep:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>',x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ch" d="M8 5.5v13l10.5-6.5z"/></svg>',stop:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="ch" x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>'};
function selIc(a,n,i,on){return '<button data-sel="'+a+'" class="selic'+(on?' selgo':'')+'" aria-label="'+n+'" title="'+n+'">'+SIC[i]+'</button>'}
function selPinta(f){var b=document.getElementById('selBox');if(!b)return;var h='';
 if(OPT.trc&&CUR){var er=run&&!LOOP&&Object.keys(errMs()).length;
  if(LOOP)h='<span class="selt"><b>Repetindo '+selNome()+'</b> · volta '+(LOOP.volta+1)+(LOOP.limpas?' · '+LOOP.limpas+(LOOP.limpas>1?' seguidas':'')+' sem erro':'')+'</span>'+selIc('parar','Parar de repetir','stop');
  else if(er)h='<span class="selt lb">Errou? Repita só esse pedaço:</span>'+selIc('erros','Parar e repetir o que errei','rep',1);
  else if(SEL&&SEL.id===selBase().id&&!run)h='<span class="selt"><b>'+selNome().replace(/^c/,'C')+'</b></span>'+selIc('rep','Repetir sem parar','rep',1)+selIc('uma','Treinar uma vez','play')+(trAqui()?selIc('guardar','Trecho guardado para treinar depois (tocar para tirar)','guardado'):selIc('guardar','Guardar este trecho para treinar depois','guarda'))+selIc('limpar','Desmarcar o trecho','x');
  else if(!run)h='<span class="lb">Toque num compasso para escolher um trecho (toque no primeiro e depois no último).</span>'}
 if(h!==SELH||f){SELH=h;b.innerHTML=h;b.style.display=h?'':'none'}}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-sel]');if(!b)return;var a=b.dataset.sel;
 if(a==='guardar'){var t=trAqui();if(t)trTirar(t.k);else trGuardar(true);return}if(a==='rep')selRepetir();else if(a==='uma')selUmaVez();else if(a==='limpar')selLimpar();else if(a==='parar'){loopParar();if(run)resetAll()}else if(a==='erros')selErros()});
/* ---------- trechos para treinar: o trecho que você repetiu fica guardado (piano_trechos, por perfil) para abrir depois
   e repetir de novo, na aba Hoje e no Início do celular. Guarda sozinho ao parar de repetir; o ícone de marcador guarda
   ou tira na hora. Dominado = 3 voltas seguidas sem erro. ---------- */
function trLer(){try{return JSON.parse(localStorage.getItem('piano_trechos'))||[]}catch(e){return []}}
function trGrava(l){try{localStorage.setItem('piano_trechos',JSON.stringify(l.slice(0,30)))}catch(e){}try{selPinta(true)}catch(e){}if(TAB==='hoje'&&!run)showPanel();if(window.CEL_SOON)CEL_SOON()}
function trChave(id,a,b){return id+'|'+a+'|'+b}
function trAqui(){return SEL&&CUR?trLer().filter(function(t){return t.k===trChave(selBase().id,SEL.a,SEL.b)})[0]:null}
function trGuardar(manual){if(!SEL||!CUR)return;var e=selBase(),k=trChave(e.id,SEL.a,SEL.b),l=trLer(),t=l.filter(function(x){return x.k===k})[0];
 if(!t)t={k:k,ex:e.id,a:SEL.a,b:SEL.b,ti:tDesc(e.title),t:Date.now(),v:0,m:0,dom:false};
 t.u=Date.now();t.bpm=+document.getElementById('bpm').value;t.mao=MAO||'';t.modo=MODE;
 if(LOOP&&LOOP.id===CUR.id){t.v+=LOOP.volta;t.m=Math.max(t.m,LOOP.melhor||0);if((LOOP.melhor||0)>=3)t.dom=true}
 trGrava([t].concat(l.filter(function(x){return x.k!==k})));reg('trecho guardado: '+t.ti+' · '+selNome()+(manual?' (pelo botão)':'')+(t.dom?' · dominado':''))}
function trTirar(k){trGrava(trLer().filter(function(x){return x.k!==k}));reg('trecho tirado da lista: '+k)}
function trNome(t){return t.a===t.b?'compasso '+t.a:'compassos '+t.a+' a '+t.b}
function trInfo(t){return t.dom?'dominado':t.m?'melhor: '+t.m+(t.m>1?' voltas seguidas':' volta')+' sem erro':'ainda sem volta sem erro'}
/* abre o exercício, marca o trecho e começa a repetir (com o andamento, a mão e o modo daquela vez) */
function trAbrir(k){var t=trLer().filter(function(x){return x.k===k})[0];if(!t)return;var e=byId(t.ex)||USERS.filter(function(u){return u.id===t.ex})[0];
 if(!e){show('Não achei mais esta música no app.',true);return}if(run||PAUSA)resetAll();if(JG.on)jParar();JG.vis=false;
 if(!CUR||selBase().id!==e.id)load_ex(e);if(t.mao!=null&&t.mao!==(MAO||'')&&typeof setMao==='function')setMao(t.mao);if(t.modo==='time'||t.modo==='wait'){MODE=t.modo;paint()}
 if(+t.bpm){var b=document.getElementById('bpm');b.value=t.bpm;b.oninput()}SEL={id:e.id,a:t.a,b:t.b};reg('abriu o trecho guardado: '+t.ti+' · '+trNome(t));selRepetir()}
function trHtml(){var l=trLer();if(!l.length||!OPT.trc)return '';
 return '<h2>Trechos para treinar</h2><div class="lb" style="margin-bottom:8px">Os trechos que você repetiu. Toque em repetir para continuar de onde parou.</div><div class="trs">'+l.map(function(t){
  return '<div class="tr-i'+(t.dom?' dom':'')+'"><div><b>'+esc(t.ti)+'</b><span class="lb">'+trNome(t)+' · '+trInfo(t)+' · '+quando(t.u)+'</span></div>'+
   '<button class="selic selgo" data-tr="abrir" data-k="'+esc(t.k)+'" aria-label="Repetir este trecho" title="Repetir este trecho">'+SIC.rep+'</button>'+
   '<button class="selic" data-tr="tirar" data-k="'+esc(t.k)+'" aria-label="Tirar da lista" title="Tirar da lista">'+SIC.x+'</button></div>'}).join('')+'</div>'}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-tr]');if(!b)return;if(b.dataset.tr==='abrir')trAbrir(b.dataset.k);else if(b.dataset.tr==='tirar')trTirar(b.dataset.k)});
function trCel(){if(!OPT.trc)return null;return trLer().slice(0,8).map(function(t){return [t.k,t.ti,trNome(t)+' · '+trInfo(t),t.dom?1:0]})}
/* na partitura: a faixa azul do trecho fica atrás das notas; os compassos com erro ganham o número em vermelho; uma área invisível por compasso recebe o toque */
function selFundo(s,sy,per,nm_,x0,mw,tt,bt){if(!OPT.trc)return;for(var mi=0;mi<per&&sy*per+mi<nm_;mi++){var gi=sy*per+mi;if(!selTem(gi))continue;var xa=mi?x0+mi*mw:x0-34;
 el(s,'rect',{x:xa,y:tt-30,width:x0+(mi+1)*mw-xa,height:bt+92-tt,style:'fill:#378ADD;opacity:0.14'})}}
function selTopo(s,sy,per,nm_,x0,mw,tt,bt){if(!OPT.trc)return;var er=errMs();for(var mi=0;mi<per&&sy*per+mi<nm_;mi++){var gi=sy*per+mi,xa=mi?x0+mi*mw:x0-34,n=selNum(gi);
 if(er[gi]){el(s,'rect',{x:xa+2,y:tt-30,width:x0+(mi+1)*mw-xa-4,height:4,rx:2,style:'fill:#E24B4A'});el(s,'text',{x:xa+(mi?5:38),y:tt-16,style:'font-size:12px;font-weight:700;fill:#E24B4A'},String(n))}
 else if(selTem(gi)&&(n===SEL.a||n===SEL.b))el(s,'text',{x:xa+(mi?5:38),y:tt-16,style:'font-size:12px;font-weight:700;fill:#378ADD'},String(n));
 el(s,'rect',{x:xa,y:tt-30,width:x0+(mi+1)*mw-xa,height:bt+92-tt,'data-mm':String(n),style:'fill:transparent;cursor:pointer'})}}
document.getElementById('score').addEventListener('click',function(e){var r=e.target.closest&&e.target.closest('[data-mm]');if(r)selToque(+r.dataset.mm)});
/* para o celular */
function selSnap(){if(!OPT.trc)return {off:1};return {a:SEL&&CUR&&SEL.id===selBase().id?SEL.a:null,b:SEL&&CUR&&SEL.id===selBase().id?SEL.b:null,loop:LOOP?{v:LOOP.volta+1,l:LOOP.limpas}:null,er:run&&!LOOP&&Object.keys(errMs()).length>0}}
/* na queda de notas: faixa do trecho, compassos errados e o número de cada compasso */
function selQueda(){if(!CUR||!OPT.trc)return null;var B=CUR.beats,s=null,er=[],e=errMs();for(var i=0;i<CUR.ms.length;i++){if(selTem(i)){if(!s)s=[i*B,(i+1)*B];else s[1]=(i+1)*B}if(e[i])er.push([i*B,(i+1)*B])}
 return {sel:s,err:er,mn:CUR.mmap||null}}
function doAct(a){if(run)return;if(a==='assistir'){assistir();return}if(a==='repsalvar'){repSalvarAgora();return}var bpm=document.getElementById('bpm');
 if(a==='ouvir'){ouvir();return}
 if(a==='repeat')document.getElementById('go').click();
 else if(a==='slower'){bpm.value=Math.max(30,+bpm.value-10);bpm.oninput();document.getElementById('go').click()}
 else if(a==='full'&&CUR&&CUR.base)keepBpm(function(){load_ex(CUR.base)});
 else if(a.indexOf('m:')===0)practiceMeasures(a.slice(2).split(',').map(Number));
 /* treino sugerido pelo resultado: d|modo|BPM|mão|compassos (só prepara; você aperta "Começar") */
 else if(a.indexOf('d|')===0&&CUR){var q=a.split('|');if(q[3]&&q[3]!==MAO)setMao(q[3]);if(q[4])practiceMeasures(q[4].split(',').map(Number));
  if(q[1]==='wait'||q[1]==='time'){MODE=q[1];paint()}if(+q[2]){bpm.value=+q[2];bpm.oninput()}document.getElementById('res').innerHTML='';saveAtual();paintUlt();
  show('Treino preparado'+(q[4]?': '+faixa(q[4].split(',').map(Number)).replace(/^o |^os /,''):'')+(MODE==='time'?', '+bpm.value+' BPM':', modo Espera')+'. Aperte "Começar".',true)}
 else if(a.indexOf('o|')===0)ajuda(a.slice(2));
 else if(a==='prox')proximaEtapa()}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-act]');if(b)doAct(b.dataset.act)});
function finish(){if(!run)return;run=false;timers.forEach(clearAt);timers=[];EV.forEach(function(e){if(!e.st){e.st='miss';e.info='faltou'}});
 var c={ok:0,warn:0,bad:0,miss:0};EV.forEach(function(e){c[e.st]++});var pct=Math.round(100*(c.ok+0.5*c.warn)/EV.length);
 /* treino de uma mão só conta separado (ex.: "less" só direita não mistura com as duas mãos) */
 /* repetindo um trecho: conta a volta e começa de novo, sem abrir o resultado */
 if(LOOP&&CUR.id===LOOP.id){pgDescartar();loopVolta(c,pct);render();return}
 var rid=CUR.id+(CUR._mao?'_'+CUR._mao:''),prev=(day().done[rid]||{}).best,nvA=nivelAgora(),rnA=CUR.mmap?null:recNivel(fbKey(),nvA),antes=rnA?rnA.pct:null;
 reg('resultado '+(CUR&&CUR.id)+' '+pct+'% · '+MODE+' '+(+document.getElementById('bpm').value)+' BPM · mão '+MAO);
 document.getElementById('res').innerHTML=report(c,pct,prev);try{repPrepara(c,pct,pgParar())}catch(e){reg('ERRO ao preparar o replay: '+e)}
 record(rid,pct,MODE);if(!CUR.mmap){recnLer();recnPoe(fbKey(),nvA,pct,Date.now());recnSalva()}fbGuardar();if(antes!=null&&pct>antes&&pct>=40)celebrar('Novo recorde!',tDesc(CUR.title)+' '+nivelNome(nvA)+': '+pct+'% (antes '+antes+'%)');falar(pct+'%.'+(antes!=null&&pct>antes&&pct>=40?' Novo recorde!':'')+(FOCO_T?' Próxima tentativa: '+FOCO_T+'.':''));document.getElementById('go').textContent='Começar';show('<span class="lb">Fim. Aperte "Começar" para repetir</span>',true);render();showPanel();setTimeout(function(){RECON=false},1500);subirDepois(pct)}
document.getElementById('go').onclick=function(){if(!CUR)return;if(ASS){assParar();return}if(LOOP&&LOOP.pausa&&!run){loopParar();return}if(run&&LOOP){loopParar();resetAll();return}reg((run?'parou ':'começou ')+CUR.id+' · '+MODE+' · mão '+MAO+(curIn?'':pianoIphone()?' · piano no iPhone':' · sem cabo no Mac'));if(JG.on)jParar();JG.vis=false;if(!run&&!curIn&&!pianoIphone())avisar('O app não está ouvindo o piano. Ligue o piano, confira o cabo USB atrás dele e aperte "Conectar ao piano". Sem piano, dá para tocar no teclado do computador (A S D F G H J K).');if(run){pausar();return}if(PAUSA){continuar();return}resetAll();run=true;REC=[];RECP=[[performance.now(),SUS]];RECON=true;pgComecar();this.textContent='Parar';
 if(MODE==='wait'){ESPINI=Date.now();if(OPT.espT)wtLigar();show(OPT.espT?'Modo Espera no tempo: a música anda no andamento e espera você em cada nota':'Toque a nota acesa em azul, no seu ritmo',true);render();return}
 agendaTempo(0)};
/* ---------- pausar e continuar: o botão principal pausa (não zera); ▶ continua do começo do compasso onde parou; ⏮ volta ao começo ---------- */
var PAUSA=null;
function nbAgora(){if(MODE==='wait')return WT?WT.beat:waitBeat();return startPerf?Math.max(0,(performance.now()-startPerf)/1000/spb):0}
function pausar(){if(!run||!CUR)return;var nb=nbAgora(),B=CUR.beats,ini=Math.max(0,Math.floor(nb/B)*B);
 GOID++;timers.forEach(clearAt);timers=[];stopSched();pararSubir();run=false;RECON=false;
 PAUSA={nb:nb,ini:ini,wt:WT?WT.beat:null,mode:MODE};startPerf=0;clearInterval(WTI);WT=null;
 reg('pausou '+CUR.id+' no compasso '+(Math.floor(nb/B)+1));show('Pausado no compasso '+selNum(Math.min(CUR.ms.length-1,Math.floor(nb/B))),true);goPinta();render()}
function continuar(){if(!PAUSA||!CUR)return;var p=PAUSA;PAUSA=null;
 if(p.mode!==MODE){resetAll();document.getElementById('go').click();return}
 /* as notas do compasso onde parou em diante voltam a valer */
 EV.forEach(function(e){if(e.beat>=p.ini-1e-6){e.st=null;e.info='';e.got={};e.t0=null;e.late=false;e.bad=false;e.hold=null;e.relDone=false;e.wrongs=null;e.pressMs=null;e.relMs=null;e.relSt=null}});played={};
 run=true;RECON=true;reg('continuou '+CUR.id+' do compasso '+(Math.floor(p.ini/CUR.beats)+1));goPinta();
 if(MODE==='wait'){ESPINI=Date.now();if(OPT.espT){wtLigar();WT.beat=Math.min(p.wt!=null?p.wt:p.ini,p.ini)}show('Continuando',true);render();return}
 agendaTempo(p.ini)}
/* ícones do botão principal e do voltar ao começo (no Mac e, pelo estado, no celular) */
var GOI={play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ch" d="M8 5.5v13l10.5-6.5z"/></svg>',pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="ch" x="6.5" y="5.5" width="4" height="13" rx="1"/><rect class="ch" x="13.5" y="5.5" width="4" height="13" rx="1"/></svg>',
 ini:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="ch" x="5" y="6" width="2.6" height="12" rx="1"/><path class="ch" d="M19 6v12l-9.5-6z"/></svg>',
 rec:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path class="ch" d="M20.5 3.5v6h-6z"/></svg>',
 olho:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle class="ch" cx="12" cy="12" r="3.2"/></svg>'};
function goPinta(){var g=document.getElementById('go'),r=document.getElementById('reset');if(!g)return;
 var k=run?'pause':'play',n=run?'Pausar':PAUSA?'Continuar de onde parou':'Começar do começo';if(g.dataset.k!==k+(PAUSA?1:0)||!g.querySelector('svg')){g.dataset.k=k+(PAUSA?1:0);g.innerHTML=GOI[k]}g.setAttribute('aria-label',n);g.title=n;g.classList.toggle('pausado',!!PAUSA);
 if(r){var rn=(run||PAUSA||(LOOP&&LOOP.pausa))?(LOOP?'Recomeçar o trecho':'Recomeçar do começo'):'Voltar ao começo';if(r.dataset.k!=='rec'||!r.querySelector('svg')){r.dataset.k='rec';r.innerHTML=GOI.rec}if(r.title!==rn){r.setAttribute('aria-label',rn);r.title=rn}}
 var ab=document.getElementById('assBtn');if(ab){if(!ab.querySelector('svg'))ab.innerHTML=GOI.olho;var ok=typeof assPode==='function'&&(assPode()||!!ASS);ab.style.visibility=ok?'':'hidden';ab.classList.toggle('on',!!ASS);var an=ASS?'Parar o replay':'Assistir o que eu toquei';if(ab.title!==an){ab.title=an;ab.setAttribute('aria-label',an)}}}
/* ---------- assistir o que eu toquei: um "vídeo" da última tentativa, sem salvar nada ----------
   Cada tecla guarda o ponto da música em que foi tocada (REC[i][4]). Assistir apaga as cores e passa a música de novo no
   andamento: as notas ganham a cor de como você tocou na hora em que tocou, as teclas que você apertou acendem (verde/vermelho)
   e o som sai junto (pelo piano ou pelo Mac). Funciona na queda e na partitura, no Mac, no celular e no espelho.
   No fim (ou no ❚❚), tudo volta como estava. */
var ASS=null;
function recNb(t){if(!run)return null;if(MODE==='time'&&startPerf)return (t-startPerf)/1000/spb;return WT?WT.beat:waitBeat()}
function assPode(){return !run&&!ASS&&!!CUR&&REC.some(function(r){return r[3]&&r[4]!=null})}
function assistir(){if(!assPode())return;var cores=repCores(),k=0,hits=[],ab={},ult=null;
 REC.forEach(function(r){var nb=r[4]!=null?r[4]:ult;if(nb==null)return;ult=nb;
  if(r[3]){var h={m:r[0],v:r[1],on:nb,off:nb+0.5,c:cores[k++]||'o'};if(ab[r[0]])ab[r[0]].off=Math.min(ab[r[0]].off,nb);ab[r[0]]=h;hits.push(h)}
  else if(ab[r[0]]){ab[r[0]].off=Math.max(ab[r[0]].on+0.1,nb);delete ab[r[0]]}});
 if(!hits.length)return;
 var nb0=Math.min.apply(null,hits.map(function(h){return h.on}))-1,fim=Math.max.apply(null,hits.map(function(h){return h.off}))+1.5;
 var fin=EV.map(function(e){return {st:e.st,info:e.info,got:e.got,wrongs:e.wrongs,bad:e.bad,late:e.late}});
 EV.forEach(function(e,i){if(e.st&&e.st!=='miss')fim=Math.max(fim,Math.min(e.beat+1.5,fin[i]?Infinity:0));if(e.st==='miss'&&e.beat<fim)fim=Math.max(fim,e.beat+1)});
 ASS={fin:fin,hits:hits,nb0:nb0,fim:fim,pausa:PAUSA,vis:{}};PAUSA=null;
 EV.forEach(function(e){e.st=null;e.info='';e.got={};e.wrongs=null;e.bad=false;e.late=false});played={};
 spb=60/(+document.getElementById('bpm').value||60);var c=ctx(),lead=0.6;startPerf=performance.now()+lead*1000-nb0*spb*1000;pianoVols();
 hits.forEach(function(h){tone(h.m,c.currentTime+lead+(h.on-nb0)*spb,Math.max(0.12,(h.off-h.on)*spb),h.v/127,'rec')});
 reg('assistir: '+hits.length+' teclas, '+Math.round((fim-nb0)*spb)+' s');show('Assistindo o que você tocou',true);render();goPinta();if(window.CEL_SOON)CEL_SOON()}
function assNb(){return (performance.now()-startPerf)/1000/spb}
function assTick(){if(!ASS)return;var nb=assNb(),ch=false;
 if(nb>=ASS.fim){assParar(true);return}
 EV.forEach(function(e,i){var f=ASS.fin[i];if(!f||!f.st||ASS.vis[i])return;if(nb>=(f.st==='miss'?e.beat+0.5:e.beat)){e.st=f.st;e.info=f.info;e.got=f.got;e.wrongs=f.wrongs;e.bad=f.bad;e.late=f.late;ASS.vis[i]=1;ch=true}});
 var p={};ASS.hits.forEach(function(h){if(nb>=h.on&&nb<h.off)p[h.m]=h.c==='o'||h.c==='w'?'ok':'bad'});
 if(JSON.stringify(p)!==JSON.stringify(played)){played=p;ch=true}
 if(ch){render();if(window.CEL_SOON)CEL_SOON()}}
function assParar(acabou){if(!ASS)return;var a=ASS;ASS=null;stopSched();
 EV.forEach(function(e,i){var f=a.fin[i];if(f){e.st=f.st;e.info=f.info;e.got=f.got;e.wrongs=f.wrongs;e.bad=f.bad;e.late=f.late}});
 played={};startPerf=0;PAUSA=a.pausa;show(acabou?'Fim do replay. Toque no olho para assistir de novo.':'Replay parado.',true);render();goPinta();if(window.CEL_SOON)CEL_SOON()}
/* recomeçar: tocando ou pausado, volta ao começo e já toca de novo (repetindo um trecho, recomeça o trecho); parado, só volta ao começo */
function recomecar(){if(!CUR)return;if(ASS){assParar();return}if(!(run||PAUSA||(LOOP&&LOOP.pausa))){resetAll();return}
 if(LOOP&&SEL){if(LOOP.tm)clearTimeout(LOOP.tm);LOOP=null;reg('recomeçou o trecho '+selNome());resetAll();selRepetir();return}
 reg('recomeçou do começo');resetAll();document.getElementById('go').click()}
/* modo com tempo: agenda som, cliques e correção a partir do tempo nb0 (0 = do começo; pausa = continua do compasso onde parou) */
function agendaTempo(nb0){
 var ms=[];allEv().forEach(function(e){if(e.midis)ms=ms.concat(e.midis)});
 var myGo=GOID;
 Promise.race([Promise.all(ms.map(load)),new Promise(function(r){setTimeout(r,1500)})]).then(function(){if(!run||myGo!==GOID)return;var c=ctx(),B=CUR.beats;if(clickPiano())drumKit();pianoVols();spb=60/(+document.getElementById('bpm').value);var t=c.currentTime+0.1;
  if(document.getElementById('pre').value==='clk'){var NC=+document.getElementById('preN').value||B;/* 0 = um compasso */for(var q=0;q<NC;q++){click(t+q*spb,q===0);(function(n,tt){at(tt,function(){show(n===NC?n+'... já!':String(n),true)})})(q+1,t+q*spb)}t+=NC*spb}
  else{var ns=+document.getElementById('preS').value;for(var q=0;q<ns;q++)(function(n,tt){at(tt,function(){show('Prepare as mãos: '+n,true)})})(ns-q,t+q);t+=ns}
  t-=nb0*spb;/* t = hora do tempo 0 (no passado, se continuando) */
  startPerf=soundPerf(c,t);var lagS=Math.max(0,(startPerf-(performance.now()+(t-c.currentTime)*1000))/1000)+0.005;var lat=(+document.getElementById('lat').value)/1000;
  /* piano no iPhone: as notas chegam pelo Wi-Fi, às vezes atrasadas (mas com a hora certa em que você tocou); espera mais 1,2 s antes de dar como faltou */
  var gr=(typeof pianoIphone==='function'&&pianoIphone()&&!curIn)?1.2:0;
  EV.forEach(function(e){if(e.beat<nb0-1e-6)return;var tt=t+e.beat*spb;at(tt+lagS,render);at(tt+e.dur*spb+lagS,render);/* acende e apaga a nota azul na hora em que o som sai */(e.midis||[67]).forEach(function(m){if(e.midis)tone(m,tt,e.dur*spb*0.95,e.pos===0?0.9:0.6)});(function(b,t2){at(t2,function(){markMissed(b+0.5001)})})(e.beat,tt+0.5*spb+lat+0.05+gr)});
  EVX.forEach(function(e){if(e.midis&&e.beat>=nb0-1e-6)e.midis.forEach(function(m){tone(m,t+e.beat*spb,e.dur*spb*0.95,e.pos===0?0.75:0.5,true)})});
  var tot=CUR.ms.length*B;for(var b=Math.ceil(nb0-1e-6);b<tot;b++){click(t+b*spb,b%B===0);(function(tt,n,mm){at(tt,function(){show('Compasso '+mm+' · tempo '+n);render()})})(t+b*spb,b%B+1,Math.floor(b/B)+1)}
  at(t+tot*spb+0.8+lat+gr,finish)})}
document.getElementById('reset').onclick=recomecar;document.getElementById('assBtn').onclick=function(){if(ASS)assParar();else assistir()};
/* ---------- histórico e dia ---------- */
var H={days:{}},lastAct=0;
try{H=JSON.parse(localStorage.getItem('piano_hist'))||H}catch(e){}
function save(){try{localStorage.setItem('piano_hist',JSON.stringify(H))}catch(e){}}
function dkey(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function day(){var k=dkey();if(!H.days[k])H.days[k]={ms:0,done:{},test:null};return H.days[k]}
function activity(){var now=Date.now(),d=day();if(lastAct&&now-lastAct<60000)d.ms+=now-lastAct;lastAct=now;if(!activity.t){activity.t=setTimeout(function(){activity.t=null;save();updToday()},3000)}}
function record(id,pct,mode){var d=day(),r=d.done[id]||{best:0,n:0};r.best=Math.max(r.best,pct);r.n++;r.mode=mode;d.done[id]=r;if(id===testId()&&mode==='time')d.test=Math.max(d.test||0,pct);save();updToday()}
function streak(){var n=0,d=new Date();for(;;){var k=dkey(d),v=H.days[k];if(v&&(v.ms>60000||Object.keys(v.done).length)){n++;d.setDate(d.getDate()-1)}else if(n===0&&k===dkey()){d.setDate(d.getDate()-1)}else break}return n}
function hashStr(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h}
function testPool(){return EX.filter(function(e){return (e.g==='livro'||e.g==='ritmo')&&livroVisivel(e)&&!oculta(e.id)})}
function testId(){var p=testPool();return p[hashStr(dkey())%p.length].id}
function lastBook(){var ids=EX.filter(function(e){return e.g==='livro'&&livroVisivel(e)&&!oculta(e.id)}).map(function(e){return e.id}),best=ids[0];Object.keys(H.days).sort().forEach(function(k){Object.keys(H.days[k].done).forEach(function(id){if(ids.indexOf(id)>ids.indexOf(best))best=id})});return best}
function routine(){return [
 {id:'aq_23_md',t:'Aquecimento: 2as e 3as, mão direita',w:'3-Minute Technique do livro, cerca de 1 min e meio'},
 {id:'aq_23_me',t:'Aquecimento: 2as e 3as, mão esquerda',w:'cerca de 1 min e meio'},
 {id:'jogo',t:'Jogo das notas',w:'uma rodada de 20 notas, cerca de 2 minutos',jogo:true},
 {id:'aq_penta_jt',t:'Pentascala, mãos juntas',w:'devagar, som igual nas duas mãos'},
 (function(){var b=lastBook();return b?{id:b,t:'Revisão: '+byId(b).title,w:'o último exercício do livro que você treinou'}:null})(),
 (function(){var r=revisao(),b=lastBook();return r&&r.id!==b?{id:r.id,t:'Revisar: '+byId(r.id).title,w:'faz '+r.dias+(r.dias>1?' dias':' dia')+' que você não toca; revisar é o que impede de esquecer'}:null})(),
 {id:testId(),t:'Teste do dia: '+byId(testId()).title,w:'no Modo com tempo; a nota fica registrada',test:true},
 {id:'less_me1',t:'Música: less, mão esquerda',w:'um acorde por compasso'}].filter(function(s){return s&&(s.jogo||byId(s.id))&&!oculta(s.id)})}/* etapa de música excluída some da rotina */
/* aba Livro: os exercícios e, na ordem das páginas, as peças que só estão no livro (window.LIVRO_AUSENTES) */
function listaLivro(vis){var cs=vis.map(function(e,i){return {p:TAB==='livro'?pagOf(e):0,i:i,h:exCard(e,true)}});
 if(TAB==='livro'&&window.LIVRO_AUSENTES)LIVRO_AUSENTES.forEach(function(a,i){if(a[0]<=PAGLIV.p){var pg=a[1]>a[0]?'nas p. '+a[0]+'–'+a[1]:'na p. '+a[0];cs.push({p:a[0],i:1e4+i,h:'<div class="ex ausente"><div class="ex-h">'+ilu('livro','card')+'<b>'+a[2]+'</b><span class="ausente-tag">Só no livro</span></div><span class="lb">Disponível '+pg+' do livro.</span></div>'})}});
 return cs.sort(function(a,b){return a.p-b.p||a.i-b.i}).map(function(c){return c.h}).join('')}
function byId(id){return EX.filter(function(e){return e.id===id})[0]}
var shownDay=dkey();
function updToday(){var d=day(),min=Math.round(d.ms/60000);document.getElementById('today').innerHTML='<b>'+perfilNome()+'</b> · Hoje, '+new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})+' · <b>'+min+' min tocando</b> · sequência: <b>'+streak()+' dia'+(streak()===1?'':'s')+'</b>'}
setInterval(function(){if(dkey()!==shownDay){shownDay=dkey();updToday();if(TAB==='hoje')showPanel();show('<b>Começou um dia novo.</b> A rotina de hoje foi reiniciada.',true)}else updToday()},30000);
/* ---------- painéis ---------- */
/* ger=true (aba Músicas): botões Ocultar / Mostrar de novo e, nas importadas, Excluir */
function exCard(e,ger){var d=day().done[e.id];return '<div class="ex'+(CUR&&CUR.id===e.id?' cur':'')+'"><div class="ex-h">'+(typeof exIcone==='function'?ilu(exIcone(e),'card'):'')+'<b>'+tDesc(e.title)+'</b>'+(e.parcial?'<span class="parcial-tag">⚠ Incompleta</span>':'')+'</div><span class="lb">'+tDesc(e.desc)+'</span>'+(d?'<span class="badge">hoje: '+d.best+'% ('+d.n+'x)</span>':'<span class="badge no">ainda não hoje</span>')+(function(){var r=recordeDe(e.id);return r?'<span class="lb">Recorde: '+recLab(r)+'</span>':''})()+'<div class="row exact"><button data-open="'+e.id+'">Abrir</button>'+(ger===true?(oculta(e.id)?'<button data-show="'+e.id+'">Mostrar de novo</button>':'<button data-hide="'+e.id+'" title="Some da lista (e do iPhone); dá para mostrar de novo em Músicas ocultas">Ocultar</button>')+(true?'<button class="del" data-del="'+e.id+'">Excluir</button>':''):'')+'</div>'+(e.xml?'<a class="btn" href="#" data-dl="'+e.id+'">⬇ Baixar o MusicXML</a>':'')+'</div>'}
function showPanel(){var p=document.getElementById('panel'),h='';if(TAB!=='leit'){if(JG.on)jParar();JG.vis=false}
 document.querySelectorAll('.tab').forEach(function(b){b.classList.toggle('on',b.dataset.t===TAB)});
 if(TAB==='hoje'){var d=day(),r=routine(),done=0,us=ultimaSessao();h='';
  if(us)h+='<div class="volta"><b>Da última vez ('+quando(us.e.t)+')</b>: '+tDesc(us.e.ti)+(us.e.mao?' (só a mão '+(us.e.mao==='d'?'direita':'esquerda')+')':'')+', '+us.e.pct+'%. Ficou para treinar: '+us.e.foco+'. <button data-retoma="'+us.k+'">Continuar daí</button></div>';
  h+=trHtml();
  h+='<h2>Rotina de hoje (cerca de 10 a 15 minutos)</h2><div class="lb" style="margin-bottom:8px">Ordem: aquecer os dedos, revisar, testar e terminar com a música. Faça devagar: precisão antes de velocidade.</div><div class="steps">';
  r.forEach(function(s,i){var x=d.done[s.id],ok=s.test?(d.test!=null):!!x;if(ok)done++;h+='<div class="step'+(ok?' done':'')+'"><span class="n">'+(ok?'✓':i+1)+'</span><div class="t"><b>'+s.t+'</b><div class="lb">'+s.w+(x?' · melhor hoje: '+x.best+'%':'')+(s.test&&d.test!=null?' · teste: '+d.test+'%':'')+'</div></div>'+(s.jogo?'<button data-jogoir="1">Abrir</button>':'<button data-open="'+s.id+'"'+(s.test?' data-time="1"':'')+'>Abrir</button>')+'</div>'});
  h+='</div><div class="lb" style="margin-top:8px">'+done+' de '+r.length+' etapas feitas hoje.</div>'}
 else if(TAB==='rep'){REPS=null;TENT=null;h='<div id="repBox"><p class="lb">Carregando os replays…</p></div>'}
 else if(TAB==='hist'){var ks=[],dd=new Date();for(var i=13;i>=0;i--){var x=new Date(dd);x.setDate(dd.getDate()-i);ks.push(dkey(x))}var mx=1;ks.forEach(function(k){var v=H.days[k];if(v)mx=Math.max(mx,v.ms)});
  h='<h2>Últimos 14 dias de '+perfilNome()+'</h2><div class="days">'+ks.map(function(k){var v=H.days[k],m=v?v.ms:0;return '<div><i style="height:'+Math.round(55*m/mx)+'px"></i>'+k.slice(8)+'</div>'}).join('')+'</div><div class="lb" style="margin-top:4px">Altura = minutos tocando no dia.</div><h2 style="margin-top:14px">Testes do dia</h2>';
  var rows=Object.keys(H.days).sort().reverse().slice(0,14).map(function(k){var v=H.days[k];return '<div class="lb">'+k.split('-').reverse().join('/')+': '+Math.round(v.ms/60000)+' min'+(v.test!=null?' · teste '+v.test+'%':'')+' · '+Object.keys(v.done).length+' exercícios</div>'});h+=rows.join('')||'<div class="lb">Ainda sem registros.</div>'}
 else if(TAB==='mus'){var todas=EX.filter(function(e){return e.g==='mus'}).concat(USERS),vis=todas.filter(function(e){return !oculta(e.id)}),ocl=todas.filter(function(e){return oculta(e.id)});
  h='<h2>Músicas</h2><div class="list">'+(vis.map(function(e){return exCard(e,true)}).join('')||'<div class="lb">Nenhuma música à mostra.</div>')+'</div>'+
  (ocl.length?'<details class="ocl" style="margin-top:10px"><summary>Músicas ocultas ('+ocl.length+')</summary><div class="list" style="margin-top:8px">'+ocl.map(function(e){return exCard(e,true)}).join('')+'</div></details>':'')+
  (EXCL.length?'<div class="row" style="margin-top:8px"><span class="lb">'+EXCL.length+(EXCL.length>1?' músicas do app foram excluídas.':' música do app foi excluída.')+'</span><button id="restMus">Trazer de volta</button></div>':'')+
  '<h2 style="margin-top:14px">Importar partitura (MusicXML ou MIDI)</h2><div class="lb">Funciona com arquivos .musicxml ou .xml (por exemplo exportados do MuseScore: Arquivo → Exportar → MusicXML) e com arquivos MIDI (.mid ou .midi): o app transforma o MIDI em partitura, com as duas mãos. A música importada fica salva neste navegador.</div><div class="row" style="margin-top:8px"><input type="file" id="xmlFile" accept=".xml,.musicxml,.mid,.midi"><span class="lb" id="xmlStat"></span></div>'+
  '<h2 style="margin-top:14px">Converter partitura em PDF</h2><div class="lb">Escolha o PDF (ou uma foto/imagem) de uma partitura: o Audiveris, instalado no Mac, lê as notas, transforma em MusicXML e o app importa sozinho. Demora de 15 segundos a alguns minutos, conforme o número de páginas. Funciona melhor com PDF digital e nítido. O leitor automático pode errar algumas notas: confira a partitura no app antes de treinar, e use "Baixar o MusicXML" para corrigir no MuseScore se precisar.</div>'+
  '<div class="row" style="margin-top:8px"><input type="file" id="pdfFile" accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff"></div><div class="row" style="margin-top:8px"><label class="lb">Da página <input type="number" id="pdfIni" min="1" inputmode="numeric" style="width:76px"></label><label class="lb">até <input type="number" id="pdfFim" min="1" inputmode="numeric" style="width:76px"></label><label class="lb">Nome <input type="text" id="pdfNome" placeholder="opcional" style="width:180px"></label><button id="pdfGo" class="primary">Converter</button></div><div class="lb" style="margin-top:6px">Use a numeração do PDF, a que aparece no visualizador; ela pode ser diferente do número impresso na página. Em branco = o arquivo inteiro.</div><div class="lb" id="pdfStat" style="margin-top:6px"></div><div class="row" style="margin-top:8px"><span class="lb">Veio algo a mais, como o dueto do professor? Cortar a música importada que está aberta:</span><label class="lb">do compasso <input type="number" id="cutIni" min="1" inputmode="numeric" style="width:76px"></label><label class="lb">ao <input type="number" id="cutFim" min="1" inputmode="numeric" style="width:76px"></label><button id="cutGo">Cortar</button><span class="lb" id="cutStat"></span></div>'+
  '<h2 style="margin-top:14px">Combinar PDF + MIDI (o melhor dos dois)</h2><div class="lb">Tem o PDF e o MIDI da mesma música? O app converte o PDF e compara compasso por compasso com o MIDI: onde os dois têm as mesmas notas, usa o do PDF (escrita igual ao papel: Dó♯ ou Ré♭, ligaduras, clave); onde discordam, usa o do MIDI (que não tem erro de leitura). No fim mostra quais compassos vieram do MIDI, para você conferir esses no papel.</div>'+
  '<div class="row" style="margin-top:8px"><span class="lb">PDF:</span><input type="file" id="cmbPdf" accept=".pdf,.png,.jpg,.jpeg"><span class="lb">MIDI:</span><input type="file" id="cmbMid" accept=".mid,.midi"><button id="cmbGo">Combinar</button></div><div class="lb" id="cmbStat" style="margin-top:6px"></div>'}
 else if(TAB==='conc')h=concHtml();
 else if(TAB==='leit'){h=jogoHtml()+'<h2 class="conc-h">Sequências para ler e tocar</h2><div class="lb" style="margin-bottom:8px">Depois do jogo, leia notas seguidas: cada vez que você abre, o app inventa uma sequência nova. Não aparecem nomes nem dedos (o objetivo é ler). Começa no modo espera.</div><div class="list">'+Object.keys(LEIT).map(function(k){var d=day().done['leit_'+k];return '<div class="ex"><div class="ex-h">'+ilu(LEIT[k].h==='e'?'guia':LEIT[k].h==='x'?'guia':'guia','card')+'<b>'+LEIT[k].t+'</b></div>'+(d?'<span class="badge">hoje: '+d.best+'% ('+d.n+'x)</span>':'<span class="badge no">ainda não hoje</span>')+'<button data-leit="'+k+'">Abrir uma sequência nova</button></div>'}).join('')+'</div>'}
 else{var todos=EX.filter(function(e){return e.g===TAB&&livroVisivel(e)}),vis=todos.filter(function(e){return !oculta(e.id)}),ocl=todos.filter(function(e){return oculta(e.id)});
  h=(TAB==='livro'?paginaHtml():'')+(TAB==='ritmo'?ritmoHtml():'')+'<div class="list">'+(listaLivro(vis)||'<div class="lb">Nada à mostra nesta aba.</div>')+'</div>'+
   (ocl.length?'<details class="ocl" style="margin-top:10px"><summary>Ocultos ('+ocl.length+')</summary><div class="list" style="margin-top:8px">'+ocl.map(function(e){return exCard(e,true)}).join('')+'</div></details>':'')+
   (EXCL.length?'<div class="row" style="margin-top:10px"><span class="lb">'+EXCL.length+(EXCL.length>1?' itens do app foram excluídos.':' item do app foi excluído.')+'</span><button id="restMus">Trazer de volta</button></div>':'')}
 p.innerHTML=h;
 jogoMontar();if(TAB==='conc')concMontar(p);
 function irJogo(){TAB='leit';showPanel();saveAtual();var j=document.getElementById('jogo');if(j)j.scrollIntoView({block:'start',behavior:'smooth'})}
 p.querySelectorAll('[data-jgniv]').forEach(function(b){if(b.closest('#jogo'))return;b.onclick=function(){if(JG.on)jParar();JG.nivel=b.dataset.jgniv;jsSave();irJogo()}});
 p.querySelectorAll('[data-jogoir]').forEach(function(b){b.onclick=irJogo});
 p.querySelectorAll('[data-retoma]').forEach(function(b){b.onclick=function(){retomar(b.dataset.retoma)}});
 p.querySelectorAll('[data-ritmo]').forEach(function(b){b.onclick=function(){ritmoNovo(b.dataset.ritmo)}});
 praticaVis();
 if(TAB==='hist'){p.insertAdjacentHTML('beforeend',bkHtml());bkMontar(p)}
 if(TAB==='rep')repMostrar();
 p.querySelectorAll('[data-open]').forEach(function(b){b.onclick=function(){var e=byId(b.dataset.open)||USERS.filter(function(u){return u.id===b.dataset.open})[0];if(b.dataset.time){MODE='time';paint()}load_ex(e)}});
 var rm=document.getElementById('restMus');if(rm)rm.onclick=restaurarMusicas;
 p.querySelectorAll('[data-leit]').forEach(function(b){b.onclick=function(){leitura(b.dataset.leit)}});
 var ps=document.getElementById('pagSel');if(ps)ps.onchange=function(){setPagina(this.value)};
 p.querySelectorAll('[data-hide]').forEach(function(b){b.onclick=function(){setOculta(b.dataset.hide,true)}});
 p.querySelectorAll('[data-show]').forEach(function(b){b.onclick=function(){setOculta(b.dataset.show,false)}});
 p.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){delMusica(b.dataset.del)}});
 /* baixar o MusicXML de uma música importada (para abrir e corrigir no MuseScore) */
 p.querySelectorAll('[data-dl]').forEach(function(a){a.onclick=function(ev){ev.preventDefault();var u=USERS.filter(function(x){return x.id===a.dataset.dl})[0];if(!u||!u.xml)return;
  var l=document.createElement('a');l.href=URL.createObjectURL(new Blob([u.xml],{type:'application/xml'}));l.download=u.title.replace(/ \(convertida do PDF\)/,'')+'.musicxml';document.body.appendChild(l);l.click();l.remove()}});
 var f=document.getElementById('xmlFile');if(f)f.onchange=function(){var file=f.files[0];if(!file)return;
  if(/\.midi?$/i.test(file.name)){file.arrayBuffer().then(function(buf){try{var ex=parseMIDI(buf,file.name);USERS.push(ex);saveUsers();showPanel();load_ex(ex);document.getElementById('xmlStat').textContent='MIDI importado: '+ex.title+' ('+ex.ms.length+' compassos)'}catch(err){document.getElementById('xmlStat').textContent='Não consegui ler esse MIDI: '+err.message}});return}
  file.text().then(function(txt){try{var ex=parseXML(txt,file.name);ex.xml=txt;USERS.push(ex);saveUsers();document.getElementById('xmlStat').textContent='Importada: '+ex.title;showPanel();load_ex(ex)}catch(err){document.getElementById('xmlStat').textContent='Não consegui ler esse arquivo: '+err.message}})}
 /* PDF + MIDI: converte o PDF no Mac (Audiveris), lê o MIDI e junta compasso por compasso */
 var cg=document.getElementById('cmbGo');if(cg)cg.onclick=function(){var pf=document.getElementById('cmbPdf').files[0],mf=document.getElementById('cmbMid').files[0],st=document.getElementById('cmbStat');
  if(!pf||!mf){st.textContent='Escolha os dois arquivos: o PDF e o MIDI da mesma música.';return}
  if(!/^https?:/.test(location.protocol)){st.textContent='Abra o app pelo atalho "Abrir Treino de Piano" (localhost) para converter o PDF.';return}
  var t0=Date.now(),tick=setInterval(function(){st.textContent='Lendo o PDF com o Audiveris… '+Math.round((Date.now()-t0)/1000)+' s'},1000);cg.disabled=true;st.textContent='Enviando…';
  Promise.all([fetch('/api/omr?nome='+encodeURIComponent(pf.name),{method:'POST',body:pf}).then(function(r){return r.text().then(function(t){if(!r.ok)throw new Error(t);return t})}),mf.arrayBuffer()])
  .then(function(r){var A=parseXML(r[0],pf.name),B=parseMIDI(r[1],mf.name),C=combinar(A,B),nome=pf.name.replace(/\.[^.]+$/,'');
   var ex={id:'user_'+Date.now(),g:'user',title:nome+' (PDF + MIDI)',src:'PDF + MIDI',bpm:C.bpm,beats:C.beats,key:C.key,ms:C.ms,abs:true,
    desc:C.iguais+' de '+C.ms.length+' compassos vieram do PDF (escrita igual ao papel).'+(C.doMidi.length?' Vieram do MIDI (confira no papel): '+C.doMidi.join(', ')+'.':'')};
   USERS.push(ex);saveUsers();showPanel();load_ex(ex);var s2=document.getElementById('cmbStat');if(s2)s2.innerHTML='Pronto em '+Math.round((Date.now()-t0)/1000)+' s: <b>'+ex.title+'</b>. '+ex.desc})
  .catch(function(err){var s2=document.getElementById('cmbStat');if(s2)s2.textContent='Não deu certo: '+err.message})
  .then(function(){clearInterval(tick);var b2=document.getElementById('cmbGo');if(b2)b2.disabled=false})};
 /* PDF -> MusicXML pelo servidor do Mac (Audiveris) -> importa */
 var cg=document.getElementById('cutGo');if(cg)cg.onclick=function(){var st=document.getElementById('cutStat'),a=parseInt(document.getElementById('cutIni').value,10),b=parseInt(document.getElementById('cutFim').value,10),x=CUR&&CUR.base||CUR;
   if(!x||x.g!=='user'){st.textContent='Abra primeiro uma música importada.';return}if(!a||!b||a<1||b<a||a>x.ms.length){st.textContent='Use compassos de 1 a '+x.ms.length+'.';return}
   cortarCompassos(x,a,b);saveUsers();showPanel();load_ex(x);var s2=document.getElementById('cutStat');if(s2)s2.textContent='Pronto: '+x.ms.length+' compassos.'};
 var pf=document.getElementById('pdfFile'),pg=document.getElementById('pdfGo');if(pg)pg.onclick=function(){var file=pf.files[0],st=document.getElementById('pdfStat');if(!file){st.textContent='Escolha o arquivo primeiro.';return}
  var ini=parseInt(document.getElementById('pdfIni').value,10)||0,fim=parseInt(document.getElementById('pdfFim').value,10)||ini,nomeP=document.getElementById('pdfNome').value.trim();if(ini&&fim<ini){st.textContent='A página final vem antes da inicial.';return}
  if(!/^https?:/.test(location.protocol)){st.textContent='Abra o app pelo atalho "Abrir Treino de Piano" (localhost) para converter.';return}
  var t0=Date.now(),tick=setInterval(function(){st.textContent='Lendo a partitura com o Audiveris… '+Math.round((Date.now()-t0)/1000)+' s'},1000);st.textContent='Enviando…';pf.disabled=true;pg.disabled=true;
  fetch('/api/omr?todas=1&nome='+encodeURIComponent(file.name)+(ini?'&ini='+ini+'&fim='+fim:''),{method:'POST',body:file}).then(function(r){return r.text().then(function(t){if(!r.ok)throw new Error(t);return {t:t,partes:r.headers.get('X-Partes')}})})
  
.then(function(o){var nome=nomeP||file.name.replace(/\.[^.]+$/,''),base=nome+(ini?' (p. '+ini+(fim>ini?'–'+fim:'')+')':nomeP?'':' (convertida do PDF)'),xs=o.t.split('<!--PARTE-->'),feitos=[];
   xs.forEach(function(x,i){try{var ex=parseXML(x.trim(),nome+'.musicxml');ex.id+='_'+i;ex.title=base+(xs.length>1?' · parte '+(i+1)+' de '+xs.length:'');ex.xml=x.trim();USERS.push(ex);feitos.push(ex)}catch(e){}});if(!feitos.length)throw new Error('nenhuma parte pôde ser lida');saveUsers();
   var ex=feitos[0],url=URL.createObjectURL(new Blob([ex.xml],{type:'application/xml'}));
   showPanel();load_ex(ex);var s2=document.getElementById('pdfStat');if(s2)s2.innerHTML='Pronto em '+Math.round((Date.now()-t0)/1000)+' s: '+(feitos.length>1?'<b>'+feitos.length+' partes</b> importadas, cada uma é um item da lista':'<b>'+ex.title+'</b> ('+ex.ms.length+' compassos)')+'. Confira as notas antes de treinar. <a class="btn" href="'+url+'" download="'+nome+'.musicxml">⬇ Baixar o MusicXML (para corrigir no MuseScore)</a>'})
  .catch(function(err){var s2=document.getElementById('pdfStat');if(s2)s2.textContent='Não deu certo: '+err.message})
  .then(function(){clearInterval(tick);var p2=document.getElementById('pdfFile'),g2=document.getElementById('pdfGo');if(p2)p2.disabled=false;if(g2)g2.disabled=false})}}
document.querySelectorAll('.tab').forEach(function(b){b.onclick=function(){TAB=b.dataset.t;showPanel();saveAtual()}});
/* ---------- montar os compassos de uma música importada (PDF/MusicXML e MIDI) ----------
   Cada nota vem como {mi: compasso, pos: tempo no compasso, len: duração, h: mão, n: [índice, acidente], m: midi, f: dedo, ts: ligada à próxima, tp: continuação}.
   Nota que passa da barra de compasso, ou com duração que não existe numa figura só (1¼, 2½…), vira duas figuras ligadas (ligadura de valor).
   Notas que começam juntas na mesma mão formam um acorde; se uma dura mais que as outras, o resto dela continua ligado.
   Cada evento: [duração, notas, dedos, mão, posição] e, se houver ligadura, um 6º item {s: notas ligadas à próxima, p: notas que são continuação} */
var DURS=[4,3,2,1.5,1,0.75,2/3,0.5,1/3,0.25,1/6];
function r12(x){return Math.round(x*12)/12}
function buildEvents(pcs,beats,nmMin){var q=pcs.slice(),G={},nm=nmMin||0;
 function cp(p,o){var r={};for(var k in p)r[k]=p[k];for(k in o)r[k]=o[k];return r}
 while(q.length){
  while(q.length){var p=q.shift();if(!(p.len>1e-6))continue;var end=p.pos+p.len;
   if(end>beats+1e-6){q.push(cp(p,{mi:p.mi+1,pos:0,len:r12(end-beats),tp:true}));p=cp(p,{len:r12(beats-p.pos),ts:true})}
   var v=DURS.filter(function(x){return x<=p.len+1e-6})[0]||0.25;
   if(p.len-v>1e-6){q.push(cp(p,{pos:r12(p.pos+v),len:r12(p.len-v),tp:true}));p=cp(p,{len:v,ts:true})}
   var k=p.mi+'_'+p.pos+'_'+p.h;(G[k]=G[k]||{mi:p.mi,pos:p.pos,h:p.h,ps:[]}).ps.push(p);nm=Math.max(nm,p.mi+1)}
  /* acorde com durações diferentes: todas ficam com a menor; o resto da mais longa continua ligado */
  Object.keys(G).forEach(function(k){var g=G[k],d=Math.min.apply(null,g.ps.map(function(p){return p.len}));
   g.ps=g.ps.map(function(p){if(p.len-d>1e-6){q.push(cp(p,{pos:r12(p.pos+d),len:r12(p.len-d),tp:true}));return cp(p,{len:d,ts:true})}return p})})}
 var ms=[];for(var i=0;i<nm;i++)ms.push([]);
 Object.keys(G).map(function(k){return G[k]}).sort(function(a,b){return a.mi-b.mi||a.pos-b.pos}).forEach(function(g){
  var seen={},ps=g.ps.filter(function(p){if(seen[p.m])return false;return seen[p.m]=true}).sort(function(a,b){return a.m-b.m}),ts=[],tp=[];
  ps.forEach(function(p,i){if(p.ts)ts.push(i);if(p.tp)tp.push(i)});
  var ev=[ps[0].len,ps.map(function(p){return p.n}),ps.some(function(p){return p.f})?ps.map(function(p){return p.f||''}).join('-'):'',g.h,g.pos];
  if(ts.length||tp.length)ev.push({s:ts,p:tp});ms[g.mi].push(ev)});
 return ms}
/* nome da nota preta pelo acorde: Dó♯ ou Ré♭? Escolhe o nome que forma 3as e 5as com as outras notas que soam junto
   (no acorde de Lá: Lá–Dó♯–Mi, e não Lá–Ré♭–Mi). Nota sozinha ou empate: o nome da armadura */
var SPH=[[0,0],[0,1],[1,0],[1,1],[2,0],[3,0],[3,1],[4,0],[4,1],[5,0],[5,1],[6,0]],SPF=[[0,0],[1,-1],[1,0],[2,-1],[2,0],[3,0],[4,-1],[4,0],[5,-1],[5,0],[6,-1],[6,0]];
function spellGroup(ms,key){function oc(m){return (Math.floor(m/12)-1)*7}
 function def(m){var x=(key<0?SPF:SPH)[m%12];return [oc(m)+x[0],x[1]]}
 function cands(m){var a=SPH[m%12],b=SPF[m%12];return a[1]===0?[[oc(m)+a[0],0]]:[[oc(m)+a[0],a[1]],[oc(m)+b[0],b[1]]]}
 return ms.map(function(m,i){var c=cands(m);if(c.length<2)return c[0];var best=null,bs=-1e9;
  c.forEach(function(x){var s=x[1]===def(m)[1]?0.5:0;ms.forEach(function(o,j){if(j===i||o%12===m%12)return;var Lo=(cands(o).length<2?cands(o)[0]:def(o))[0],dd=(((x[0]-Lo)%7)+7)%7;s+=dd===2||dd===5?2:dd===3||dd===4?1:-2});
   if(s>bs){bs=s;best=x}});return best})}
/* ---------- combinar PDF + MIDI ----------
   Compasso por compasso: onde os dois têm as mesmas notas nos mesmos tempos, vale o do PDF (escrita igual ao papel: Dó♯, ligaduras, mãos);
   onde discordam, vale o do MIDI (as notas do MIDI não têm erro de leitura). Compasso que o PDF perdeu vem do MIDI */
function ataques(me){var o=[];(me||[]).forEach(function(ev){var tp=ev[5]&&ev[5].p||[];ev[1].forEach(function(n,i){if(tp.indexOf(i)<0)o.push(ev[4]+'|'+mid(n))})});return o.sort().join(',')}
function combinar(A,B){var best=-1,off=0;for(var o=-3;o<=3;o++){var s=0;B.ms.forEach(function(me,i){var a=A.ms[i+o];if(a&&a.length&&ataques(a)===ataques(me))s++});if(s>best){best=s;off=o}}
 var ms=[],doMidi=[];B.ms.forEach(function(me,i){var a=A.ms[i+off];if(a&&ataques(a)===ataques(me))ms.push(a);else{ms.push(me);doMidi.push(i+1)}});
 return {ms:ms,doMidi:doMidi,iguais:B.ms.length-doMidi.length,key:A.key,beats:B.beats,bpm:B.bpm}}
/* ligaduras de valor na correção: a continuação não se toca de novo. Se todas as notas do evento são continuação, ele sai da lista de notas
   a tocar (EVD: só é desenhado) e a nota de origem passa a durar até o fim dele (o app espera você segurar). Em acorde com só parte ligada,
   a parte ligada sai das notas a tocar e a soltura dessa nota não é julgada */
var EVD=[];
function linkTies(){EVD=[];var all=EV.slice().sort(function(a,b){return a.beat-b.beat});
 all.forEach(function(e){if(e.midis0)e.midis=e.midis0.slice();else if(e.midis)e.midis0=e.midis.slice();e.ndur=null;e.tl=null;e.tnext=null;e.noRel=false;e.tcd=false;e.anc=null;e.nidx=null});
 all.forEach(function(q){if(!q.tp||!q.tp.length||!q.midis0)return;var linked=[];
  q.tp.forEach(function(qi){var m=q.midis0[qi];all.some(function(c){if(c===q||c.h!==q.h||!c.ts||!c.midis0||Math.abs(c.beat+(c.ndur||c.dur)-q.beat)>1e-6)return false;
   var pi=-1;c.ts.forEach(function(ci){if(c.midis0[ci]===m)pi=ci});if(pi<0)return false;linked.push([qi,c,pi]);return true})});
  if(!linked.length)return;q.tl=linked;linked.forEach(function(L){(L[1].tnext=L[1].tnext||[]).push([L[2],q,L[0]])});
  if(linked.length===q.midis0.length){q.tcd=true;var c=linked[0][1],anc=c.anc||c;q.anc=anc;
   if(anc.ts&&anc.ts.length===anc.midis0.length&&!anc.noRel){if(anc.ndur==null)anc.ndur=anc.dur;anc.dur=q.beat+(q.ndur||q.dur)-anc.beat}else anc.noRel=true}
  else{var lk=linked.map(function(L){return L[0]});q.nidx=q.midis0.map(function(_,i){return i}).filter(function(i){return lk.indexOf(i)<0});q.midis=q.nidx.map(function(i){return q.midis0[i]});
   linked.forEach(function(L){(L[1].anc||L[1]).noRel=true})}});
 EVD=all.filter(function(e){return e.tcd});EV=EV.filter(function(e){return !e.tcd})}
/* ---------- importação MusicXML ---------- */
var USERS=[];try{USERS=JSON.parse(localStorage.getItem('piano_users'))||[]}catch(e){}
function saveUsers(){try{localStorage.setItem('piano_users',JSON.stringify(USERS))}catch(e){}}
function parseXML(txt,fname){var doc=new DOMParser().parseFromString(txt,'application/xml');if(doc.querySelector('parsererror'))throw new Error('arquivo inválido');
 var part=doc.querySelector('part');if(!part)throw new Error('sem partes');var div=1,key=0,beats=4,pcs=[],nmeas=0,clave={},cifs=[],duas=part.querySelector('staves')&&+part.querySelector('staves').textContent>1,title=(doc.querySelector('work-title')||doc.querySelector('movement-title')||{}).textContent||fname.replace(/\.[^.]+$/,'');
 var SI={C:0,D:1,E:2,F:3,G:4,A:5,B:6};
 part.querySelectorAll('measure').forEach(function(meas,mi){var pos=0,lastStart=0;nmeas=mi+1;
  Array.prototype.forEach.call(meas.children,function(n){var tag=n.tagName;
   if(tag==='attributes'){var d=n.querySelector('divisions');if(d)div=+d.textContent;var f=n.querySelector('key fifths');if(f)key=+f.textContent;var b=n.querySelector('time beats');if(b){var bt=n.querySelector('time beat-type');beats=+b.textContent*4/(bt?+bt.textContent:4)}
    n.querySelectorAll('clef').forEach(function(c){clave[c.getAttribute('number')||'1']=(c.querySelector('sign')||{}).textContent})}
   else if(tag==='harmony'){var rs=n.querySelector('root-step');if(rs){var ra=+((n.querySelector('root-alter')||{}).textContent||0),kd=(n.querySelector('kind')||{}).textContent||'',kt={minor:'m',dominant:'7','suspended-fourth':'sus4','minor-seventh':'m7','major-seventh':'maj7',diminished:'dim'}[kd]||'';cifs.push([mi,Math.round(pos/div*12)/12,rs.textContent+(ra>0?'♯':ra<0?'♭':'')+kt])}}
   else if(tag==='backup'){pos-=+n.querySelector('duration').textContent}
   else if(tag==='forward'){pos+=+n.querySelector('duration').textContent}
   else if(tag==='note'){var dur=+((n.querySelector('duration')||{}).textContent||0),isChord=!!n.querySelector('chord'),start=isChord?lastStart:pos;
    if(!isChord)pos+=dur;lastStart=start;if(n.querySelector('rest')||n.querySelector('grace'))return;
    /* ligadura de valor: a nota "stop" é continuação (desenhada, não se toca de novo) */
    var ties=Array.prototype.map.call(n.querySelectorAll('tie'),function(t){return t.getAttribute('type')});
    var p=n.querySelector('pitch');if(!p)return;var idx=(+p.querySelector('octave').textContent)*7+SI[p.querySelector('step').textContent],alt=Math.round(+((p.querySelector('alter')||{}).textContent||0));
    var staff=+((n.querySelector('staff')||{}).textContent||1),fg=n.querySelector('fingering'),nn=[idx,alt];
    pcs.push({mi:mi,pos:Math.round(start/div*12)/12,len:Math.round(dur/div*12)/12,h:staff===2||(!duas&&clave['1']==='F')?'e':'d',n:nn,m:mid(nn),f:fg?fg.textContent:'',ts:ties.indexOf('start')>=0,tp:ties.indexOf('stop')>=0})}})});
 if(!nmeas)throw new Error('sem compassos');var ms=buildEvents(pcs,beats,nmeas);
 return {id:'user_'+Date.now(),g:'user',title:title,src:'Partitura importada',bpm:60,beats:beats,key:Math.max(-7,Math.min(7,key)),ms:ms,desc:'Importada de '+fname+'.',abs:true,cif:cifs.length?cifs:undefined}}
function cortarCompassos(x,a,b){x.ms=x.ms.slice(a-1,b);if(x.cif)x.cif=x.cif.filter(function(c){return c[0]>=a-1&&c[0]<b}).map(function(c){return [c[0]-a+1,c[1],c[2]]});delete x._perB;delete x._lhg}
/* ---------- importação de arquivo MIDI (.mid) ----------
   Lê as notas, o andamento, a fórmula de compasso e a armadura do arquivo. Mãos: com 2 trilhas (ou 2 canais), a mais aguda vira a mão direita;
   com uma só, notas do Dó central para cima = direita, abaixo = esquerda. O ritmo é arredondado para semicolcheias */
function parseMIDI(buf,fname){var d=new DataView(buf),p=0;
 function str(n){var s='';for(var i=0;i<n;i++)s+=String.fromCharCode(d.getUint8(p+i));return s}
 function vlq(){var v=0,b;do{b=d.getUint8(p++);v=v*128+(b&0x7f)}while(b&0x80);return v}
 if(d.byteLength<14||str(4)!=='MThd')throw new Error('não é um arquivo MIDI');
 var nt=d.getUint16(10),div=d.getUint16(12);if(div&0x8000)throw new Error('tipo de MIDI não suportado (tempo SMPTE)');p=8+d.getUint32(4);
 var tempo=0,ts=null,ks=null,groups=[];
 for(var t=0;t<nt&&p+8<=d.byteLength;t++){var tag=str(4),len=d.getUint32(p+4);p+=8;var end=Math.min(p+len,d.byteLength);if(tag!=='MTrk'){p=end;continue}
  var tick=0,rs=0,on={},notes=[];
  while(p<end){tick+=vlq();var st=d.getUint8(p);if(st&0x80){p++;if(st<0xF0)rs=st}else st=rs;
   if(st===0xFF){var ty=d.getUint8(p++),l=vlq();
    if(ty===0x51&&!tempo)tempo=d.getUint8(p)*65536+d.getUint8(p+1)*256+d.getUint8(p+2);
    if(ty===0x58&&!ts)ts=[d.getUint8(p),d.getUint8(p+1)];
    if(ty===0x59&&ks==null)ks=d.getInt8(p);p+=l}
   else if(st===0xF0||st===0xF7)p+=vlq();
   else{var hi=st&0xF0,ch=st&0x0F,a=d.getUint8(p++),b=(hi===0xC0||hi===0xD0)?0:d.getUint8(p++);
    if(ch===9)continue;/* canal 10 = bateria */
    var k=ch+'_'+a;if(hi===0x90&&b>0)(on[k]=on[k]||[]).push(tick);
    else if(hi===0x80||hi===0x90){var q=on[k];if(q&&q.length)notes.push({s:q.shift(),e:tick,m:a,ch:ch})}}}
  p=end;
  /* uma trilha com 2 canais (comum em MIDI de piano) vira 2 grupos */
  var bych={};notes.forEach(function(n){(bych[n.ch]=bych[n.ch]||[]).push(n)});Object.keys(bych).forEach(function(c){groups.push(bych[c])})}
 if(!groups.length)throw new Error('o arquivo não tem notas');
 var avg=function(g){return g.reduce(function(a,n){return a+n.m},0)/g.length};groups.sort(function(a,b){return avg(b)-avg(a)});
 var all=[];groups.forEach(function(g,gi){g.forEach(function(n){n.h=groups.length>=2&&gi<2?(gi===0?'d':'e'):(n.m>=60?'d':'e');all.push(n)})});
 /* acorde com arpejo (linha ondulada): o MIDI "rola" o acorde e cada nota começa um pouquinho depois, mas todas terminam juntas.
    Nota da mesma mão que começa até 0,3 tempo depois de outra e termina junto com ela entra no acorde dessa outra */
 all.sort(function(a,b){return a.s-b.s});all.forEach(function(n,i){for(var j=i-1;j>=0;j--){var m=all[j];if(n.s-m.s>div*0.3)break;
  if(m.h===n.h&&n.s>m.s&&Math.abs(m.e-n.e)<=div/16){n.s=m.s;break}}});
 /* armadura: a do arquivo; se não tiver (ou disser Dó maior), a que deixa menos notas fora da escala */
 var key=ks||0;if(!ks){var best=1e9;for(var f=-6;f<=6;f++){var ton=((f*7)%12+12)%12,sc=[0,2,4,5,7,9,11].map(function(x){return (ton+x)%12}),out=0;
   all.forEach(function(n){if(sc.indexOf(n.m%12)<0)out++});out+=Math.abs(f)*0.01*all.length;if(out<best){best=out;key=f}}}
 var beats=ts?ts[0]*4/Math.pow(2,ts[1]):4;if(!(beats>0))beats=4;
 /* ritmo arredondado para semicolcheias; nome das notas pretas pelo acorde (todas as notas que começam juntas, nas duas mãos) */
 /* quiálteras: em cada tempo, se as notas caem bem melhor na grade de 1/3 do que na de 1/4, usa 1/3 */
 var tri={},acc={};all.forEach(function(n){var x=n.s/div,b=Math.floor(x+1e-9),f=x-b;if(f<0.04||f>0.96)return;var a=acc[b]=acc[b]||{e4:0,e3:0,n:0};a.e4+=Math.abs(x*4-Math.round(x*4))/4;a.e3+=Math.abs(x*3-Math.round(x*3))/3;a.n++});
 Object.keys(acc).forEach(function(b){var a=acc[b];if(a.n>=2&&a.e3<a.e4*0.4)tri[b]=1});
 function qz(x){var b=Math.floor(x+1e-9);return tri[b]&&Math.abs(x-b)>0.04?Math.round(x*3)/3:Math.round(x*4)/4}
 all.forEach(function(n){n.sb=r12(qz(n.s/div));n.eb=Math.max(r12(n.sb+(tri[Math.floor(n.sb+1e-9)]?1/3:0.25)),r12(qz(n.e/div)))});
 /* acorde cujas notas terminam quase juntas (até 1/4 de tempo de diferença): todas terminam com a mais longa (no papel é uma figura só) */
 var gk={};all.forEach(function(n){var k=n.sb+'_'+n.h;gk[k]=Math.max(gk[k]||0,n.eb)});all.forEach(function(n){var mx=gk[n.sb+'_'+n.h];if(mx-n.eb<=0.25+1e-9)n.eb=mx});
 /* olha primeiro o acorde da própria mão; nota sozinha na mão olha tudo o que soa junto nas duas mãos */
 var on={},onH={};all.forEach(function(n){(on[n.sb]=on[n.sb]||[]).push(n);(onH[n.sb+'_'+n.h]=onH[n.sb+'_'+n.h]||[]).push(n)});
 all.forEach(function(n){var g=onH[n.sb+'_'+n.h];if(g.length<2)g=on[n.sb];n.sp=spellGroup(g.map(function(x){return x.m}),key)[g.indexOf(n)]});
 var ms=buildEvents(all.map(function(n){var mi=Math.floor(n.sb/beats+1e-9);return {mi:mi,pos:n.sb-mi*beats,len:n.eb-n.sb,h:n.h,n:n.sp,m:n.m,f:'',ts:false,tp:false}}),beats,0);
 return {id:'user_'+Date.now(),g:'user',title:fname.replace(/\.[^.]+$/,''),src:'Importada de MIDI',bpm:Math.max(30,Math.min(140,Math.round(tempo?60e6/tempo:80))),beats:beats,key:Math.max(-7,Math.min(7,key)),ms:ms,
  desc:'Importada de '+fname+'. O ritmo foi arredondado para semicolcheias: confira a partitura antes de treinar.',abs:true}}
/* ---------- ocultar e excluir músicas ---------- */
var OCULTAS=[];try{OCULTAS=JSON.parse(localStorage.getItem('piano_ocultas'))||[]}catch(e){}
function oculta(id){return OCULTAS.indexOf(id)>=0}
function setOculta(id,on){OCULTAS=OCULTAS.filter(function(x){return x!==id});if(on)OCULTAS.push(id);try{localStorage.setItem('piano_ocultas',JSON.stringify(OCULTAS))}catch(e){}showPanel()}
/* músicas que vêm no app também podem ser excluídas: ficam numa lista (comum a todos os perfis) e saem do app; dá para trazer de volta */
var EXCL=[];try{EXCL=JSON.parse(localStorage.getItem('piano_excluidas'))||[]}catch(e){}
for(var xi=EX.length-1;xi>=0;xi--)if(EXCL.indexOf(EX[xi].id)>=0)EX.splice(xi,1);
function delMusica(id){var e=byId(id);if(!e){delUser(id);return}if(!confirm('Excluir "'+e.title+'"? Some do app para todos os perfis. Se mudar de ideia, use "Trazer de volta" no fim da aba.'))return;
 EXCL.push(id);try{localStorage.setItem('piano_excluidas',JSON.stringify(EXCL))}catch(x){}EX.splice(EX.indexOf(e),1);if(CUR&&(CUR.id===id||(CUR.base&&CUR.base.id===id)))load_ex((byId('p32_yankee')||EX[0]));setOculta(id,false)}
function restaurarMusicas(){try{localStorage.setItem('piano_excluidas','[]')}catch(x){}saveAtual();location.reload()}
function delUser(id){var u=USERS.filter(function(x){return x.id===id})[0];if(!u||!confirm('Excluir "'+u.title+'" do app? Isso não dá para desfazer (o arquivo original no seu Mac continua lá).'))return;
 USERS=USERS.filter(function(x){return x.id!==id});saveUsers();if(CUR&&(CUR.id===id||(CUR.base&&CUR.base.id===id)))load_ex((byId('p32_yankee')||EX[0]));setOculta(id,false)}
/* posições absolutas para músicas importadas (com pausas) */
var _load=load_ex;load_ex=function(ex){if(!ex.abs)return _load(ex);if(run)resetAll();CUR=ex;EV=[];ex.ms.forEach(function(me,mi){me.forEach(function(ev){EV.push({dur:ev[0],notes:ev[1],midis:ev[1].map(mid),f:ev[2],h:ev[3],m:mi,dyn:ex.dynm?ex.dynm[mi]:null,pos:ev[4],beat:mi*ex.beats+ev[4],ts:ev[5]&&ev[5].s||null,tp:ev[5]&&ev[5].p||null,st:null,info:'',got:{},t0:null})})});
 EV.sort(function(a,b){return a.beat-b.beat});afterLoad();document.getElementById('exTitle').textContent=tDesc(ex.title)+maoTag();document.getElementById('exDesc').innerHTML=parcialHtml(ex)+'<b>'+ex.src+'.</b> '+tDesc(ex.desc);document.getElementById('bpm').value=ex.bpm;document.getElementById('bv').textContent=ex.bpm+' BPM';resetAll();showPanel();document.getElementById('practice').scrollIntoView({behavior:'smooth',block:'start'})};
/* ---------- controles ---------- */
function paint(){try{if(!run)paintUlt()}catch(e){}document.querySelectorAll('.mode').forEach(function(b){b.classList.toggle('on',b.dataset.v===MODE)});document.querySelectorAll('.show').forEach(function(b){b.classList.toggle('on',b.dataset.v===SHOW)});
 document.querySelectorAll('.sw').forEach(function(b){var on=OPT[b.dataset.k];b.textContent=b.dataset.n+': '+(on?'ligado':'desligado');b.classList.toggle('on',on)})}
function saveSet(){try{localStorage.setItem('piano_set',JSON.stringify({OPT:typeof optSalvar==='function'&&typeof OPTB!=='undefined'&&OPTB?optSalvar():OPT,SHOW:SHOW,lv:document.getElementById('liveVol').value,uv:document.getElementById('usbVol').value,cv:document.getElementById('clkVol').value,lat:document.getElementById('lat').value,tol:document.getElementById('tol').value,out:document.getElementById('outdev').value,clk:document.getElementById('clkdev').value,cs:document.getElementById('clksnd').value,pv:document.getElementById('pnoVol').value,pcv:document.getElementById('pclkVol').value,pre:document.getElementById('pre').value,preS:document.getElementById('preS').value,preN:document.getElementById('preN').value,alvo:document.getElementById('alvo').value,recVol:document.getElementById('recVol').value}))}catch(e){}}
try{var S=JSON.parse(localStorage.getItem('piano_set'));if(S){if(S.preN!=null)document.getElementById('preN').value=S.preN;if(S.recVol!=null){document.getElementById('recVol').value=S.recVol;document.getElementById('recVolV').textContent=S.recVol+'%'}if(S.alvo){document.getElementById('alvo').value=S.alvo;document.getElementById('alvoV').textContent=S.alvo+' BPM'}if(S.pre)document.getElementById('pre').value=S.pre==='clk'?'clk':'sec';if(S.preS!=null){document.getElementById('preS').value=S.preS;document.getElementById('preSV').textContent=S.preS+' s'}if(S.tol)document.getElementById('tol').value=S.tol;if(S.out)document.getElementById('outdev').value=S.out;if(S.clk)document.getElementById('clkdev').value=S.clk;if(S.cs)document.getElementById('clksnd').value=S.cs;[['pnoVol',S.pv],['pclkVol',S.pcv]].forEach(function(p){if(p[1]!=null){document.getElementById(p[0]).value=p[1];document.getElementById(p[0]+'V').textContent=p[1]+'%'}});Object.keys(S.OPT||{}).forEach(function(k){OPT[k]=S.OPT[k]});SHOW=S.SHOW||SHOW;['liveVol','usbVol','clkVol','lat'].forEach(function(id,i){var v=[S.lv,S.uv,S.cv,S.lat][i];if(v!=null)document.getElementById(id).value=v});
 document.getElementById('liveVolV').textContent=document.getElementById('liveVol').value+'%';document.getElementById('usbVolV').textContent=document.getElementById('usbVol').value+'%';document.getElementById('latv').textContent=document.getElementById('lat').value+' ms'}}catch(e){}
document.querySelectorAll('.mode').forEach(function(b){b.onclick=function(){if(run)resetAll();MODE=b.dataset.v;paint();resetAll();saveAtual()}});
document.querySelectorAll('.show').forEach(function(b){b.onclick=function(){SHOW=b.dataset.v;paint();render();saveSet()}});
document.querySelectorAll('.sw').forEach(function(b){b.onclick=function(){var k=b.dataset.k;OPT[k]=!OPT[k];paint();if(k==='subir')ajVis();if(k==='live'||k==='hl')render();if(AC){var n=AC.currentTime;if(k==='pno')GP.gain.setTargetAtTime(OPT.pno?1.5:0,n,0.02);if(k==='clk')GC.gain.setTargetAtTime(OPT.clk?(+document.getElementById('clkVol').value)/100:0,n,0.02);if(k==='outra')GA.gain.setTargetAtTime(OPT.outra?1.2:0,n,0.02)}render();saveSet()}});
document.getElementById('bpm').oninput=function(){document.getElementById('bv').textContent=this.value+' BPM';if(typeof paintUlt==='function'&&!run)paintUlt();if(typeof saveAtual==='function')saveAtual()};
document.getElementById('tol').onchange=saveSet;document.getElementById('clksnd').onchange=saveSet;
['pnoVol','pclkVol'].forEach(function(id){var r=document.getElementById(id);r.oninput=function(){document.getElementById(id+'V').textContent=r.value+'%';pianoVols();saveSet()}});
document.getElementById('clkdev').onchange=function(){if(run)resetAll();if(this.value==='piano'&&!MOUT)show('O piano não aparece como saída MIDI: confira o cabo USB e clique em "Conectar ao piano"',true);saveSet()};
/* toca 4 cliques (1 forte + 3 fracos) por onde estiver escolhido, para ouvir antes de começar */
document.getElementById('clkTest').onclick=function(){var c=ctx(),t=c.currentTime+0.1;if(clickPiano())drumKit();pianoVols();for(var i=0;i<4;i++)click(t+i*0.5,i===0,true)};/* o teste toca mesmo com os cliques desligados */
document.getElementById('outdev').onchange=function(){if(run)resetAll();if(this.value==='piano'&&!MOUT)show('O piano não aparece como saída MIDI: confira o cabo USB e clique em "Conectar ao piano"',true);saveSet()};
document.getElementById('lat').oninput=function(){document.getElementById('latv').textContent=this.value+' ms';saveSet()};
/* ---------- uma aba só: a aba mais nova do app assume; as antigas param (sem MIDI, sem som, sem iPhone) ---------- */
var ACTIVE=true;
(function(){if(!window.BroadcastChannel||ENSAIO||/[?&]teste\b/.test(location.search))return;/* aba de teste não toma o controle da aba principal */var bc=new BroadcastChannel('treino-piano'),ov=document.createElement('div');
 ov.style.cssText='position:fixed;inset:0;z-index:50;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6)';
 ov.innerHTML='<div class="card" style="max-width:420px;text-align:center"><h2>Esta aba está pausada</h2><p class="lb">O treino foi aberto em outra aba do Chrome. Só uma aba pode usar o piano e o iPhone ao mesmo tempo; senão as duas brigam pelas notas.</p><button class="big" id="useHere">Usar esta aba</button></div>';
 document.body.appendChild(ov);
 function sleep(){if(!ACTIVE)return;reg('outra aba do Mac assumiu');ACTIVE=false;if(run)resetAll();if(midi)midi.onstatechange=null;if(curIn)curIn.onmidimessage=null;curIn=null;
  if(USB){USB=false;stopUsb();paintAudio()}stat(false,'Pausado: o app está aberto em outra aba');ov.style.display='flex'}
 function wake(){reg('esta aba assumiu');ACTIVE=true;ov.style.display='none';bc.postMessage('assumi');connectMidi(true);window.dispatchEvent(new Event('focus'))}
 bc.onmessage=function(e){if(e.data==='assumi')sleep()};
 document.getElementById('useHere').onclick=wake;
 bc.postMessage('assumi')})();
/* ---------- instalar como app: Mac (Chrome) e celulares (QR com o endereço atual do Mac) ---------- */
function instHtml(i){var ipu='http://'+i.ip+':'+i.port+'/celular.html',u=i.host?'http://'+i.host+':'+i.port+'/celular.html':ipu,q=typeof QRsvg==='function'?QRsvg(u,170):'',inst=false;try{inst=matchMedia('(display-mode: standalone)').matches}catch(e){}
 return '<div class="inst"><div><b>No Mac</b>'+(inst?'<p>✓ Já está aberto como app.</p>':'<p>No Chrome, clique no ícone de instalar no fim da barra de endereço (um monitor com uma seta). Se ele não aparecer: menu ⋮ → Transmitir, salvar e compartilhar → Instalar página como app.</p>')+
  '<p class="lb">O app ganha ícone no Dock e janela própria. O piano e os seus dados continuam iguais.</p></div>'+
  '<div><b>No celular</b>'+(q?'<div class="qr">'+q+'</div>':'')+'<p>Aponte a câmera do celular para o código, ou digite <b>'+u+'</b>.'+(u!==ipu?' Se não abrir, use o número: <b>'+ipu+'</b>.':'')+'</p>'+
  '<p><b>iPhone:</b> no Safari, Compartilhar → Adicionar à Tela de Início → Adicionar.<br><b>Samsung:</b> no Chrome, menu ⋮ → Adicionar à tela inicial → Instalar.</p>'+
  '<p class="lb">Os ajustes do celular (tema, letra, deitado, tela acesa) passam sozinhos para o app novo. O endereço usa o nome do Mac, que não muda quando o roteador reinicia. Se você já tinha instalado pelo número, o celular oferece trocar sozinho.</p></div></div>'}
/* ---------- tela no iPhone (celular.html): o Mac manda a tela do treino e recebe os botões ---------- */
/* com ?teste no endereço (testes do Claude) a página não fala com o iPhone nem toma o controle da aba principal */
(function(){if(!/^https?:/.test(location.protocol)||(/[?&]teste\b/.test(location.search)&&!ENSAIO))return;
 var pr=document.getElementById('practice'),ver=Date.now(),last='',tm=false,since=null;
 /* o iPhone pode ver a partitura inteira mesmo quando o Mac mostra só 2 linhas: então ela é desenhada à parte para ele */
 var CELV='linha';
 /* a inteira vai só quando muda com o exercício parado (é grande); tocando, vão só as 2 linhas da música (score), que o iPhone encaixa nela */
 var lastFull='';
 function celFull(){if(CELV!=='tudo'||VIS==='fall'||(run&&lastFull)||(ASS&&lastFull&&Date.now()-(celFull.t||0)<1000))return null;var t=document.createElementNS(NS,'svg');t.setAttribute('width','100%');drawScore(t,true);var h=t.outerHTML;if(h===lastFull)return null;lastFull=h;celFull.t=Date.now();return h}
 function allEx(){return EX.concat(USERS)}
 function snap(){var g=function(id){return document.getElementById(id)};
  return JSON.stringify({title:g('exTitle').textContent+(CUR&&CUR.parcial?' · ⚠ Incompleta':''),cd:g('cd').innerHTML,score:VIS==='fall'?'':g('score').outerHTML,scoreFull:celFull(),recv:+document.getElementById('recVol').value,alvo:+document.getElementById('alvo').value,perfis:PERFIS,perfil:PERFIL,pre:document.getElementById('pre').value,preS:+document.getElementById('preS').value,preN:+document.getElementById('preN').value,tr:(function(){var n=linhas();if(n<2)return null;var src=CUR.base||CUR,per=perTr(src),l=[];for(var i=1;i<=n;i++)l.push('Linha '+i+' (comp. '+((i-1)*per+1)+'–'+Math.min(i*per,src.ms.length)+')');return {l:l,v:trAtual()}})(),mao:MAO,celv:CELV,
   /* queda de notas: as notas e o relógio da música (hora do Mac em que começa o tempo 0); o iPhone anima sozinho */
   rel:seguro(relSnap),sel:seguro(selSnap),pausa:!!PAUSA,somk:(typeof PG!=='undefined'&&PG.somk)||null,somenv:(typeof PG!=='undefined'&&PG.somenv)||null,fall:VIS==='fall'?{m:fallSnap(),t0:startPerf?Date.now()-performance.now()+startPerf:0,spb:spb,run:run||!!ASS,mode:ASS?'time':MODE,wb:run&&MODE==='wait'?waitBeat():null,nbP:PAUSA?PAUSA.nb:null,played:played}:null,kb:OPT.kb?g('kb').outerHTML:'',errs:(function(){var h=g('errs').innerHTML,i=h.lastIndexOf(' · ');return i<0?h:h.slice(i+3)})(),res:ASS?'':g('res').innerHTML,saida:typeof JG!=='undefined'&&JG?JG.saida:'piano',som:typeof SOMCEL!=='undefined'&&SOMCEL&&Date.now()-SOMCEL.t<4000?SOMCEL:null,ult:run?'':g('exUlt').innerHTML,jogo:seguro(jSnap),conc:seguro(concCel),ini:run?null:seguro(celInicio),ritn:seguro(function(){return Object.keys(RITN).map(function(k){return [k,RITN[k].t]})}),festa:FESTA&&Date.now()-FESTA.ts<6000?FESTA:null,
   run:run||!!ASS,ass:!!ASS,ver:assPode(),mode:ASS?'time':MODE,show:SHOW,opt:OPT,bpm:+g('bpm').value,midi:g('midiStat').innerHTML,cur:CUR&&CUR.id,ink:getComputedStyle(document.body).getPropertyValue('--ink').trim()||'#1f1f1d',
   sy:curSys(),hid:document.hidden,tol:document.getElementById('tol').value,out:document.getElementById('outdev').value,clk:document.getElementById('clkdev').value,cs:document.getElementById('clksnd').value,nomes:NOMES,lin:seguro(linSnap),esp:seguro(espSnap),celaj:seguro(function(){return JSON.parse(localStorage.getItem('piano_celaj')||'null')}),pv:+document.getElementById('pnoVol').value,pcv:+document.getElementById('pclkVol').value,ex:allEx().filter(function(e){return !oculta(e.id)&&livroVisivel(e)}).map(function(e){return [e.g,e.id,e.title]})})}
 /* só uma aba do Mac comanda o iPhone: vira dona ao abrir, ao ganhar foco ou ao receber nota do piano */
 var SRC='m'+Math.random().toString(36).slice(2),claim=true;
 /* ensaio da versão nova: monta a tela do iPhone uma vez (se der erro, a versão nova é recusada) e não envia nada */
 if(ENSAIO){snap();return}
 function send(){tm=false;if(!ACTIVE)return;var s=snap();if(s===last&&!claim)return;last=s;ver++;var cl=claim;claim=false;
  /* t = hora do envio, para o iPhone medir o atraso */
  fetch('/api/estado?v='+ver+'&src='+SRC+(cl?'&claim=1':''),{method:'POST',body:s.slice(0,-1)+',"t":'+Date.now()+'}'}).catch(function(){last=''})}
 /* sem setTimeout: o Chrome atrasa relógios quando a janela do Mac fica escondida */
 function soon(){if(!tm){tm=true;Promise.resolve().then(send)}}
 window.CEL_SOON=soon;
 /* sinal de vida: reenvia a tela a cada 10 s, mesmo sem mudança. Sem isso, com o Mac parado o celular achava
    que a conexão tinha caído (ele espera uma tela nova em até 30 s) */
 window.CEL_BEAT=function(){last='';soon()};
 function mine(){if(!ACTIVE)return;claim=true;soon()}
 window.addEventListener('focus',mine);document.addEventListener('pointerdown',mine);
 var mo=new MutationObserver(soon);mo.observe(pr,{subtree:true,childList:true,characterData:true,attributes:true});mo.observe(document.getElementById('midiStat'),{subtree:true,childList:true,characterData:true});
 new MutationObserver(mine).observe(document.getElementById('last'),{subtree:true,childList:true,characterData:true});
 function exec(c){var q=function(s){return document.querySelector(s)};/* mexer no celular conta como uso: o Mac não se atualiza nem recarrega no meio */if(c&&c.cmd!=='celaj'&&c.cmd!=='celvista'&&c.cmd!=='celfull')LASTUSE=Date.now();if(c&&c.cmd!=='midi'&&c.cmd!=='celaj'&&c.cmd!=='somfonte'&&c.cmd!=='iphcabo')reg('celular: '+JSON.stringify(c).slice(0,160));
  if(c.cmd==='assistir'){assistir();return}if(c.cmd==='go')q('#go').click();else if(c.cmd==='reset')q('#reset').click();
  else if(c.cmd==='ex'){var e=allEx().filter(function(x){return x.id===c.id})[0];if(e){load_ex(e);document.getElementById('practice').scrollIntoView()}}
  else if(c.cmd==='mode'){var b=q('.mode[data-v="'+c.v+'"]');if(b)b.click()}
  else if(c.cmd==='show'){var b=q('.show[data-v="'+c.v+'"]');if(b)b.click()}
  else if(c.cmd==='sw'){var b=q('.sw[data-k="'+c.v+'"]');if(b)b.click()}
  else if(c.cmd==='clkout'){var k=document.getElementById('clkdev');k.value=c.v==='piano'?'piano':'mac';k.onchange();ajVis()}
  else if(c.cmd==='pvol'||c.cmd==='pcvol'){var r=document.getElementById(c.cmd==='pvol'?'pnoVol':'pclkVol');r.value=Math.max(0,Math.min(100,+c.v));r.oninput()}
  else if(c.cmd==='act'&&typeof c.v==='string')doAct(c.v);
  else if(c.cmd==='vis')setVis(c.v);
  else if(c.cmd==='mao')setMao(c.v);
  else if(c.cmd==='alvo'){var al=document.getElementById('alvo');al.value=Math.max(40,Math.min(160,+c.v));al.oninput();ajVis()}
  else if(c.cmd==='ouvir')ouvir();
  else if(c.cmd==='recvol'){var rv=document.getElementById('recVol');rv.value=Math.max(0,Math.min(600,+c.v));rv.oninput()}
  else if(c.cmd==='perfil'&&!run)usarPerfil(c.v);
  /* jogo das notas, conceitos, rotina e facilidades pelo iPhone */
  else if(c.cmd==='jabrir')jAbrir();
  else if(c.cmd==='jsair'){if(JG.on)jParar();JG.vis=false}
  else if(c.cmd==='jgo'||c.cmd==='jdica'||c.cmd==='joit'||c.cmd==='jsom'||c.cmd==='jtec'){if(!document.getElementById('jogo'))jAbrir();var jb=document.getElementById({jgo:'jgGo',jdica:'jgDica',joit:'jgOit',jsom:'jgSom',jtec:'jgTec'}[c.cmd]);if(jb)jb.click()}
  else if(c.cmd==='jnivel'&&JN.some(function(x){return x.id===c.v})){if(!document.getElementById('jogo'))jAbrir();var js=document.getElementById('jgNivel');js.value=c.v;js.onchange()}
  else if(c.cmd==='jmodo'&&JMODOS.indexOf(c.v)>=0){if(!document.getElementById('jogo'))jAbrir();var jm=document.querySelector('.jgModo[data-v="'+c.v+'"]');if(jm)jm.click()}
  else if(c.cmd==='jtecla'&&+c.v>0)jTelaTecla(+c.v);
  else if(c.cmd==='ajx'&&AJXK.indexOf(c.k)>=0)ajxDefine(c.k,!!c.v);
  else if(c.cmd==='jsaida'&&['piano','mac','celular'].indexOf(c.v)>=0){JG.saida=c.v;jsSave();var js2=document.getElementById('jgSaida');if(js2)js2.value=c.v;jSoon()}
  else if(c.cmd==='conc')CONC_REQ=Date.now();
  else if(c.cmd==='csom'&&CONC[+c.v]&&CONC[+c.v].som)tocarSeq(CONC[+c.v].som.map(function(x){return [x[0],x[1],x[2],x[3]||0.8]}));
  else if(c.cmd==='prox')proximaEtapa();
  else if(c.cmd==='retoma'&&typeof c.v==='string')retomar(c.v);else if(c.cmd==='trabrir'&&typeof c.v==='string')trAbrir(c.v);
  else if(c.cmd==='etapa'&&typeof c.v==='string')abrirEtapa(c.v,!!c.test);
  else if(c.cmd==='rnovo'&&RITN[c.v])ritmoNovo(c.v);
  else if(c.cmd==='pre'&&!run){var pe=document.getElementById('pre');pe.value=c.v==='clk'?'clk':'sec';if(c.n!=null)document.getElementById('preN').value=Math.max(0,Math.min(10,Math.round(+c.n)));if(c.s!=null){var r=document.getElementById('preS');r.value=Math.max(0,Math.min(10,+c.s));r.oninput()}ajVis();saveSet()}
  else if(c.cmd==='trecho')trecho(c.a,c.b);
  else if(c.cmd==='selm')selToque(+c.v);else if(c.cmd==='selrep')selRepetir();else if(c.cmd==='seluma')selUmaVez();else if(c.cmd==='selclr')selLimpar();else if(c.cmd==='selpara'){loopParar();if(run)resetAll()}else if(c.cmd==='selerr')selErros();
  else if(/^rep(ouvir|parar|audio)$/.test(c.cmd))repCmd(c);
  else if(c.cmd==='somvideo')svCmd(c);
  else if(c.cmd==='iphcabo')iphCabo(c.v);
  else if(c.cmd==='somfonte')SOMT=c.v?Date.now():0;
  else if(c.cmd==='midi')midiIphone(c.m,c.som);
  else if(c.cmd==='celvista'){CELV=c.v==='tudo'?'tudo':'linha';lastFull=''}
  else if(c.cmd==='celaj'&&c.v&&/^(iphone|android|outro)$/.test(c.v.d)&&c.v.a&&typeof c.v.a==='object'){var ca=seguro(function(){return JSON.parse(localStorage.getItem('piano_celaj')||'{}')})||{};ca[c.v.d]=c.v.a;try{localStorage.setItem('piano_celaj',JSON.stringify(ca))}catch(e){}}
  else if(c.cmd==='celfull')lastFull='';
  else if(c.cmd==='nomes')setNomes(c.v);
  else if(c.cmd==='clksnd'&&CLKS[c.v]){document.getElementById('clksnd').value=c.v;saveSet()}
  else if(c.cmd==='clktest')document.getElementById('clkTest').click();
  else if(c.cmd==='out'){var o=document.getElementById('outdev');o.value=c.v==='piano'?'piano':'mac';o.onchange();ajVis()}
  else if(c.cmd==='tol'&&TOL[c.v]){document.getElementById('tol').value=c.v;saveSet()}
  else if(c.cmd==='bpm'&&!run){var r=q('#bpm');r.value=Math.max(30,Math.min(140,+c.v));r.oninput()}
  soon()}
 /* espera comandos do iPhone; o servidor responde na hora em que chega um (ou após 20 s, que serve de sinal de vida) */
 function poll(){fetch('/api/cmd?wait=1&src='+SRC+(since!=null?'&id='+since:''),{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){
   if(since!=null&&j.last>=since&&ACTIVE)j.cmds.forEach(exec);/* na primeira vez, os comandos antigos são ignorados */
   since=j.last;if(!j.cmds.length){last='';send()}poll()}).catch(function(){setTimeout(poll,1000)})}
 poll();send();
 fetch('/api/info').then(function(r){return r.json()}).then(function(i){if(!i.ip)return;var d=document.createElement('div');d.className='lb';d.style.marginTop='4px';
  d.innerHTML='<button id="airBtn">📱 Mandar para o iPhone (AirDrop)</button> <button id="instBtn">Instalar como app</button> <span id="airStat">Ou abra no Safari do iPhone (mesmo Wi-Fi): <b>http://'+i.ip+':'+i.port+'/celular.html</b></span>';
  document.getElementById('audStat').after(d);
  document.getElementById('instBtn').onclick=function(){var b=document.getElementById('instBox');if(!b){b=document.createElement('div');b.id='instBox';d.after(b)}else if(!b.hidden){b.hidden=true;return}b.innerHTML=instHtml(i);b.hidden=false};
  document.getElementById('airBtn').onclick=function(){fetch('/api/airdrop').then(function(){document.getElementById('airStat').innerHTML='Na janela do AirDrop que abriu, clique no seu iPhone. Como é a mesma conta Apple, ele abre sozinho no Safari.'})}}).catch(function(){})})();
/* ---------- áreas que minimizam e nomes das notas ---------- */
document.querySelectorAll('details.fold').forEach(function(d){try{var v=localStorage.getItem('fold_'+d.id);if(v!==null)d.open=v==='1'}catch(e){}
 d.addEventListener('toggle',function(){try{localStorage.setItem('fold_'+d.id,d.open?'1':'0')}catch(e){}})});
(function(){var ms=document.getElementById('midiStat'),cs=document.getElementById('conSum');function f(){cs.innerHTML=ms.innerHTML}f();new MutationObserver(f).observe(ms,{subtree:true,childList:true,characterData:true})})();
function paintNomes(){document.querySelectorAll('.nmb').forEach(function(b){var on=b.dataset.v===NOMES;b.classList.toggle('on',on)});
 document.getElementById('kbHint').textContent='Sem piano? Teclado do computador: Z X C V = '+[55,57,59,60].map(chrT).join(' ')+' (grave) · A S D F G H J K = '+[60,62,64,65,67,69,71,72].map(chrT).join(' ')+' (a partir do '+chrT(60)+' central).'}
function setNomes(v){NOMES=v==='pt'?'pt':'en';try{localStorage.setItem('piano_nomes',NOMES)}catch(e){}paintNomes();
 if(CUR){document.getElementById('exTitle').textContent=tDesc(CUR.title);document.getElementById('exDesc').innerHTML=parcialHtml(CUR)+(CUR.src?'<b>'+CUR.src+'.</b> ':'')+tDesc(CUR.desc)}
 var l=document.getElementById('last');if(LASTM!=null)l.textContent=mname(LASTM);render();showPanel()}
document.querySelectorAll('.nmb').forEach(function(b){b.onclick=function(){setNomes(b.dataset.v)}});
/* ---------- queda de notas (Mac): Ajustes → Visualização → Queda de notas ---------- */
var VIS='score';try{VIS=localStorage.getItem('piano_vis')||'score'}catch(e){}
/* modelo para o queda.js: [tempo, duração, midi, mão, dedo, estado, nome] (nota "qualquer tecla" = midi null) */
function fallModel(){if(!CUR)return null;var notes=[];allEv().forEach(function(e){if(e.tcd)return;if(e.midis)e.midis.forEach(function(m,j){var i=e.nidx?e.nidx[j]:j;notes.push([e.beat,e.dur,m,e.h,(e.f||'').split('-')[i]||e.f||'',e.x?'x':e.st||null,e.notes?nmT(e.notes[i]):''])});else notes.push([e.beat,e.dur,null,e.h,e.f||'',e.st||null,''])});
 if(!CUR._rng||CUR._rngN!==notes.length){CUR._rng=Queda.range(notes);CUR._rngN=notes.length}return {lo:CUR._rng[0],hi:CUR._rng[1],beats:CUR.beats,notes:notes,x:typeof selQueda==='function'?selQueda():null}}
/* para o celular: a música da queda (27 KB numa música grande) só vai quando muda, ou a cada 4 s para quem acabou de
   conectar; a cor de cada nota vai sempre, numa letra por nota (st). Antes ia inteira ~17 vezes por segundo e o celular engasgava. */
var FSN={k:'',t:0};
function fallSnap(){var M=fallModel();if(!M)return null;var st='',cod={ok:'o',warn:'w',bad:'b',miss:'m',x:'x'},
  base=M.notes.map(function(n){st+=n[5]?(cod[n[5]]||'.'):'.';return [n[0],n[1],n[2],n[3],n[4],null,n[6]]}),js=JSON.stringify(base),h=7,i;
 for(i=0;i<js.length;i++)h=(h*31+js.charCodeAt(i))|0;var k=base.length+'.'+(h>>>0).toString(36),full=k!==FSN.k||Date.now()-FSN.t>4000;if(full){FSN.k=k;FSN.t=Date.now()}
 return {k:k,st:st,x:M.x,lo:M.lo,hi:M.hi,beats:M.beats,notes:full?base:null}}
/* tempo atual em tempos: com tempo = relógio da música; espera = desliza até a nota da vez; parado = um pouco antes da 1ª nota */
var FNB=null;
function waitBeat(){if(WT)return WT.beat;var g=curGroup();return g.length?g[0].beat:(EV.length?EV[EV.length-1].beat+EV[EV.length-1].dur:0)}
var FOFF=0;
function macNb(){if(ASS)return assNb();if(run&&MODE==='time'&&startPerf)return (performance.now()-startPerf)/1000/spb;if(run&&MODE==='wait'&&WT){FNB=WT.beat;return FNB}
 var t=run&&MODE==='wait'?waitBeat():PAUSA?PAUSA.nb:(EV.length?EV[0].beat-1:0);t+=FOFF;FNB=FNB==null?t:FNB+(t-FNB)*0.18;if(Math.abs(t-FNB)<0.002)FNB=t;return FNB}
var FLOOP=false;
function fallStart(){if(FLOOP)return;FLOOP=true;(function f(){if(VIS!=='fall'){FLOOP=false;return}
 var cv=document.getElementById('fallCv'),dark=matchMedia('(prefers-color-scheme: dark)').matches;
 Queda.draw(cv,fallModel(),macNb(),{dark:dark,live:liveFb(),played:played,show:SHOW,cName:function(m){return chrT(m)+(Math.floor(m/12)-1)}});
 requestAnimationFrame(f)})()}
/* parado ou pausado: a roda do mouse / o trackpad rola a queda para ver a música toda */
document.getElementById('fallCv').addEventListener('wheel',function(e){if(run||!CUR)return;e.preventDefault();var tot=CUR.ms.length*CUR.beats,b0=PAUSA?PAUSA.nb:(EV.length?EV[0].beat-1:0);FOFF=Math.max(-2-b0,Math.min(tot-b0,FOFF-e.deltaY/Queda.ppb(this)))},{passive:false});
/* tocar na queda de notas escolhe o compasso daquela altura */
document.getElementById('fallCv').addEventListener('click',function(e){if(!CUR||run)return;var r=this.getBoundingClientRect(),b=Queda.beatAt(this,macNb(),e.clientY-r.top);if(b==null)return;var i=Math.floor(b/CUR.beats);if(i>=0&&i<CUR.ms.length)selToque(selNum(i))});
function paintVis(){document.querySelectorAll('.vis').forEach(function(b){b.classList.toggle('on',b.dataset.v===VIS)})}
function setVis(v){VIS=v==='fall'?'fall':'score';try{localStorage.setItem('piano_vis',VIS)}catch(e){}FNB=null;paintVis();render()}
document.querySelectorAll('.vis').forEach(function(b){b.onclick=function(){setVis(b.dataset.v)}});paintVis();

/* ---------- treinar uma mão só ----------
   A outra mão continua na partitura, apagada, não conta na nota e (no modo com tempo) o app pode tocá-la para você ouvir a música inteira */
var MAO='ambas',EVX=[];try{MAO=localStorage.getItem('piano_mao')||'ambas'}catch(e){}
function allEv(){var a=EV;if(EVX&&EVX.length)a=a.concat(EVX);if(EVD&&EVD.length)a=a.concat(EVD);return a}
/* nota repetida sem dedo escrito (o livro só escreve na 1ª): usa o mesmo dedo da anterior */
function repeatFingers(){['d','e'].forEach(function(h){var prev=null;EV.filter(function(e){return e.h===h}).sort(function(a,b){return a.beat-b.beat}).forEach(function(e){
  if(!e.f&&prev&&prev.f&&e.midis&&prev.midis&&e.midis.join()===prev.midis.join())e.f=prev.f;prev=e})})}
function afterLoad(){linkTies();autoFingers(EV);repeatFingers();EVX=[];CUR._mao=null;CUR._per=null;CUR._ons=null;CUR._rst=null;CUR._hands=null;CUR._lhg=null;
 if(MAO!=='ambas'){var mine=EV.filter(function(e){return e.h===MAO});
  if(mine.length&&mine.length<EV.length){EVX=EV.filter(function(e){return e.h!==MAO});EVX.forEach(function(e){e.x=true});EV=mine;CUR._mao=MAO}}
 EVD.forEach(function(e){e.x=!!CUR._mao&&e.h!==CUR._mao});
 paintTrecho();setTimeout(function(){saveAtual();paintUlt()},0);try{if(typeof OPTB!=='undefined'&&OPTB&&OPTB.cnt!==undefined)ajxAplica()}catch(e){}}
function maoTag(){return CUR&&CUR._mao?' · só a mão '+(CUR._mao==='d'?'direita':'esquerda'):''}
function paintMao(){document.querySelectorAll('.mao').forEach(function(b){b.classList.toggle('on',b.dataset.v===MAO)});ajVis()}
function setMao(v){MAO=v==='d'||v==='e'?v:'ambas';try{localStorage.setItem('piano_mao',MAO)}catch(e){}paintMao();if(CUR){var y=window.scrollY;load_ex(CUR);window.scrollTo(0,y)}}
document.querySelectorAll('.mao').forEach(function(b){b.onclick=function(){setMao(b.dataset.v)}});
/* ---------- dedos sugeridos (partitura importada sem dedilhado) ----------
   O conversor de PDF não lê os números de dedo. Para cada mão o app escolhe os dedos da música inteira de uma vez,
   preferindo: ficar na mesma posição (um dedo por tecla branca vizinha), passar o polegar por baixo nas escalas,
   não repetir o mesmo dedo em notas diferentes seguidas, polegar fora das teclas pretas e acordes com a mão o menos aberta possível */
function combos(k){var r=[];(function f(s,a){if(a.length===k){r.push(a.slice());return}for(var i=s;i<=5;i++){a.push(i);f(i+1,a);a.pop()}})(1,[]);return r}
function autoFingers(evs){['d','e'].forEach(function(h){var R=h==='d';
  var L=evs.filter(function(e){return e.h===h&&e.notes&&e.notes.length&&e.notes.length<=5}).sort(function(a,b){return a.beat-b.beat});
  if(!L.length||L.some(function(e){return e.f}))return;
  /* estados possíveis de cada nota/acorde: que dedo em cada nota, onde fica o polegar (t) e o custo de tocar assim */
  var ST=L.map(function(e,ei){var ord=e.notes.map(function(n,i){return {i:i,d:n[0],m:(e.midis0||e.midis)[i]}}).sort(function(a,b){return a.m-b.m}),lo=1e9,hi=-1e9;
   for(var j=Math.max(0,ei-4);j<=Math.min(L.length-1,ei+4);j++)L[j].notes.forEach(function(n){lo=Math.min(lo,n[0]);hi=Math.max(hi,n[0])});
   return combos(ord.length).map(function(c){var fs=R?c:c.slice().reverse(),ts=[],cost=0,fin=[];
    ord.forEach(function(o,j){var f=fs[j];fin[o.i]=f;ts.push(R?o.d-(f-1):o.d+(f-1));if(isB(o.m)){if(f===1)cost+=1.5;if(f===5)cost+=0.6}
     var nat=R?1+(o.d-lo)*4/Math.max(4,hi-lo):5-(o.d-lo)*4/Math.max(4,hi-lo);cost+=0.15*Math.abs(f-nat)});
    cost+=(Math.max.apply(null,ts)-Math.min.apply(null,ts))*1.2;
    return {f:fin,t:ts.reduce(function(a,b){return a+b},0)/ts.length,c:cost,one:ord.length===1?{d:ord[0].d,m:ord[0].m,f:fs[0]}:null}})});
  function trans(a,b,A,B){var free=b.beat-(a.beat+a.dur)>=0.49||a.dur>=2;
   if(A.one&&B.one){var d=B.one.d-A.one.d,s=R?d:-d,fa=A.one.f,fb=B.one.f;
    if(A.one.m===B.one.m)return fa===fb?0:0.6;
    if(!free){if(fa===fb)return 4+Math.abs(d)*0.3;
     if(s>0&&fb<fa)return fb===1&&fa<=4&&s<=4?1.6:9;/* polegar passa por baixo */
     if(s<0&&fb>fa)return fa===1&&fb<=4&&-s<=4?1.6:9}}/* dedo passa por cima do polegar */
   var sh=Math.abs(B.t-A.t),c=sh<=1?sh*0.5:0.5+(sh-1)*1.1;return free?c*0.4:c}
  var V=ST[0].map(function(s){return s.c}),BK=[null];
  for(var i=1;i<L.length;i++){var nv=[],bk=[];ST[i].forEach(function(sb){var best=1e18,bi=0;ST[i-1].forEach(function(sa,q){var c=V[q]+trans(L[i-1],L[i],sa,sb);if(c<best){best=c;bi=q}});nv.push(best+sb.c);bk.push(bi)});V=nv;BK.push(bk)}
  var k=V.indexOf(Math.min.apply(null,V));for(i=L.length-1;i>=0;i--){L[i].f=ST[i][k].f.join('-');L[i].fa=true;if(i)k=BK[i][k]}})}
/* contagem escrita na nota: o tempo em que ela começa ("1", "2"…); no meio do tempo "e"; semicolcheias "1 i e a"; nota longa mostra os tempos que segura (1-2-3) */
function cntLab(pos,dur){var sy=['','i','e','a'];function one(p){var b=Math.floor(p+1e-6),f=Math.round((p-b)*4)%4;if(Math.abs((p-b)*3-Math.round((p-b)*3))<1e-6&&Math.abs((p-b)*4-Math.round((p-b)*4))>1e-6)return '·';return f?sy[f]:String(b+1)}
 var l=[];for(var b=Math.floor(pos+1e-6)+1;b<pos+dur-1e-6;b++)l.push(String(b+1));
 /* começa no meio do tempo: os tempos que ela segura vão entre parênteses, ex.: "e(2)" */
 return one(pos)===String(Math.floor(pos+1e-6)+1)?[one(pos)].concat(l).join('-'):one(pos)+(l.length?'('+l.join('-')+')':'')}
/* ---------- zoom da partitura inteira: botões − + e "Largura da tela" (100%), ou pinça no trackpad ---------- */
var ZOOM=1;try{ZOOM=+localStorage.getItem('piano_zoom')||1}catch(e){}
function zoomUi(sys){var vb=document.getElementById('vistaBtn'),zb=document.getElementById('zoomBox'),box=document.getElementById('scoreBox'),s=document.getElementById('score'),full=VISTA==='inteira'&&sys>2;
 vb.style.display=sys>2?'':'none';vb.textContent=VISTA==='inteira'?'Ver só 2 linhas (segue a música)':'Ver a partitura inteira ('+sys+' linhas)';
 zb.style.display=full?'':'none';box.classList.toggle('full',full);s.style.width=full?Math.round(ZOOM*100)+'%':'';document.getElementById('zV').textContent=Math.round(ZOOM*100)+'%';
 /* tocando: a caixa rola sozinha até a linha da música */
 if(full&&run){var c=curSys();if(c!==zoomUi.last){zoomUi.last=c;/* medida da própria caixa (não da tela): certa também com a letra maior (zoom) */var h=box.scrollHeight*230/(sys*230+10),y=Math.max(0,c*h-8);
   /* a linha da música sobe para o topo da caixa; a seguinte aparece logo abaixo */
   if(Math.abs(y-box.scrollTop)>4)box.scrollTop=y}}else zoomUi.last=null}
function setZoom(z,cx,cy){var box=document.getElementById('scoreBox'),s=document.getElementById('score'),r=box.getBoundingClientRect();cx=cx==null?r.width/2:cx;cy=cy==null?r.height/2:cy;
 var fx=(box.scrollLeft+cx)/Math.max(1,s.clientWidth),fy=(box.scrollTop+cy)/Math.max(1,s.clientHeight);
 ZOOM=Math.max(0.25,Math.min(3,z));try{localStorage.setItem('piano_zoom',ZOOM)}catch(e){}
 s.style.width=Math.round(ZOOM*100)+'%';document.getElementById('zV').textContent=Math.round(ZOOM*100)+'%';box.scrollLeft=fx*s.clientWidth-cx;box.scrollTop=fy*s.clientHeight-cy}
document.getElementById('zIn').onclick=function(){setZoom(ZOOM*1.25)};
document.getElementById('zOut').onclick=function(){setZoom(ZOOM/1.25)};
document.getElementById('zFit').onclick=function(){setZoom(1)};
document.getElementById('scoreBox').addEventListener('wheel',function(e){var box=this;if(!e.ctrlKey||!box.classList.contains('full'))return;e.preventDefault();var r=box.getBoundingClientRect();setZoom(ZOOM*Math.exp(-e.deltaY*0.01),e.clientX-r.left,e.clientY-r.top)},{passive:false});
/* partitura longa: só 2 linhas que seguem a música, ou a inteira (botão acima da partitura) */
/* nos Ajustes, só mostra o que vale para a saída escolhida (ex.: volume no piano só quando sai pelo piano) */
function ajVis(){var o=document.getElementById('outdev').value,k=document.getElementById('clkdev').value,m={'pno-piano':o==='piano','clk-piano':k==='piano','clk-mac':k!=='piano',mao1:MAO!=='ambas','pre-sec':document.getElementById('pre').value!=='clk','pre-clk':document.getElementById('pre').value==='clk',subir:!!OPT.subir};
 document.querySelectorAll('[data-only]').forEach(function(d){d.style.display=m[d.dataset.only]?'':'none'})}
['outdev','clkdev'].forEach(function(id){document.getElementById(id).addEventListener('change',ajVis)});ajVis();
document.getElementById('pre').addEventListener('change',function(){ajVis();saveSet()});
document.getElementById('preN').addEventListener('change',saveSet);
document.getElementById('preS').oninput=function(){document.getElementById('preSV').textContent=this.value+' s';saveSet()};
document.getElementById('trGo').onclick=function(){trecho(document.getElementById('trA').value,document.getElementById('trB').value)};
document.getElementById('trAll').onclick=function(){trecho(1,linhas())};
/* escolheu a 1ª linha depois da última: a última acompanha */
document.getElementById('trA').onchange=function(){var b=document.getElementById('trB');if(+b.value<+this.value)b.value=this.value};
document.getElementById('trB').onchange=function(){var a=document.getElementById('trA');if(+a.value>+this.value)a.value=this.value};
document.getElementById('vistaBtn').onclick=function(){VISTA=VISTA==='inteira'?'linhas':'inteira';try{localStorage.setItem('piano_vista',VISTA)}catch(e){}render()};
document.getElementById('perfilSel').onchange=function(){usarPerfil(this.value)};document.getElementById('perfilNovo').onclick=novoPerfil;document.getElementById('perfilRen').onclick=renomearPerfil;document.getElementById('perfilDel').onclick=excluirPerfil;paintPerfil();
/* ---------- onde você está no livro ----------
   Cada perfil guarda a página em que está (aba Livro: "Estou na página"). Exercícios do livro de páginas depois dela ficam escondidos.
   O arquivo livro-progresso.json (na pasta do app) é atualizado pelo Claude quando você conta em que página está; o mais recente vale */
var UNID=[[8,27,'U1 Introdução'],[28,41,'U2 Orientação à pauta'],[42,49,'U3 Reforço de leitura'],[50,61,'U4 Mais leitura'],[62,69,'U5 Clave de Fá'],[70,81,'U6 Colcheias'],[82,89,'U7 Espaços F-A-C-E'],[90,95,'U8 Pentascala de Dó'],[96,103,'U9 Pentascalas de Sol'],[104,115,'U10 Sustenidos e bemóis'],[116,127,'U11 Intervalos 4ª, 5ª, 6ª'],[128,133,'U12 Escala de Dó maior'],[134,141,'U13 Acorde G7'],[142,153,'U14 Acordes I-IV-V7 em Dó'],[154,159,'U15 Escala de Sol maior'],[160,180,'U16 Acordes em Sol e revisão']];
var PAGLIV={p:33,t:0};try{var pl_=JSON.parse(localStorage.getItem('piano_pagina'));if(pl_&&pl_.p)PAGLIV=pl_}catch(e){}
function pagOf(e){var m=/p\.\s*(\d+)/.exec(e.src||'');return m?+m[1]:0}
function livroVisivel(e){return !(e.g==='livro'||e.g==='aq')||!PAGLIV||pagOf(e)<=PAGLIV.p}/* PAGLIV ainda não lido no comecinho do app: mostra tudo */
function unidade(p){var u=UNID.filter(function(x){return p>=x[0]&&p<=x[1]})[0];return u?u[2]:''}
function setPagina(p,t){p=Math.max(8,Math.min(180,Math.round(+p)||33));PAGLIV={p:p,t:t||Date.now()};try{localStorage.setItem('piano_pagina',JSON.stringify(PAGLIV))}catch(e){}showPanel()}
function paginaHtml(){var o=UNID.map(function(u){var s='<optgroup label="'+u[2]+'">';for(var p=u[0];p<=u[1];p++)s+='<option value="'+p+'"'+(p===PAGLIV.p?' selected':'')+'>p. '+p+'</option>';return s+'</optgroup>'}).join('');
 var ult=Math.max.apply(null,EX.filter(function(e){return e.g==='livro'}).map(pagOf));
 return '<div class="row" style="gap:8px;align-items:center;margin-bottom:10px"><span>📖 <b>Estou na página</b></span><select id="pagSel">'+o+'</select><span class="lb">'+unidade(PAGLIV.p)+'</span></div>'+
  '<div class="lb" style="margin-bottom:10px">Aparecem os exercícios até a p. '+PAGLIV.p+'. '+(PAGLIV.p>ult?'Os exercícios do livro estão no app até a p. '+ult+'. ':'')+'Se você me disser em que página está, eu atualizo isto também.</div>'+guiaHtml()}
/* o que fazer na página atual (window.LIVRO_GUIA, no conteúdo pessoal): serve para seguir o livro sozinho */
function guiaHtml(){var G=window.LIVRO_GUIA;if(!G)return '';var p=PAGLIV.p,g=G[p];while(!g&&p>33&&PAGLIV.p-p<3){p--;g=G[p]}return g?'<div class="guia-pag">'+ilu('livro','chip')+'<div><b>Na p. '+p+':</b> '+g+'</div></div>':''}
/* o arquivo de progresso: lido ao abrir e a cada minuto */
function lerProgresso(){if(!/^https?:/.test(location.protocol))return;fetch('livro-progresso.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){
 var e=j&&j.perfis&&j.perfis[perfilNome()];if(!e||!e.pagina)return;var t=Date.parse(e.atualizado)||0;if(t>PAGLIV.t&&e.pagina!==PAGLIV.p)setPagina(e.pagina,t);else if(t>PAGLIV.t){PAGLIV.t=t;try{localStorage.setItem('piano_pagina',JSON.stringify(PAGLIV))}catch(x){}}}).catch(function(){})}
lerProgresso();setInterval(lerProgresso,60000);
/* ---------- subir o andamento sozinho ----------
   Com "Subir o andamento sozinho" ligado (modo com tempo): no fim, se acertou 90% ou mais, sobe 5 BPM e começa de novo em 6 s,
   até chegar no andamento alvo. Abaixo de 90%, repete no mesmo andamento. "Recomeçar" interrompe o ciclo */
var SUBT=null;
function subirDepois(pct){if(!OPT.subir||MODE!=='time')return;var b=document.getElementById('bpm'),bpm=+b.value,alvo=+document.getElementById('alvo').value,msg;
 if(pct>=90&&bpm>=alvo){show('<span class="lb">🎉 Chegou no andamento alvo ('+alvo+' BPM) com '+pct+'%!</span>',true);return}
 if(pct>=90){bpm=Math.min(alvo,bpm+5);b.value=bpm;b.oninput();msg=pct+'%: subindo para '+bpm+' BPM'}else msg=pct+'%: repetindo em '+bpm+' BPM (precisa de 90% para subir)';
 var n=6;(function tick(){if(run)return;if(n<=0){SUBT=null;document.getElementById('go').click();return}show('<span class="lb">'+msg+'. Começa em '+n+' s · "Recomeçar" para parar</span>',true);n--;SUBT=setTimeout(tick,1000)})()}
function pararSubir(){if(SUBT){clearTimeout(SUBT);SUBT=null}}
document.getElementById('alvo').oninput=function(){document.getElementById('alvoV').textContent=this.value+' BPM';saveSet()};
/* ---------- gravar e ouvir o que você tocou ----------
   Cada vez que você aperta "Começar", o app grava as teclas (com a força) até o fim. "Ouvir o que eu toquei" toca a gravação
   pelo mesmo som em que você ouve o seu piano (sampleado no Mac ou o próprio piano, se o som guia sai pelo piano) */
var REC=[],RECP=[],RECON=false,RECPLAY=false;
function recNote(m,v,on,ts){if(RECON){var t=ts&&ts<=performance.now()?ts:performance.now();REC.push([m,v,t,on,typeof recNb==='function'?recNb(t):null])}}/* ts: a hora em que a tecla foi tocada (com o cabo no iPhone, chega um pouco depois) */
/* pedal de sustentação gravado junto: [hora, pisou]. Na hora de ouvir, a nota solta com o pé no pedal continua até o pé subir */
function recPed(on){if(RECON)RECP.push([performance.now(),on])}
function pedSolta(t){var dn=false,i;for(i=0;i<RECP.length&&RECP[i][0]<=t;i++)dn=RECP[i][1];if(!dn)return t;for(;i<RECP.length;i++)if(!RECP[i][1])return RECP[i][0];return t+3000}
function ouvir(){var b=document.getElementById('ouvirBtn');if(RECPLAY){stopSched();RECPLAY=false;paintOuvir();return}
 var ons=REC.filter(function(r){return r[3]});if(!ons.length){show('<span class="lb">Ainda não há gravação: toque um exercício (aperte "Começar").</span>',true);return}
 RECPLAY=true;paintOuvir();pianoVols();var rec=REC.slice();reg('ouvir: '+ons.length+' notas, sai por '+(viaPiano()?(MOUT.remoto?'piano pelo iPhone':'piano'):'Mac')+', som do Mac '+(AC?AC.state:'ainda sem som'));
 Promise.race([Promise.all(ons.map(function(r){return load(r[0])})),new Promise(function(x){setTimeout(x,1500)})]).then(function(){if(!RECPLAY)return;var c=ctx(),t0=c.currentTime+0.25,first=ons[0][2],end=0;
  rec.forEach(function(r,i){if(!r[3])return;var nx=rec.slice(i+1).filter(function(x){return x[0]===r[0]}),off=nx.filter(function(x){return !x[3]})[0],re=nx.filter(function(x){return x[3]})[0],
    fim=off?pedSolta(off[2]):r[2]+500;if(re)fim=Math.min(fim,re[2]);/* a mesma tecla tocada de novo corta a anterior, como no piano */
    var d=Math.max(0.15,(fim-r[2])/1000);
   tone(r[0],t0+(r[2]-first)/1000,d,r[1]/127,'rec');end=Math.max(end,(r[2]-first)/1000+d)});
  setTimeout(function(){RECPLAY=false;paintOuvir()},(end+1.2)*1000)})}
function paintOuvir(){var b=document.getElementById('ouvirBtn');if(b){b.textContent=RECPLAY?'■ Parar a gravação':'▶ Ouvir o que eu toquei';b.classList.toggle('on',RECPLAY)}}
document.getElementById('ouvirBtn').onclick=ouvir;
/* volume da gravação: 0 a 300%; muda na hora, até no meio da gravação tocando */
function recF(){var r=document.getElementById('recVol');return r?(+r.value)/100:1}
document.getElementById('recVol').oninput=function(){document.getElementById('recVolV').textContent=this.value+'%';if(GR)GR.gain.setTargetAtTime(recF(),ctx().currentTime,0.03);pianoVols();saveSet()};
/* ---------- dinâmica: a força com que você aperta a tecla ----------
   O piano manda a força de cada tecla (velocidade MIDI, 1 a 127). Nomes: pp p mp mf f ff.
   Exercício com dinâmica marcada: a nota no tempo certo mas com força fora da faixa fica amarela */
function velName(v){return v<36?'pp':v<56?'p':v<71?'mp':v<86?'mf':v<101?'f':'ff'}
var DYN={pp:[1,50],p:[1,64],mp:[35,82],mf:[48,96],f:[76,127],ff:[90,127]};
function dynCheck(e,v){if(!e||!e.dyn||!DYN[e.dyn])return;e.vel=Math.max(e.vel||0,v);var r=DYN[e.dyn];if(v>=r[0]&&v<=r[1])return;
 if(e.st==='ok')e.st='warn';e.info=(e.info?e.info+'; ':'')+(v<r[0]?'fraco demais':'forte demais')+' (pedia '+e.dyn+', saiu '+velName(v)+')'}
/* ---------- leitura de notas ----------
   Gera uma sequência nova de notas (semínimas) para ler e tocar, no modo espera. Sem nomes nem dedos escritos: o objetivo é ler a pauta */
var LEIT={sol1:{t:'Clave de Sol: Dó a Sol (mão direita, posição de Dó)',lo:28,hi:32,h:'d'},sol2:{t:'Clave de Sol: Dó central até o Dó de cima',lo:28,hi:35,h:'d'},
 fa1:{t:'Clave de Fá: Dó a Sol graves (mão esquerda, posição de Dó)',lo:21,hi:25,h:'e'},fa2:{t:'Clave de Fá: Dó grave até o Dó central',lo:21,hi:28,h:'e'},
 ambas:{t:'As duas claves: um compasso cada mão',lo:0,hi:0,h:'x'}};
function leitura(k){var L=LEIT[k];if(!L)return;JG.vis=false;function seq(lo,hi,h,n){var c=lo+Math.floor(Math.random()*(hi-lo+1)),out=[],last=null;
  for(var i=0;i<n;i++){out.push(Q(1,c,'',h));var step=[-2,-1,1,2,1,-1,2,-2,3,-3][Math.floor(Math.random()*10)],nx=c+step;if(nx<lo||nx>hi)nx=c-step;if(nx<lo||nx>hi)nx=lo+Math.floor(Math.random()*(hi-lo+1));if(nx===last&&nx===c)nx=c+(c<hi?1:-1);last=c;c=nx}return out}
 var ms=[];for(var m=0;m<8;m++){var h=L.h==='x'?(m%2?'e':'d'):L.h,lo=L.h==='x'?(h==='d'?28:21):L.lo,hi=L.h==='x'?(h==='d'?32:25):L.hi;ms.push(seq(lo,hi,h,4))}
 var ex={id:'leit_'+k,g:'leit',title:'Leitura · '+L.t,src:'Leitura de notas (sequência nova a cada vez)',bpm:60,beats:4,key:0,seq:true,leit:true,ms:ms,
  desc:'Leia cada nota na pauta e toque. Sem nomes nem dedos escritos: o objetivo é ler. Comece no modo espera; quando ficar fácil, tente o modo com tempo bem devagar.'};
 MODE='wait';paint();load_ex(ex);praticaVis();var pr=document.getElementById('practice');if(pr)pr.scrollIntoView({block:'start',behavior:'smooth'})}
/* ---------- comemoração de recorde: animação curta, som e texto (sem animação se o Mac pede "reduzir movimento") ---------- */
var FESTA=null;
/* por onde saem os sons do jogo, dos conceitos e do recorde: piano (padrão; sem o cabo, cai para o Mac), Mac ou celular */
function somSaida(){var s=JG.saida||'piano';return s==='piano'&&!MOUT?'mac':s}
var SOMCEL=null;
function celSom(ns,corta){var now=Date.now();if(!corta&&SOMCEL&&now-SOMCEL.t<5&&!SOMCEL.corta)SOMCEL.n=SOMCEL.n.concat(ns);else SOMCEL={id:now+'_'+Math.random().toString(36).slice(2,6),t:now,n:ns,corta:corta?1:0};if(window.CEL_SOON)CEL_SOON()}
function somFesta(){if(!JG.som)return;var sd=somSaida();if(sd!=='mac'){[[72,0],[76,0.09],[79,0.18],[84,0.27]].forEach(function(n){somNota(n[0],n[1],n[1]>0.2?0.9:0.3,0.7)});return}try{var c=ctx(),t=c.currentTime+0.03;[[72,0],[76,0.09],[79,0.18],[84,0.27],[88,0.27]].forEach(function(n){var o=c.createOscillator(),g=c.createGain(),t0=t+n[1];
 o.type='sine';o.frequency.value=440*Math.pow(2,(n[0]-69)/12);o.connect(g);g.connect(COMP);g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(0.2,t0+0.01);g.gain.exponentialRampToValueAtTime(0.001,t0+0.9);o.start(t0);o.stop(t0+1)})}catch(e){}}
function celebrar(tit,sub){var d=document.createElement('div'),b=document.createElement('div');d.className='festa';d.setAttribute('role','status');b.className='festa-box';b.innerHTML='<b>'+tit+'</b>'+(sub?'<span>'+sub+'</span>':'');d.appendChild(b);
 var cores=['#378ADD','#639922','#EF9F27','#D4537E','#7F77DD'];for(var k=0;k<24;k++){var p=document.createElement('i'),a=k/24*2*Math.PI,r=130+Math.random()*90;p.style.setProperty('--dx',Math.round(Math.cos(a)*r)+'px');p.style.setProperty('--dy',Math.round(Math.sin(a)*r)+'px');p.style.background=cores[k%5];p.style.animationDelay=Math.round(Math.random()*90)+'ms';b.appendChild(p)}
 document.body.appendChild(d);somFesta();FESTA={t:tit,s:sub||'',ts:Date.now()};setTimeout(function(){d.classList.add('sai')},2400);setTimeout(function(){d.remove()},2900)}
/* melhor nota que este exercício já teve (todos os dias), para saber se bateu o recorde */
function melhorDe(id){var b=null;Object.keys(H.days).forEach(function(k){var r=H.days[k].done[id];if(r&&(b==null||r.best>b))b=r.best});return b}
/* toca uma nota com o piano sampleado, direto (não depende do "Som guia" ligado) */
/* sons do jogo/conceitos pelo piano: caminho próprio na fila do MIDI (não depende do "Som guia" ligado), marcado para poder cortar */
function mqJ(t,note,vel,dur){var p=soundPerf(ctx(),t);vel=Math.max(1,Math.min(127,Math.round(vel)));MQ.push({p:p,k:'jg',d:[0x91,note,vel],jg:1});MQ.push({p:p+dur*1000,k:'off',d:[0x81,note,0],jg:1})}
/* uma sequência nova ("Ouvir de novo", "▶ Ouvir", a próxima nota do modo De ouvido) corta a anterior: nada toca por cima */
var SEQ=[],SEQN=[],SEQT=0;
function pararSeq(){SEQT++;if(AC)SEQ.forEach(function(x){try{x.g.gain.cancelScheduledValues(AC.currentTime);x.g.gain.setTargetAtTime(0,AC.currentTime,0.02);x.s.stop(AC.currentTime+0.12)}catch(e){}});SEQ=[];
 MQ=MQ.filter(function(x){return !x.jg});if(MOUT)SEQN.forEach(function(nn){try{MOUT.send([0x81,nn,0]);delete MON['1_'+nn]}catch(e){}});SEQN=[]}
function somNota(m,when,dur,v,seq){var sd=somSaida();
 if(sd==='piano'){try{pianoVols();mqJ(ctx().currentTime+(when||0)+0.03,m,(v||0.8)*110,dur||0.8);if(seq)SEQN.push(m)}catch(e){}return}
 if(sd==='celular'){celSom([[m,when||0,dur||0.8,v||0.8]]);return}
 var c=ctx();function play(b){var s=c.createBufferSource(),g=c.createGain(),t=c.currentTime+(when||0)+0.02;s.buffer=b;s.connect(g);g.connect(COMP);g.gain.setValueAtTime(v||0.8,t);g.gain.setTargetAtTime(0,t+(dur||0.8),0.08);s.start(t,OFS[m]||0);s.stop(t+(dur||0.8)+0.7);if(seq)SEQ.push({s:s,g:g})}
 if(BUF[m])play(BUF[m]);else load(m).then(function(b){if(b)play(b)})}
function tocarSeq(seq){pararSeq();var tk=SEQT,sd=somSaida();
 if(sd==='celular'){celSom(seq.map(function(n){return [n[0],n[1]||0,n[2]||0.8,n[3]||0.8]}),true);return}
 if(sd==='piano'){seq.forEach(function(n){somNota(n[0],n[1],n[2],n[3],true)});return}
 Promise.all(seq.map(function(n){return load(n[0])})).then(function(){if(tk!==SEQT)return;seq.forEach(function(n){somNota(n[0],n[1],n[2],n[3],true)})})}

/* ---------- jogo das notas: aparece uma nota na pauta e você aperta a tecla certa ----------
   "Uma por vez": sem pressa; errou, o app mostra a tecla certa e o caminho a partir da nota-guia mais perto.
   "Correndo": as notas andam até a linha azul; toque antes que cheguem (3 vidas).
   As notas que você mais erra aparecem mais vezes. Recordes por nível, com comemoração. Tudo salvo por perfil (piano_jogo). */
var JN=[
 {id:'n1',t:'Clave de Sol: Dó a Sol',d:'Mão direita na posição de Dó: do Dó central até o Sol.',g:[28,32]},
 {id:'n2',t:'Clave de Fá: Dó a Sol graves',d:'Mão esquerda na posição de Dó: do Dó grave até o Sol.',f:[21,25]},
 {id:'n3',t:'Notas-guia',d:'Os pontos de partida para ler qualquer nota: Dó grave, Fá da clave de Fá, Dó central, Sol da clave de Sol e Dó agudo.',lista:[['f',21],['f',24],['f',28],['g',28],['g',32],['g',35]]},
 {id:'n4',t:'Clave de Sol: a pauta toda',d:'Do Dó central até o Fá da linha de cima.',g:[28,38]},
 {id:'n5',t:'Clave de Fá: a pauta toda',d:'Do Sol da linha de baixo até o Dó central.',f:[18,28]},
 {id:'n6',t:'As duas claves misturadas',d:'Clave de Sol e clave de Fá, sorteadas.',g:[28,38],f:[18,28]},
 {id:'n7',t:'Acima da pauta',d:'Clave de Sol, com linhas suplementares em cima (até o Dó agudo).',g:[37,42]},
 {id:'n8',t:'Abaixo da pauta',d:'Clave de Fá, com linhas suplementares embaixo (até o Dó grave).',f:[14,19]},
 {id:'n9',t:'Tudo: do Dó grave ao Dó agudo',d:'Três oitavas, nas duas claves.',g:[28,42],f:[14,28]},
 {id:'i1',t:'Intervalos: 2ª e 3ª na clave de Sol',d:'Duas notas: leia a primeira e ache a segunda pelo desenho. 2ª = a vizinha (linha → espaço); 3ª = pula uma (linha → linha). Toque as duas, na ordem.',par:[2,3],g:[28,37]},
 {id:'i2',t:'Intervalos: 2ª e 3ª na clave de Fá',d:'O mesmo na mão esquerda: 2ª = a vizinha, 3ª = pula uma.',par:[2,3],f:[19,28]},
 {id:'i3',t:'Intervalos: 4ª e 5ª',d:'4ª = de linha para espaço, pulando duas notas; 5ª = de linha para linha, passando por cima de uma linha.',par:[4,5],g:[28,37],f:[19,28]}];
var GUIA=[['f',14,'o Dó grave (2 linhas suplementares abaixo da clave de Fá)'],['f',21,'o Dó do 2º espaço da clave de Fá'],['f',24,'o Fá da clave de Fá (a linha entre os dois pontinhos)'],['f',28,'o Dó central (linha suplementar acima da clave de Fá)'],
 ['g',28,'o Dó central (linha suplementar abaixo da clave de Sol)'],['g',32,'o Sol da clave de Sol (a linha onde ela se enrola)'],['g',35,'o Dó do 3º espaço da clave de Sol'],['g',42,'o Dó agudo (2 linhas suplementares acima da clave de Sol)']];
var JMODOS=['calma','corre','ouvido'];
var JG={on:false,modo:'calma',nivel:'n1',oit:false,som:true,teclado:false,saida:'piano',fila:[],vis:false},JLX=96,JTOT=20;
var JS={niv:{},notas:{}};try{var js_=JSON.parse(localStorage.getItem('piano_jogo'));if(js_){JS=js_;JS.niv=JS.niv||{};JS.notas=JS.notas||{};if(js_.cfg){JG.modo=JMODOS.indexOf(js_.cfg.modo)>=0?js_.cfg.modo:'calma';JG.nivel=js_.cfg.nivel||'n1';JG.oit=!!js_.cfg.oit;JG.som=js_.cfg.som!==false;JG.teclado=!!js_.cfg.tec;if(['piano','mac','celular'].indexOf(js_.cfg.saida)>=0)JG.saida=js_.cfg.saida}}}catch(e){}
function jsSave(){JS.cfg={modo:JG.modo,nivel:JG.nivel,oit:JG.oit,som:JG.som,tec:JG.teclado,saida:JG.saida};try{localStorage.setItem('piano_jogo',JSON.stringify(JS))}catch(e){}}
function jNivel(){return JN.filter(function(n){return n.id===JG.nivel})[0]||JN[0]}
function jPool(n){n=n||jNivel();if(n.lista)return n.lista.map(function(x){return {c:x[0],i:x[1]}});var r=[];['g','f'].forEach(function(c){var a=n[c];if(a)for(var i=a[0];i<=a[1];i++)r.push({c:c,i:i})});return r}
function jNome(i){return nmT([i,0])+Math.floor(i/7)}
function jClave(c){return c==='g'?'clave de Sol':'clave de Fá'}
/* onde a nota fica: "2ª linha", "3º espaço", "na 1ª linha suplementar de cima"… */
function jLugar(c,i){var p=c==='g'?i-30:i-18;
 if(p>=0&&p<=8)return p%2?((p+1)/2)+'º espaço':(p/2+1)+'ª linha';
 if(p===-1)return 'logo abaixo da pauta';if(p===9)return 'logo acima da pauta';
 if(p<0)return (p%2?'abaixo da ':'na ')+Math.floor(-p/2)+'ª linha suplementar de baixo';
 return (p%2?'acima da ':'na ')+Math.floor((p-8)/2)+'ª linha suplementar de cima'}
/* dica: a nota-guia mais perto e os passos até a nota (cada passo = linha para espaço ou espaço para linha) */
function jDica(c,i){var gs=GUIA.filter(function(g){return g[0]===c}),b=gs[0];gs.forEach(function(g){if(Math.abs(g[1]-i)<Math.abs(b[1]-i))b=g});
 var d=i-b[1];if(!d)return {g:b,t:'É uma nota-guia: '+b[2]+'.'};
 var nomes=[];for(var k=b[1];d>0?k<=i:k>=i;k+=d>0?1:-1)nomes.push(nmT([k,0]));
 return {g:b,t:'Parta da nota-guia mais perto, '+b[2]+', e conte '+Math.abs(d)+(Math.abs(d)>1?' passos':' passo')+' para '+(d>0?'cima':'baixo')+': '+nomes.join(' → ')+'.'}}
/* intervalos: o desenho na pauta de cada um */
var INTN={2:['2ª','a vizinha: de linha para o espaço do lado (ou de espaço para linha)'],3:['3ª','pula uma nota: de linha para a linha seguinte (ou de espaço para espaço)'],4:['4ª','pula duas notas: de linha para espaço (ou de espaço para linha)'],5:['5ª','pula três notas: de linha para linha, passando por cima de uma linha (ou de espaço para espaço)'],6:['6ª','pula quatro notas: de linha para espaço']};
function jIntTxt(a){if(a.ns.length<2)return '';var d=a.ns[1]-a.ns[0],n=Math.abs(d)+1;if(!INTN[n])return '';return (d>0?'Sobe':'Desce')+' uma '+INTN[n][0]+': '+INTN[n][1]+'.'}
/* desenho: pauta dupla com as mesmas medidas da partitura do app (12 px entre linhas) */
var JY={tt:50,bt:134};
function jy(c,i,Y){Y=Y||JY;return c==='g'?Y.tt+(38-i)*6:Y.bt+(26-i)*6}
function jPauta(s,w,INK,qual,Y){Y=Y||JY;qual=qual||'gf';var tops=[];if(qual.indexOf('g')>=0)tops.push(Y.tt);if(qual.indexOf('f')>=0)tops.push(Y.bt);
 tops.forEach(function(T){for(var l=0;l<5;l++)el(s,'line',{x1:12,x2:w-6,y1:T+l*12,y2:T+l*12,style:'stroke:'+INK})});
 el(s,'line',{x1:12,x2:12,y1:tops[0],y2:tops[tops.length-1]+48,style:'stroke:'+INK+';stroke-width:1.5'});
 if(qual.indexOf('g')>=0)el(s,'path',{d:TRE,transform:'translate(8,'+(Y.tt-20)+') scale(0.301)',style:'fill:'+INK+';fill-rule:evenodd'});
 if(qual.indexOf('f')>=0)el(s,'path',{d:BAS,transform:'translate(8,'+Y.bt+') scale(0.292)',style:'fill:'+INK+';fill-rule:evenodd'})}
/* uma nota: cabeça, haste, linhas suplementares; dur: 4 semibreve, 3 mínima pontuada, 2 mínima, 1 semínima, 0.5 colcheia */
function jNota(s,x,c,i,col,INK,op,dur,Y){var y=jy(c,i,Y),g=el(s,'g',op?{opacity:String(op)}:{}),lg=[],l;dur=dur||1;
 if(c==='g'){for(l=28;l>=i;l-=2)lg.push(l);for(l=40;l<=i;l+=2)lg.push(l)}else{for(l=16;l>=i;l-=2)lg.push(l);for(l=28;l<=i;l+=2)lg.push(l)}
 lg.forEach(function(l){var yy=jy(c,l,Y);el(g,'line',{x1:x-13,x2:x+13,y1:yy,y2:yy,style:'stroke:'+INK+';stroke-width:1.3'})});
 var open=dur>=2;el(g,'ellipse',{cx:x,cy:y,rx:7.5,ry:5.5,transform:'rotate(-20 '+x+' '+y+')',style:open?'fill:none;stroke:'+col+';stroke-width:2.2':'fill:'+col});
 if(dur<4){var up=c==='g'?i<34:i<22,sx=up?x+6.5:x-6.5,y2=up?y-36:y+36;el(g,'line',{x1:sx,x2:sx,y1:y,y2:y2,style:'stroke:'+col+';stroke-width:1.4'});
  if(dur<1)el(g,'path',{d:'M'+sx+' '+y2+(up?' q 10 10 6 22':' q 10 -10 6 -22'),style:'fill:none;stroke:'+col+';stroke-width:2'})}
 if(dur===3||dur===1.5)el(g,'circle',{cx:x+13,cy:y-2,r:2.4,style:'fill:'+col});return g}
function jInk(){return getComputedStyle(document.body).getPropertyValue('--ink').trim()||'#000'}
/* avisa a tela do iPhone que o jogo mudou */
function jSoon(){if(window.CEL_SOON)CEL_SOON()}
/* recorte da pauta: só a altura que o nível usa (as duas pautas e as linhas suplementares dele), para a pauta ficar grande */
function jVB(){var ys=[50,182];jPool().forEach(function(q){ys.push(jy(q.c,q.i))});var y0=Math.max(0,Math.min.apply(null,ys)-30),y1=Math.min(232,Math.max.apply(null,ys)+30);return '0 '+y0+' 520 '+(y1-y0)}
function jDesenha(){var s=document.getElementById('jgSvg');if(!s)return;s.innerHTML='';var INK=jInk(),W=520;s.setAttribute('viewBox',jVB());jPauta(s,W,INK);
 if(JG.modo==='corre'){el(s,'line',{x1:JLX,x2:JLX,y1:14,y2:222,style:'stroke:#378ADD;stroke-width:3;opacity:.6'});
  JG.fila.forEach(function(q){jNota(s,q.x,q.c,q.i,q.cor||INK,INK);if(q.rev)el(s,'text',{x:q.x+16,y:jy(q.c,q.i)+5,style:'font-size:14px;font-weight:700;fill:'+q.cor},jNome(q.i))});
  if(!JG.on&&!JG.fila.length)el(s,'text',{x:W/2+30,y:228,'text-anchor':'middle',style:'font-size:13px;fill:var(--tx2)'},jNivel().par?'Intervalos: só nos modos "Uma por vez" e "De ouvido"':'As notas vão andar até a linha azul');return}
 var a=JG.alvo,x=W/2+20;if(!a){el(s,'text',{x:x-20,y:228,'text-anchor':'middle',style:'font-size:13px;fill:var(--tx2)'},'Aperte "Começar o jogo"');return}
 var ouv=JG.modo==='ouvido',mostra=!ouv||!!JG.cor||JG.errou,xs=a.ns.length>1?[x-45,x+45]:[x];
 if(!mostra){el(s,'text',{x:x,y:a.c==='g'?jy('g',35)+12:jy('f',23)+12,'text-anchor':'middle',style:'font-size:40px;font-weight:700;fill:#378ADD'},'?');
  el(s,'text',{x:x-20,y:228,'text-anchor':'middle',style:'font-size:12px;fill:var(--tx2)'},'Ouça e ache no piano (antes toca o Dó central, de referência)');return}
 if((JG.dica||JG.errou)&&!ouv&&a.ns.length===1){var d=jDica(a.c,a.ns[0]);if(d.g[1]!==a.ns[0]){jNota(s,x-170,d.g[0],d.g[1],'#378ADD',INK,0.6);el(s,'text',{x:x-154,y:jy(d.g[0],d.g[1])+5,style:'font-size:13px;fill:#378ADD'},'nota-guia: '+jNome(d.g[1]))}}
 a.ns.forEach(function(i,k){var col=JG.cor||(k<a.k?SCOL.ok:INK);jNota(s,xs[k],a.c,i,col,INK);if(JG.cor||k<a.k)el(s,'text',{x:xs[k]+16,y:jy(a.c,i)+5,style:'font-size:15px;font-weight:700;fill:'+col},jNome(i))});
 if(a.ns.length>1&&(JG.cor||JG.errou||JG.dica)){var n=Math.abs(a.ns[1]-a.ns[0])+1,top=Math.min(jy(a.c,a.ns[0]),jy(a.c,a.ns[1]));el(s,'text',{x:x,y:Math.max(30,top-24),'text-anchor':'middle',style:'font-size:15px;font-weight:700;fill:#378ADD'},INTN[n]?INTN[n][0]:'')}}
/* teclado do jogo: só o trecho do nível, com o nome dos Dós (o Dó central marcado) para se localizar */
var JKB={};
function jKb(){var s=document.getElementById('jgKb');if(!s)return;s.innerHTML='';s.style.display=JG.teclado?'':'none';if(!JG.teclado)return;var p=jPool(),lo=127,hi=0;p.forEach(function(q){var m=wm(q.i);lo=Math.min(lo,m);hi=Math.max(hi,m)});lo-=3;hi+=3;while(isB(lo))lo--;while(isB(hi))hi++;
 var wc=0,m;for(m=lo;m<=hi;m++)if(!isB(m))wc++;var kw=Math.min(46,900/wc),W=kw*wc,x=0,pos={};s.setAttribute('viewBox','0 0 '+W+' 130');
 for(m=lo;m<=hi;m++){if(!isB(m)){pos[m]=x;x+=kw}else pos[m]=x-kw*0.3}
 var certa=JG.on&&JG.modo!=='corre'&&JG.errou&&JG.alvo&&!JG.cor?wm(JG.alvo.ns[JG.alvo.k]):null;
 function cor(m,b){var k=JKB[m];if(k==='ok')return b?'#3B6D11':'#97C459';if(k==='bad')return b?'#A32D2D':'#F09595';if(m===certa)return b?'#185FA5':'#85B7EB';return b?'#2C2C2A':'#fff'}
 for(m=lo;m<=hi;m++){if(isB(m))continue;el(s,'rect',{x:pos[m]+0.5,y:1,width:kw-1,height:126,rx:4,'data-m':m,style:'fill:'+cor(m,false)+';stroke:#9a9890;cursor:pointer'});
  if(m%12===0)el(s,'text',{x:pos[m]+kw/2,y:118,'text-anchor':'middle',style:'font-size:'+(kw>30?12:10)+'px;fill:#444441;pointer-events:none;font-weight:'+(m===60?700:400)},chrT(m)+(Math.floor(m/12)-1)+(m===60?'•':''))}
 for(m=lo;m<=hi;m++){if(!isB(m))continue;el(s,'rect',{x:pos[m],y:1,width:kw*0.6,height:76,rx:3,'data-m':m,style:'fill:'+cor(m,true)+';cursor:pointer'})}
 s.onpointerdown=function(ev){var t=ev.target,m=t&&t.getAttribute&&+t.getAttribute('data-m');if(!m)return;ev.preventDefault();jTelaTecla(m)}}
/* tecla apertada na tela (do Mac ou do iPhone) */
function jTelaTecla(m){if(JG.som)somNota(m,0,0.7,0.8);if(JG.on)jogoTecla(m);else{JKB[m]='ok';jKb();setTimeout(function(){delete JKB[m];jKb()},300)}}
function jTeclaCor(m,k){JKB[m]=k;jKb();jSoon();setTimeout(function(){if(JKB[m]===k){delete JKB[m];jKb();jSoon()}},450)}
function jMsg(h,cls){JG.msg=[h||'',cls||''];var e=document.getElementById('jgMsg');if(e){e.innerHTML=h||'';e.className='jg-msg'+(cls?' '+cls:'')}jSoon()}
function jPainel(){var e=document.getElementById('jgSt');if(!e)return;var t='';
 if(JG.modo==='corre'){if(JG.on||JG.pontos)t='<span class="vidas" aria-label="vidas">'+'♥♥♥'.slice(0,Math.max(0,JG.vidas))+'<i>'+'♥♥♥'.slice(0,3-Math.max(0,JG.vidas))+'</i></span> <b>'+JG.pontos+'</b> pontos'+(JG.combo>=3?' <span class="combo">'+JG.combo+' seguidas</span>':'')}
 else if(JG.on||JG.n)t='Nota <b>'+Math.min(JG.n+1,JTOT)+'</b> de '+JTOT+' <span class="okc">✓ '+JG.acertos+'</span> <span class="errc">✗ '+JG.erros+'</span>'+(JG.combo>=3?' <span class="combo">'+JG.combo+' seguidas</span>':'');
 e.innerHTML=t;var g=document.getElementById('jgGo');if(g)g.textContent=JG.on?'Parar':(JG.n||JG.pontos?'Jogar de novo':'Começar o jogo');
 var d=document.getElementById('jgDica');if(d){d.style.display=JG.modo!=='corre'&&JG.on?'':'none';d.textContent=JG.modo==='ouvido'?'Ouvir de novo':'Dica'}}
function jStat(pre,c,i,ok,ms){var k=pre+c+i,s=JS.notas[k]||[0,0,0];if(ok){s[0]++;if(ms&&ms<15000)s[2]=(s[2]||0)+ms}else s[1]++;JS.notas[k]=s}
/* sorteio: as notas mais erradas pesam mais (a mesma nota pode vir de novo, como numa partitura); nos níveis de intervalo, a segunda nota sai do intervalo sorteado */
function jEscolhe(){var n=jNivel(),p=jPool(n),ant=JG.ult,ant2=JG.ult2,pre=JG.modo==='ouvido'?'o':'',w=p.map(function(q){var s=JS.notas[pre+q.c+q.i]||[0,0],t=s[0]+s[1];if(ant&&ant2&&p.length>1&&ant.c===q.c&&ant.i===q.i&&ant2.c===q.c&&ant2.i===q.i)return 0;return 1+(t?4*s[1]/t:1.5)}),tot=0,r,k;
 w.forEach(function(x){tot+=x});r=Math.random()*tot;for(k=0;k<p.length;k++){r-=w[k];if(r<=0&&w[k]>0)break}k=Math.min(k,p.length-1);var q=p[k];JG.ult2=JG.ult;JG.ult=q;var a={c:q.c,i:q.i,ns:[q.i],k:0};
 if(n.par){var f=n[q.c];for(var t=0;t<20;t++){var iv=n.par[Math.floor(Math.random()*n.par.length)]-1,dir=Math.random()<0.5?-1:1,j=q.i+dir*iv;if(j<f[0]||j>f[1])j=q.i-dir*iv;if(j>=f[0]&&j<=f[1]){a.ns=[q.i,j];break}}}
 return a}
function jOuvir(){var a=JG.alvo;if(!a)return;var seq=[[60,0,0.8,0.7]];a.ns.forEach(function(i,k){seq.push([wm(i),1.1+k*0.8,0.75,0.85])});tocarSeq(seq)}
function jProxima(){JG.alvo=jEscolhe();JG.cor=null;JG.errou=false;JG.dica=false;JG.pausa=false;JG.t0=performance.now();
 jMsg(JG.modo==='ouvido'?'Ouça: primeiro o Dó central, depois '+(JG.alvo.ns.length>1?'as duas notas':'a nota')+'. Ache no piano.':JG.alvo.ns.length>1?'Toque as duas notas, na ordem.':'');
 if(JG.modo==='ouvido')jOuvir();jDesenha();jKb();jPainel()}
function jCerto(i,m){var t=wm(i);return JG.oit?m%12===t%12:m===t}
function jComecar(){if(run)resetAll();if(jNivel().par&&JG.modo==='corre'){JG.modo='calma';jsSave();jogoMontar()}
 JG.on=true;JG.vis=true;praticaVis();JG.n=0;JG.acertos=0;JG.erros=0;JG.combo=0;JG.bestCombo=0;JG.tempos=[];JG.pontos=0;JG.vidas=3;JG.fila=[];JG.ult=null;JG.ult2=null;JKB={};
 if(JG.modo==='corre'){JG.v=34;JG.tl=null;jMsg('Toque a nota mais perto da linha azul antes que ela chegue lá.');jDesenha();jKb();jPainel();jTick()}else jProxima()}
function jParar(){pararSeq();JG.on=false;JG.alvo=null;JG.fila=[];jMsg('');jDesenha();jKb();jPainel()}
/* próximo passo do modo Correndo: com a janela do Mac visível, a cada quadro; escondida (o Chrome congela as animações), pelo relógio de fundo do app */
function jTick(){if(document.hidden&&typeof at==='function'){try{at(ctx().currentTime+0.05,jLoop);return}catch(e){}}requestAnimationFrame(jLoop)}
function jNova(x){var a=jEscolhe();return {c:a.c,i:a.i,x:x,t0:performance.now()}}
/* dt até 0,25 s: com a janela do Mac escondida os quadros vêm espaçados, e o jogo não pode andar mais devagar que o relógio
   (o celular calcula a posição pelo relógio e puxaria as notas para trás a cada mensagem) */
function jLoop(){if(!JG.on||JG.modo!=='corre')return;var now=performance.now(),dt=Math.min(0.25,(now-(JG.tl||now))/1000),W=520,ev=false;JG.tl=now;
 if(!document.getElementById('jgSvg')){jParar();return}
 JG.fila.forEach(function(q){if(!q.fora)q.x-=JG.v*dt});
 var f=JG.fila.filter(function(q){return !q.fora})[0];
 if(f&&f.x<=JLX){f.fora=true;f.rev=true;f.cor=SCOL.bad;JG.vidas--;JG.combo=0;jStat('',f.c,f.i,false);ev=true;
  jMsg('Passou: era <b>'+jNome(f.i)+'</b>, '+jLugar(f.c,f.i)+' da '+jClave(f.c)+'.','bad');falar('Era '+jNome(f.i));setTimeout(function(){f.x=-99;jSoon()},900);if(JG.vidas<=0){jDesenha();jFim();return}}
 var n0=JG.fila.length;JG.fila=JG.fila.filter(function(q){return q.x>-50});var u=JG.fila[JG.fila.length-1];if(!u||u.x<W-80)JG.fila.push(jNova(W+14));if(JG.fila.length!==n0)ev=true;
 jDesenha();jPainel();if(ev)jSoon();jTick()}
/* nota tocada no piano (ou na tela) com o jogo ligado. Devolve true quando o jogo usou a tecla */
function jogoTecla(m){if(!JG.on||run)return false;
 if(JG.modo==='corre'){var q=JG.fila.filter(function(q){return !q.fora})[0];if(!q)return true;
  if(jCerto(q.i,m)){q.fora=true;q.cor=SCOL.ok;JG.combo++;JG.bestCombo=Math.max(JG.bestCombo,JG.combo);JG.acertos++;JG.pontos+=10+Math.min(JG.combo,20);JG.v=Math.min(150,JG.v*1.04);jStat('',q.c,q.i,true,performance.now()-q.t0);setTimeout(function(){q.x=-99;jSoon()},200);
   jTeclaCor(m,'ok');if(JG.combo%10===0)jMsg('<b>'+JG.combo+' seguidas!</b> As notas ficam mais rápidas.','ok');else if(JG.msg&&JG.msg[1]==='bad')jMsg('')}
  else{JG.combo=0;JG.erros++;jTeclaCor(m,'bad');jMsg('Tocou '+mname(m)+'. Vale a nota mais perto da linha azul.','bad')}
  jPainel();jSoon();return true}
 var a=JG.alvo;if(!a||JG.pausa)return true;var alvo=a.ns[a.k],ouv=JG.modo==='ouvido',pre=ouv?'o':'';
 if(jCerto(alvo,m)){
  if(a.k<a.ns.length-1){a.k++;jTeclaCor(m,'ok');jMsg('Isso: <b>'+jNome(alvo)+'</b>. Agora a segunda nota.','ok');jDesenha();jKb();return true}
  var ms=performance.now()-JG.t0;JG.pausa=true;JG.cor=SCOL.ok;
  if(!JG.errou){JG.acertos++;JG.combo++;JG.bestCombo=Math.max(JG.bestCombo,JG.combo);if(!JG.dica&&!ouv)JG.tempos.push(ms);jStat(pre,a.c,alvo,true,ms)}
  jMsg((JG.errou?'Agora sim: ':'Certo! ')+'<b>'+a.ns.map(jNome).join(' → ')+'</b>'+(a.ns.length>1?'. '+jIntTxt(a):'')+(JG.errou||JG.dica||ouv?'':' Em '+(ms/1000).toFixed(1).replace('.',',')+' s.'),'ok');
  jTeclaCor(m,'ok');jDesenha();jPainel();setTimeout(function(){if(!JG.on)return;JG.n++;if(JG.n>=JTOT)jFim();else jProxima()},JG.errou||a.ns.length>1?1100:550);return true}
 jTeclaCor(m,'bad');if(!JG.errou){JG.errou=true;JG.erros++;JG.combo=0;jStat(pre,a.c,alvo,false)}
 var t=wm(alvo),tx=m%12===t%12&&!JG.oit?'Nome certo ('+chrT(m)+'), mas na oitava errada: a nota é mais '+(m<t?'aguda':'grave')+'. ':'Você tocou '+mname(m)+'. ';
 var expl=ouv?'Era <b>'+jNome(alvo)+'</b>: na pauta ela fica '+jLugar(a.c,alvo)+' da '+jClave(a.c)+'.':'Era <b>'+jNome(alvo)+'</b>, '+jLugar(a.c,alvo)+' da '+jClave(a.c)+'.<br>'+(a.ns.length>1&&a.k===1?jIntTxt(a):jDica(a.c,alvo).t);
 jMsg(tx+expl+' Toque a tecla azul para seguir.','bad');falar('Era '+jNome(alvo));jKb();jDesenha();jPainel();return true}
function jFim(){var n=jNivel(),r=JS.niv[n.id]||{},recs=[],h,fala;JG.on=false;
 if(JG.modo==='corre'){if(r.corre!=null&&JG.pontos>r.corre)recs.push('Correndo: '+JG.pontos+' pontos (antes '+r.corre+')');r.corre=Math.max(r.corre||0,JG.pontos);
  h='Fim: <b>'+JG.pontos+' pontos</b>, '+JG.acertos+' notas certas, '+JG.bestCombo+' seguidas no máximo.';fala='Fim. '+JG.pontos+' pontos.'}
 else{var ouv=JG.modo==='ouvido',pk=ouv?'ouv':'pct',pct=Math.round(100*JG.acertos/JTOT),avg=JG.tempos.length?JG.tempos.reduce(function(a,b){return a+b},0)/JG.tempos.length:null,est=ouv?0:pct>=95&&avg&&avg<3000?3:pct>=85?2:pct>=70?1:0;
  if(r[pk]!=null&&pct>r[pk])recs.push((ouv?'de ouvido: ':'acertos: ')+pct+'% (antes '+r[pk]+'%)');r[pk]=Math.max(r[pk]||0,pct);
  if(avg&&pct>=80){if(r.tempo!=null&&avg<r.tempo-50)recs.push('mais rápido: '+(avg/1000).toFixed(1).replace('.',',')+' s por nota');if(r.tempo==null||avg<r.tempo)r.tempo=Math.round(avg)}
  if(est>(r.est||0)&&est>0)recs.push(est===3?'3 estrelas neste nível!':est+(est>1?' estrelas':' estrela')+' neste nível');r.est=Math.max(r.est||0,est);
  record('jogo',pct,'jogo');var prox=JN[JN.indexOf(n)+1];fala='Fim da rodada. '+pct+' por cento certas.';
  h='Fim da rodada: <b>'+pct+'%</b> certas'+(avg?', '+(avg/1000).toFixed(1).replace('.',',')+' s por nota':'')+'. '+(est?'<span class="estrelas">'+'★★★'.slice(0,est)+'<i>'+'★★★'.slice(0,3-est)+'</i></span>':'')+
   (!ouv&&est>=2&&prox?'<br>Você está pronto para o próximo nível: <button data-jgniv="'+prox.id+'">'+prox.t+'</button>':!ouv&&est<2?'<br>Para 2 estrelas: 85% certas. Use a "Dica" quando travar: ela não conta como erro.':'')}
 if(JG.bestCombo>=5&&r.combo!=null&&JG.bestCombo>r.combo)recs.push(JG.bestCombo+' seguidas sem errar');r.combo=Math.max(r.combo||0,JG.bestCombo);
 JS.niv[n.id]=r;jsSave();jMsg(h,'fim');jDesenha();jKb();jPainel();jRec();if(recs.length){celebrar('Novo recorde!',recs.join('<br>'));fala+=' Novo recorde!'}falar(fala);
 var b=document.querySelector('#jgMsg [data-jgniv]');if(b)b.onclick=function(){JG.nivel=b.dataset.jgniv;jsSave();showPanel()}}
function jRec(){var e=document.getElementById('jgRec');if(!e)return;var n=jNivel(),r=JS.niv[n.id]||{},t=[];
 if(r.pct!=null)t.push('melhor rodada '+r.pct+'%'+(r.tempo?' ('+(r.tempo/1000).toFixed(1).replace('.',',')+' s por nota)':''));if(r.ouv!=null)t.push('de ouvido '+r.ouv+'%');if(r.combo)t.push(r.combo+' seguidas');if(r.corre)t.push('Correndo: '+r.corre+' pontos');
 var pre=JG.modo==='ouvido'?'o':'',dif=jPool().map(function(q){var s=JS.notas[pre+q.c+q.i]||[0,0];return {q:q,t:s[0]+s[1],e:s[1]}}).filter(function(x){return x.t>=3&&x.e}).sort(function(a,b){return b.e/b.t-a.e/a.t}).slice(0,3);
 e.innerHTML='<b>'+n.d+'</b>'+(t.length?'<br>Seus recordes aqui: '+t.join(', ')+'.':'')+(dif.length?'<br>Notas que você mais erra (aparecem mais vezes): '+dif.map(function(x){return jNome(x.q.i)+' na '+jClave(x.q.c)}).join(', ')+'.':'')}
function jogoHtml(){var n=jNivel();
 return '<section class="jogo" id="jogo"><div class="jg-head"><div><h2>Jogo das notas</h2><div class="lb">Aparece uma nota na pauta: aperte a tecla certa no piano ou no teclado da tela.</div></div>'+
 '<div class="jg-ctl"><select id="jgNivel" aria-label="Nível">'+JN.map(function(x,k){var e=(JS.niv[x.id]||{}).est||0;return '<option value="'+x.id+'"'+(x.id===n.id?' selected':'')+'>Nível '+(k+1)+': '+x.t+(e?'  '+'★★★'.slice(0,e):'')+'</option>'}).join('')+'</select>'+
 '<div class="segc" role="group" aria-label="Modo do jogo"><button class="tg jgModo" data-v="calma">Uma por vez</button><button class="tg jgModo" data-v="corre">Correndo</button><button class="tg jgModo" data-v="ouvido">De ouvido</button></div>'+
 '<button class="tg" id="jgOit" title="Ligado: vale a tecla com o mesmo nome em qualquer altura do piano"></button><button class="tg" id="jgSom"></button><button class="tg" id="jgTec" title="Um teclado na tela para responder sem o piano"></button><label class="jg-saida">Som sai por <select id="jgSaida"><option value="piano">Piano</option><option value="mac">Mac</option><option value="celular">Celular</option></select></label></div></div>'+
 '<div class="jg-stage"><svg id="jgSvg" role="img" aria-label="Pauta do jogo"></svg></div>'+
 '<div class="jg-bar"><button id="jgGo" class="primary">Começar o jogo</button><button id="jgDica">Dica</button><span id="jgSt" class="jg-st" aria-live="polite"></span></div>'+
 '<div id="jgMsg" class="jg-msg" aria-live="polite"></div><svg id="jgKb" class="jg-kb" role="img" aria-label="Teclado do jogo"></svg><div class="lb jg-rec" id="jgRec"></div></section>'}
function jogoMontar(){if(!document.getElementById('jogo'))return;
 function pinta(){var par=!!jNivel().par;document.querySelectorAll('.jgModo').forEach(function(b){b.classList.toggle('on',b.dataset.v===JG.modo);b.disabled=par&&b.dataset.v==='corre';b.title=b.disabled?'Os intervalos são só nos modos "Uma por vez" e "De ouvido"':''});var o=document.getElementById('jgOit'),s=document.getElementById('jgSom');
  o.textContent='Qualquer oitava: '+(JG.oit?'ligado':'desligado');o.classList.toggle('on',JG.oit);s.textContent='Sons do jogo: '+(JG.som?'ligado':'desligado');s.classList.toggle('on',JG.som);var sa=document.getElementById('jgSaida');if(sa)sa.value=JG.saida;var k=document.getElementById('jgTec');k.textContent='Teclado na tela: '+(JG.teclado?'ligado':'desligado');k.classList.toggle('on',JG.teclado)}
 pinta();document.getElementById('jgNivel').onchange=function(){if(JG.on)jParar();JG.nivel=this.value;if(jNivel().par&&JG.modo==='corre')JG.modo='calma';jsSave();JG.n=0;JG.pontos=0;pinta();jMsg('');jDesenha();jKb();jPainel();jRec()};
 document.querySelectorAll('.jgModo').forEach(function(b){b.onclick=function(){if(b.disabled)return;if(JG.on)jParar();JG.modo=b.dataset.v;jsSave();JG.n=0;JG.pontos=0;pinta();jMsg('');jDesenha();jPainel();jRec()}});
 document.getElementById('jgOit').onclick=function(){JG.oit=!JG.oit;jsSave();pinta();jSoon()};document.getElementById('jgSom').onclick=function(){JG.som=!JG.som;jsSave();pinta();jSoon()};document.getElementById('jgSaida').onchange=function(){JG.saida=this.value;jsSave();jSoon()};document.getElementById('jgTec').onclick=function(){JG.teclado=!JG.teclado;jsSave();pinta();jKb();jSoon()};
 document.getElementById('jgGo').onclick=function(){if(JG.on)jParar();else jComecar()};
 document.getElementById('jgDica').onclick=function(){if(!JG.on||!JG.alvo||JG.pausa)return;if(JG.modo==='ouvido'){jOuvir();return}JG.dica=true;var a=JG.alvo,i=a.ns[a.k];
  jMsg('Dica: '+(a.ns.length>1&&a.k===1?jIntTxt(a):jDica(a.c,i).t+' (Está '+jLugar(a.c,i)+' da '+jClave(a.c)+'.)'));jDesenha()};
 if(JG.msg)jMsg(JG.msg[0],JG.msg[1]);var b=document.querySelector('#jgMsg [data-jgniv]');if(b)b.onclick=function(){JG.nivel=b.dataset.jgniv;jsSave();showPanel()};
 jDesenha();jKb();jPainel();jRec();jSoon();if(JG.on&&JG.modo==='corre'){JG.tl=null;jTick()}}
/* a área da partitura só aparece nas abas em que se toca; no jogo das notas, nos Conceitos e no Histórico ela some
   (em "Ler notas" ela volta quando você abre uma sequência para ler e tocar) */
function praticaVis(){var p=document.getElementById('practice');if(!p)return;var leitSeq=TAB==='leit'&&CUR&&CUR.leit&&!JG.vis,esc=TAB==='conc'||TAB==='hist'||TAB==='rep'||(TAB==='leit'&&!leitSeq);p.style.display=esc?'none':''}
/* abriu um exercício estando no jogo, nos Conceitos ou no Histórico (pelo iPhone, pela rotina, por "Continuar"): vai para a aba dele */
var PRONTO=false,_loadAba=load_ex;load_ex=function(ex){_loadAba(ex);if(PRONTO&&ex&&ex.parcial)avisar('<b>Música incompleta:</b> '+ex.parcial);if(PRONTO&&ex&&!ex.leit&&!JG.on&&['leit','conc','hist'].indexOf(TAB)>=0){JG.vis=false;TAB=ex.g==='user'?'mus':['aq','livro','ritmo','mus'].indexOf(ex.g)>=0?ex.g:'hoje';showPanel();saveAtual()}else praticaVis()};
/* abrir o jogo (pelo Mac, pelo iPhone, pela tela simples ou pela rotina) */
function jAbrir(){if(run)resetAll();TAB='leit';var f=document.getElementById('f_ex');if(f)f.open=true;JG.vis=true;showPanel();saveAtual();var j=document.getElementById('jogo');if(j)j.scrollIntoView({block:'start',behavior:'smooth'});jSoon()}
/* o jogo para a tela do iPhone: a pauta pronta (modo calmo) ou as notas andando, que o iPhone anima sozinho a partir de x, v e t */
function jSnap(){if(!JG.vis&&!JG.on)return null;var g=function(id){var e=document.getElementById(id);return e?e:null},s=g('jgSvg'),kb=g('jgKb'),st=g('jgSt'),rec=g('jgRec'),corre=JG.modo==='corre';
 var pauta=null;if(corre){if(!jSnap.p||jSnap.pi!==jInk()+jVB()){var t=document.createElementNS(NS,'svg');t.setAttribute('viewBox',jVB());jPauta(t,520,jInk());el(t,'line',{x1:JLX,x2:JLX,y1:14,y2:222,style:'stroke:#378ADD;stroke-width:3;opacity:.6'});jSnap.p=t.outerHTML;jSnap.pi=jInk()+jVB()}pauta=jSnap.p}
 return {on:JG.on,modo:JG.modo,nivel:JG.nivel,par:!!jNivel().par,niveis:JN.map(function(x,k){var e=(JS.niv[x.id]||{}).est||0;return [x.id,'Nível '+(k+1)+': '+x.t+(e?' '+'★★★'.slice(0,e):'')]}),
  svg:corre&&JG.on?null:(s?s.outerHTML:''),pauta:pauta,fila:corre?JG.fila.map(function(q){return [q.c,q.i,Math.round(q.x*10)/10,q.cor||'',q.rev?1:0,q.fora?1:0,jNome(q.i)]}):null,v:JG.v||0,t:JG.tl?Math.round(Date.now()-(performance.now()-JG.tl)):Date.now(),/* hora em que as notas estavam nessas posições */ 
  kb:JG.teclado&&kb?kb.outerHTML:'',tec:JG.teclado,saida:JG.saida,st:st?st.innerHTML:'',msg:JG.msg||['',''],rec:rec?rec.innerHTML:'',oit:JG.oit,som:JG.som,dica:JG.modo==='ouvido'?'Ouvir de novo':'Dica'}}
/* ---------- conceitos do livro: cada um aparece quando você chega na página dele (aba Conceitos) ----------
   Texto próprio do app (não é cópia do livro). "u" = onde aparece; "jogo" = nível do jogo que treina isso; "som" = [midi, início s, duração s] */
var ESTUDO=[
 ['Mão arredondada, como segurando uma bola','Dedos curvos, tocando com a ponta (perto da unha), punho na altura das teclas. Dedo esticado e reto perde força e controle.','mao'],
 ['Sente-se direito','Na beira do banco, costas retas, antebraço na altura das teclas e cotovelos um pouco à frente do corpo. O banco não pode ficar baixo demais.','postura'],
 ['Devagar e certo, depois mais rápido','Tocar certo devagar grava o movimento certo; tocar rápido e errado grava o erro. Suba o andamento só quando acertar 90% (o app faz isso sozinho em ⚙ Ajustes: "Subir o andamento sozinho").','devagar'],
 ['Treine o pedaço difícil, não a música toda','Quem melhora mais é quem acha o trecho exato que erra e repete só ele até sair. No fim de cada tentativa, use "Treinar só os compassos com erro", ou escolha as linhas em "Trecho".','trecho'],
 ['Misture as coisas no mesmo dia','Alternar exercícios (um pouco de leitura, um pouco de música, um pouco de técnica) parece mais difícil na hora, mas fixa melhor no dia seguinte do que repetir uma coisa só por 20 minutos. A rotina "Hoje" já vem misturada.','misturar'],
 ['Pouco todo dia vale mais que muito num dia só','10 a 15 minutos por dia lembram mais do que uma hora no domingo. Puxar da memória (como no jogo das notas) é o que faz a memória ficar.','diario'],
 ['Leia por notas-guia, não letra por letra','Em vez de contar "Mi, Sol, Si, Ré, Fá" toda vez, decore poucas notas-guia (Dó central, Sol da clave de Sol, Fá da clave de Fá, Dó grave e Dó agudo) e conte os passos a partir delas. É o que o jogo das notas treina.','guia'],
 ['Mãos separadas, depois juntas; conte em voz alta','Cada mão sozinha primeiro (botões Direita e Esquerda). Contar alto "1 e 2 e" faz o tempo ficar dentro de você, e aí dá para desligar os cliques.','contar']];
var CCAT=[['todos','Todos','conceitos'],['ler','Ler a partitura','pauta'],['ritmo','Ritmo e tempo','metronomo'],['mao','Mãos e posição','dedos'],['harm','Acordes e harmonia','acorde'],['teoria','Escalas e intervalos','escala'],['expr','Expressão','expressao']];
var CONC=[
 {c:'mao',p:8,u:'Unidade 1',t:'Teclas brancas e pretas',x:'As teclas pretas vêm em grupos de 2 e de 3. O Dó (C) é sempre a tecla branca logo à esquerda do grupo de 2 pretas. Depois do Dó vêm Ré, Mi, Fá, Sol, Lá, Si e começa outro Dó, mais agudo.',fig:'teclas',som:[[60,0,.5],[62,.5,.5],[64,1,.5],[65,1.5,.5],[67,2,.5],[69,2.5,.5],[71,3,.5],[72,3.5,1]]},
 {c:'mao',p:8,u:'Unidade 1',t:'Os números dos dedos',ilu:'dedos',x:'Polegar = 1, indicador = 2, médio = 3, anelar = 4, mindinho = 5, nas duas mãos. Por isso a mão esquerda é "espelhada": o 1 dela fica do lado direito.'},
 {c:'ritmo',p:8,u:'Unidade 1',t:'Figuras: quanto tempo cada nota dura',x:'Semínima = 1 tempo (cabeça cheia com haste). Mínima = 2 tempos (cabeça vazia com haste). Mínima pontuada = 3 tempos (o ponto soma metade). Semibreve = 4 tempos (cabeça vazia sem haste).',fig:'figuras',som:[[60,0,.5],[62,.6,1.1],[64,1.8,1.7],[65,3.6,2.4]]},
 {c:'ritmo',p:8,u:'Unidade 1',t:'Compasso e barra de compasso',x:'As barras verticais dividem a música em compassos, grupos com o mesmo número de tempos. A barra grossa dupla no fim quer dizer que a música acabou; duas barras finas marcam só o fim de uma parte.'},
 {c:'expr',p:8,u:'Unidade 1',t:'Forte e piano',x:'<b>f</b> (forte) = som forte; <b>p</b> (piano) = som suave. <b>mf</b> = meio forte, <b>mp</b> = meio piano. O app mede a força de cada tecla: veja "Última tecla" e o exercício "Piano e forte" na aba Ritmo.'},
 {c:'mao',p:22,u:'Livro p. 22',t:'Posição de Dó e pentascala',x:'Pentascala = cinco notas vizinhas, uma para cada dedo: Dó Ré Mi Fá Sol. A mão direita começa com o polegar no Dó central; a esquerda, com o mindinho no Dó de baixo. Enquanto a música fica nessas 5 teclas, a mão não precisa sair do lugar.',ilu:'dedos'},

 /* acordes: vieram da professora (folha de Merrily We Roll Along e Da Maré), por isso já aparecem antes da p. 56 do livro */
 {c:'harm',top:1,nt:1,p:8,u:'Da sua professora',t:'O que é um acorde',fig:'tec|60,64,67|C/Dó,E/Mi,G/Sol',x:'Acorde é um <b>grupo de 3 ou mais notas diferentes tocadas juntas</b>, que o ouvido escuta como um som só. O mais comum tem 3 notas e se chama <b>tríade</b>. Para montar: escolha uma nota e vá pegando uma sim, uma não nas teclas brancas ("pula uma tecla"). Começando no C (Dó): <b>C (Dó)</b>, pula D (Ré), <b>E (Mi)</b>, pula F (Fá), <b>G (Sol)</b>. A primeira nota dá o nome ao acorde e se chama <b>fundamental</b>; a segunda é a <b>3ª</b>; a terceira é a <b>5ª</b>.<br><br>Compare ao ouvir: primeiro as 3 notas uma de cada vez (<b>quebrado</b> ou arpejo), depois todas juntas (<b>bloqueado</b>). São as mesmas notas, e as duas formas continuam sendo o acorde de C (Dó maior).',som:[[60,0,.5],[64,.5,.5],[67,1,.6],[60,1.9,1.5],[64,1.9,1.5],[67,1.9,1.5]]},
 {c:'harm',top:1,nt:1,p:8,u:'Da sua professora',t:'Para que serve um acorde',fig:'cifra',x:'A música tem duas camadas. A <b>melodia</b> é o que você cantaria. A <b>harmonia</b> é o que sustenta a melodia por baixo, e ela é feita de acordes. Uma melodia sozinha é uma pessoa cantando; com acordes, ela ganha um chão.<br><br>O acorde serve para três coisas:<br><b>1. Encher o som:</b> com poucas notas, o piano soa como uma música inteira.<br><b>2. Dar cor e sentimento:</b> a mesma nota E (Mi) soa alegre em cima do acorde de C (Dó maior) e triste em cima do acorde de Am (Lá menor).<br><b>3. Dar sensação de caminho:</b> alguns acordes soam como "chegar em casa", outros como "ainda falta alguma coisa". É isso que faz a música andar.<br><br>Ouça a mesma melodia de Merrily primeiro sozinha, depois com os acordes.',som:[[64,0,.45],[62,.5,.45],[60,1,.45],[62,1.5,.45],[64,2,.9],[64,3.2,.45],[62,3.7,.45],[60,4.2,.45],[62,4.7,.45],[64,5.2,.9],[48,3.2,1.9,.55],[52,3.2,1.9,.55],[55,3.2,1.9,.55]]},
 {c:'harm',top:1,nt:1,p:8,u:'Da sua professora',t:'Quando usar cada acorde',fig:'tec|55,59,62|G/Sol,B/Si,D/Ré',x:'Regra prática: <b>o acorde certo é o que contém a nota importante da melodia</b>, principalmente a que cai no 1º tempo do compasso.<br><br>Exemplo de Merrily: no compasso 1 a melodia começa em <b>E (Mi)</b>, que faz parte de C-E-G (Dó-Mi-Sol), então entra o acorde de <b>C</b>. No compasso 3 a melodia fica no <b>D (Ré)</b>. Essa nota não existe no acorde de C, mas existe em G-B-D (Sol-Si-Ré), então entra o acorde de <b>G</b>. Quem escreveu a sua folha fez exatamente essa escolha.<br><br>O botão toca D (Ré) com o acorde de G (combina) e depois D (Ré) com o acorde de C (a nota fica "brigando" com o acorde).<br><br>Nas músicas em C (Dó maior), o <b>C</b> soa como casa e o <b>G</b> soa como tensão que quer voltar para casa. Por isso Merrily termina G → C: a música se resolve.',som:[[62,0,1.3],[55,0,1.3,.55],[59,0,1.3,.55],[50,0,1.3,.4],[62,1.7,1.3],[60,1.7,1.3,.55],[64,1.7,1.3,.55],[55,1.7,1.3,.55]]},
 {c:'harm',top:1,nt:1,p:8,u:'Da sua professora',t:'Cifra: a letra em cima da pauta',fig:'cifra',x:'As letras em cima da pauta não são notas para a mão direita: são os <b>acordes</b>. C = Dó, D = Ré, E = Mi, F = Fá, G = Sol, A = Lá, B = Si. A letra sozinha quer dizer acorde maior. Isso se chama <b>cifra</b>.<br><br>Toque o acorde no momento em que a letra aparece e segure até a próxima letra. Se um compasso não tem letra, o acorde anterior continua valendo: é o caso do compasso 2 de Merrily, que segue em C.'},
 {c:'harm',top:1,nt:1,p:8,u:'Da sua professora',t:'Acorde de C (Dó maior)',fig:'tec|48,52,55|C/Dó,E/Mi,G/Sol',x:'Notas: <b>C (Dó), E (Mi), G (Sol)</b>. Mão esquerda: dedo 5 no C, 3 no E e 1 no G. O C fica uma oitava abaixo do Dó central, com as teclas uma sim, uma não. Deixe a mão arredondada e desça os 3 dedos ao mesmo tempo.',som:[[48,0,1.6],[52,0,1.6],[55,0,1.6]]},
 {c:'harm',top:1,nt:1,p:8,u:'Da sua professora',t:'Acorde de G (Sol maior)',fig:'tec|43,47,50|G/Sol,B/Si,D/Ré',x:'Notas: <b>G (Sol), B (Si), D (Ré)</b>. É o mesmo desenho do acorde de C, três teclas brancas mais à esquerda. Mão esquerda: 5 no G, 3 no B e 1 no D.<br><br>Para trocar de C para G: mantenha o formato da mão, leve a mão inteira para a esquerda e deixe os 3 dedos caírem juntos. Treine primeiro o exercício "Trocar entre C e G" na aba Músicas, bem devagar, olhando para o próximo acorde antes de sair do atual.',som:[[43,0,1.6],[47,0,1.6],[50,0,1.6]]},
 {c:'harm',top:1,nt:1,p:8,u:'Da sua professora',t:'Acorde de F (Fá maior)',fig:'tec|41,45,48|F/Fá,A/Lá,C/Dó',x:'Notas: <b>F (Fá), A (Lá), C (Dó)</b>. Aparece em Da Maré. Mão esquerda: 5 no F, 3 no A e 1 no C. Junto com C e G, forma o trio de acordes que acompanha muitas músicas simples em C (Dó maior).',som:[[41,0,1.6],[45,0,1.6],[48,0,1.6]]},
 {c:'harm',top:1,p:8,u:'Da sua professora',t:'Como juntar melodia e acordes',ilu:'juntar',x:'Não comece com as duas mãos. Siga esta ordem, em Merrily ou Da Maré:<br><b>1.</b> Só a melodia, mão direita, até sair sem pensar.<br><b>2.</b> Só os acordes, mão esquerda, um por compasso.<br><b>3.</b> As duas mãos bem devagar, no modo Espera. Primeiro confira que o acorde e a nota do 1º tempo descem juntos; depois só a mão direita continua.<br><b>4.</b> Passe para Com tempo e suba o andamento aos poucos.<br><br>Os exercícios estão nessa ordem na aba Músicas.'},

 {c:'ler',p:28,u:'Unidade 2 (p. 28)',t:'A pauta',x:'Cinco linhas e quatro espaços. Cada nota fica numa linha ou num espaço. Quanto mais alto na pauta, mais aguda a nota (mais para a direita no piano).',fig:'pauta',jogo:'n1'},
 {c:'ler',p:28,u:'Unidade 2 (p. 28)',t:'Clave de Sol e clave de Fá',x:'A clave de Sol se enrola na 2ª linha: ali é o <b>Sol</b> acima do Dó central. A clave de Fá tem dois pontinhos em volta da 4ª linha: ali é o <b>Fá</b> abaixo do Dó central. Essas duas são as primeiras notas-guia.',fig:'claves',jogo:'n3'},
 {c:'ler',p:28,u:'Unidade 2 (p. 28)',t:'Pauta dupla e o Dó central',x:'A mão direita lê a pauta de cima (clave de Sol); a esquerda, a de baixo (clave de Fá). O Dó central fica numa linha suplementar entre as duas: é a mesma tecla, escrita embaixo da clave de Sol ou em cima da clave de Fá.',fig:'central',jogo:'n3',som:[[60,0,1.2]]},
 {c:'expr',p:28,u:'Unidade 2',t:'Acento',x:'O sinal <b>&gt;</b> em cima ou embaixo da nota quer dizer: toque essa nota mais forte que as outras.',fig:'acento',som:[[60,0,.45,1],[64,.5,.45,.45],[67,1,.45,.45],[64,1.5,.45,.45],[60,2,.45,1]]},
 {c:'ritmo',p:30,u:'Livro p. 30',t:'Fórmula de compasso 4/4',x:'O número de cima diz quantos tempos tem cada compasso (4); o de baixo diz que a semínima vale 1 tempo. Conte "1 2 3 4" com o 1 um pouco mais forte.',fig:'f44'},
 {c:'ritmo',p:31,u:'Livro p. 31',t:'Fórmula de compasso 3/4',x:'Três tempos por compasso, a semínima vale 1. Conte "1 2 3": é o compasso da valsa. O 1 é o tempo forte; o 2 e o 3 são fracos.',fig:'f34'},
 {c:'expr',p:33,u:'Livro p. 33',t:'Pedal de sustentação',ilu:'pedal',x:'É o pedal da direita. A linha embaixo da pauta mostra: o começo (pé desce), o trecho reto (pé fica embaixo, as notas continuam soando) e o fim (pé sobe). Use o calcanhar no chão e mexa só a frente do pé.',fig:'pedal',som:[[60,0,3],[64,.6,2.4],[67,1.2,1.8],[72,1.8,1.2]]},
 {c:'teoria',p:33,u:'Livro p. 33',t:'Transpor',x:'Tocar a mesma música começando em outra nota. O desenho da melodia (sobe, desce, pula) fica igual; só muda a posição da mão.',som:[[60,0,.4],[62,.45,.4],[64,.9,.8],[67,2,.4],[69,2.45,.4],[71,2.9,.8]]},
 {c:'ler',p:34,u:'Livro p. 34',t:'2ª na pauta',x:'Uma 2ª é a nota vizinha: de uma linha para o espaço logo acima ou abaixo (ou de um espaço para a linha vizinha). No piano, é a tecla branca do lado.',fig:'segunda',som:[[64,0,.5],[65,.55,.5],[67,1.1,.5],[65,1.65,.5]]},
 {c:'ler',p:34,u:'Livro p. 34',t:'Linha suplementar',x:'Uma linha curtinha, fora da pauta, para notas que não cabem nela. O Dó central é a primeira que você conhece. Cada linha suplementar a mais sobe (ou desce) duas notas.',fig:'suplementar',jogo:'n7'},
 {c:'ler',p:34,u:'Livro p. 34',t:'Si, Dó, Ré e Mi em volta do centro',x:'Quatro notas vizinhas para decorar: <b>Si</b> logo acima da última linha da clave de Fá, <b>Dó central</b> na linha suplementar, <b>Ré</b> logo abaixo da 1ª linha da clave de Sol e <b>Mi</b> nessa 1ª linha. Tocadas em ordem, sobem de 2ª em 2ª.',som:[[59,0,.5],[60,.55,.5],[62,1.1,.5],[64,1.65,.8]],jogo:'n3'},
 {c:'ritmo',p:35,u:'Livro p. 35',t:'Ligadura de valor',x:'Um arco ligando duas notas <b>iguais</b>: toque só a primeira e segure pelo tempo das duas somadas.',fig:'ligval',som:[[64,0,2.6]]},
 {c:'ler',p:36,u:'Livro p. 36',t:'Lá na clave de Fá',x:'O Lá abaixo do Dó central fica na linha de cima da clave de Fá. É uma 2ª abaixo do Si. Agora você lê cinco notas seguidas: Lá, Si, Dó, Ré, Mi.',som:[[57,0,.5],[59,.55,.5],[60,1.1,.5],[62,1.65,.5],[64,2.2,.8]]},
 {c:'teoria',p:36,u:'Livro p. 36',t:'Forma musical (A A B B A¹)',x:'Forma é a planta da música. Cada letra é uma parte. Letras iguais são partes iguais, letra nova é ideia nova, e o A¹ é o A com uma pequena mudança. Olhar a forma antes de tocar diminui o que você precisa aprender: em A A B B A¹ existem, na prática, só duas ideias.'},
 {c:'ler',p:38,u:'Livro p. 38',t:'Fá na clave de Sol',x:'O Fá acima do Dó central fica no 1º espaço da clave de Sol, uma 2ª acima do Mi. Com ele, você lê Dó, Ré, Mi, Fá seguidos.',som:[[60,0,.5],[62,.55,.5],[64,1.1,.5],[65,1.65,.8]]},
 {c:'expr',p:38,u:'Livro p. 38',t:'Legato e ligadura de expressão',x:'Um arco sobre notas <b>diferentes</b>: toque ligado (legato), soltando uma tecla só quando a próxima desce, sem buraco entre elas.',fig:'legato',som:[[60,0,.55],[62,.5,.55],[64,1,.55],[65,1.5,.55],[67,2,1]]},
 {c:'ler',p:40,u:'Livro p. 40',t:'Sinal de oitava (8va e 15ma)',x:'"8va" em cima da pauta: toque as notas uma oitava acima do escrito, ou seja, na 8ª tecla branca contando a própria nota. Embaixo da pauta, uma oitava abaixo. "15ma" são duas oitavas.',som:[[60,0,.6],[72,.7,.8]]},
 {c:'mao',p:40,u:'Livro p. 40',t:'Mão arredondada',ilu:'mao',x:'Mão em forma de concha, como se segurasse uma bola pequena, com o peso apoiado na ponta firme de cada dedo. Um número de dedo dentro de um círculo avisa que a mão muda de posição.'},
 {c:'ler',p:41,u:'Livro p. 41',t:'Leitura à primeira vista',x:'Tocar direto, sem parar para corrigir. Antes de começar: 1) ache as teclas e os dedos da primeira nota; 2) conte um compasso em voz alta; 3) olhe para as cabeças das notas; 4) toque devagar, com os olhos sempre um pouco à frente. Pratique na aba "Ler notas".'},

 {c:'ler',p:42,u:'Unidade 3 (p. 42)',t:'Sol na clave de Sol',x:'A clave de Sol também se chama clave de G, porque nasceu da letra G e marca a linha do Sol, a 2ª linha. Ache essa nota de olhos fechados: é o Sol acima do Dó central. Do Dó central até ele há uma 5ª, a distância do polegar ao mindinho.',jogo:'n3',som:[[60,0,.7],[67,.8,1]]},
 {c:'expr',p:42,u:'Livro p. 42',t:'Respirar na música',x:'No fim de cada ligadura longa, levante o punho de leve, como um cantor que respira. A música não para: o tempo continua, mas o som separa as frases.'},
 {c:'ler',p:44,u:'Livro p. 44',t:'Sol na clave de Fá',x:'Fica no espaço de cima da clave de Fá, uma 2ª abaixo do Lá. Da tecla desse Sol até o Sol da clave de Sol você já lê oito notas seguidas.',jogo:'n3'},
 {c:'ler',p:46,u:'Livro p. 46',t:'Fá na clave de Fá',x:'A clave de Fá também se chama clave de F: nasceu da letra F e seus dois pontos marcam a 4ª linha, a linha do Fá. Do Dó central até esse Fá há uma 5ª.',jogo:'n3',som:[[60,0,.7],[53,.8,1]]},
 {c:'ritmo',p:48,u:'Livro p. 48',t:'Andamento',x:'Andamento (ou tempo) é a velocidade da música. Estude sempre em três velocidades: devagar, médio e mais rápido, sempre com a ponta dos dedos firme.'},
 {c:'ler',p:50,u:'Unidade 4 (p. 50)',t:'3ª na pauta',x:'Uma 3ª pula uma nota: de linha para a linha seguinte, ou de espaço para o espaço seguinte. No piano, pula uma tecla branca.',fig:'terca',som:[[60,0,.5],[64,.55,.5],[67,1.1,.5],[64,1.65,.5]]},
 {c:'ritmo',p:52,u:'Livro p. 52',t:'Pausa de semínima',x:'Pausa é silêncio contado: a música não para, só a mão descansa. A pausa de semínima vale 1 tempo. Conte em voz alta e não toque nesse tempo.',fig:'pausas'},
 {c:'harm',p:54,u:'Livro p. 54',t:'Melodia e harmonia',x:'Melodia é a música que você cantaria. Harmonia são as notas tocadas junto para deixar o som mais cheio. Nesta página a harmonia é só uma 5ª (Dó e Sol), segurada pela mão esquerda.',som:[[64,0,.9],[67,.9,.5],[48,0,2],[55,0,2]]},
 {c:'ler',p:55,u:'Livro p. 55',t:'D.C. al Fine',x:'"Da capo al Fine": volte para o começo e toque até a palavra <i>Fine</i> (fim). Da capo quer dizer "do início".'},
 {c:'harm',p:56,u:'Livro p. 56',t:'Acorde na clave de Fá',x:'Na clave de Fá, os três espaços de cima formam o acorde de Dó grave: Dó, Mi, Sol. A palavra acorde vem do francês antigo e tem a ideia de "estar de acordo". Veja também "O que é um acorde", no começo da lista.',som:[[48,0,1.4],[52,0,1.4],[55,0,1.4]]},
 {c:'ritmo',p:58,u:'Livro p. 58',t:'Pausas de mínima e de semibreve',x:'A pausa de mínima fica em cima da 3ª linha, como um chapéu, e vale 2 tempos. A pausa de semibreve fica pendurada na 4ª linha e vale o <b>compasso inteiro</b>: 4 tempos em 4/4, 3 tempos em 3/4.',fig:'pausas'},
 {c:'mao',p:60,u:'Livro p. 60',t:'Polegar e punho',ilu:'tensao',x:'Toque com a lateral da ponta do polegar, nunca com ele deitado. O punho fica solto, mas não pode cair abaixo do nível do teclado.'},

 {c:'ler',p:62,u:'Unidade 5 (p. 62)',t:'Pentascala de Dó grave',x:'Cinco notas que sobem a partir do Dó grave: Dó no 2º espaço, Ré, Mi, Fá e Sol, na clave de Fá. A mão esquerda fica com 5 no Dó e 1 no Sol.',som:[[48,0,.45],[50,.5,.45],[52,1,.45],[53,1.5,.45],[55,2,.8]],jogo:'n4'},
 {c:'ler',p:62,u:'Unidade 5 (p. 62)',t:'Regra das hastes',x:'Notas abaixo da linha do meio têm haste para cima, do lado direito. Notas na linha do meio ou acima têm haste para baixo, do lado esquerdo. A haste não muda o som nem a mão: só deixa a partitura mais fácil de ler.'},
 {c:'expr',p:64,u:'Livro p. 64',t:'Staccato',x:'Um pontinho em cima ou embaixo da nota: toque curto e solto, tirando o dedo rápido, como se a tecla estivesse quente.',fig:'staccato',som:[[67,0,.15],[67,.5,.15],[64,1,.15],[60,1.5,.15]]},
 {c:'teoria',p:64,u:'Livro p. 64',t:'Oitava',x:'Do Dó central ao Dó grave são 8 teclas brancas contando as duas pontas: Dó Si Lá Sol Fá Mi Ré Dó. Essa distância é a oitava. As duas notas têm o mesmo nome e soam como a mesma nota, uma mais aguda.',som:[[60,0,.6],[48,.7,.6],[60,1.4,1.2],[48,1.4,1.2]]},
 {c:'ler',p:65,u:'Livro p. 65',t:'Sinal de repetição',x:'Dois pontos junto da barra dupla: volte e toque aquele trecho mais uma vez. Se só houver o sinal do fim, volte para o começo da música. O app ainda não repete sozinho; repita você, como no livro.'},
 {c:'expr',p:66,u:'Livro p. 66',t:'Ritardando',x:'<i>rit.</i>: diminua o andamento aos poucos. Costuma aparecer no fim de uma frase ou da música.'},
 {c:'mao',p:68,u:'Livro p. 68',t:'Movimento paralelo e contrário',x:'<b>Paralelo:</b> as duas mãos andam na mesma direção. <b>Contrário:</b> andam em direções opostas, uma sobe e a outra desce. No contrário, os dedos com o mesmo número costumam tocar juntos.',som:[[60,0,.45],[48,0,.45],[62,.5,.45],[50,.5,.45],[64,1,.8],[52,1,.8],[60,2,.45],[60,2,.45],[62,2.5,.45],[59,2.5,.45],[64,3,.8],[57,3,.8]]},

 {c:'ritmo',p:70,u:'Unidade 6 (p. 70)',t:'Colcheia',x:'Vale meio tempo: duas colcheias cabem num tempo. Sozinha tem bandeirinha; em grupo, ganha uma barra. Conte "1 e 2 e": a semínima anda e a colcheia corre.',fig:'colcheia',som:[[60,0,.25],[62,.3,.25],[64,.6,.25],[65,.9,.25],[67,1.2,.6]]},
 {c:'teoria',p:71,u:'Livro p. 71',t:'Minueto',x:'Dança elegante em 3/4. Nomes de dança no título já dizem o compasso e o caráter da peça.'},
 {c:'expr',p:72,u:'Livro p. 72',t:'Crescendo e diminuendo',x:'O sinal que abre (&lt;) = ir aumentando o som aos poucos (cresc.). O que fecha (&gt;) = ir diminuindo (dim.).',som:[[60,0,.4,.3],[62,.5,.4,.45],[64,1,.4,.6],[65,1.5,.4,.8],[67,2,.8,1]]},
 {c:'expr',p:72,u:'Livro p. 72',t:'Frase',x:'Frase é uma "oração" musical: uma ideia completa. Costuma vir com uma ligadura longa por cima. Dê uma direção a ela, crescendo até o ponto alto e diminuindo depois.'},
 {c:'ritmo',p:74,u:'Livro p. 74',t:'Anacruse',x:'A nota antes do 1º tempo forte. O primeiro compasso fica incompleto, e o que falta nele costuma estar no último compasso. Conte o compasso inteiro antes de entrar; "Parabéns" começa assim.'},
 {c:'expr',p:75,u:'Livro p. 75',t:'Fermata',x:'Um "olho" em cima da nota: segure mais tempo do que a nota vale, até sentir que acabou. Depois volte a contar normalmente.',fig:'fermata',som:[[60,0,2.4]]},
 {c:'harm',p:76,u:'Livro p. 76',t:'Fundamental, 3ª e 5ª',fig:'triade',x:'As três notas de um acorde maior têm nome pela posição: <b>fundamental</b> (a que dá o nome), <b>3ª</b> e <b>5ª</b>. Em Dó: Dó, Mi, Sol. Bloqueado = juntas; quebrado = uma depois da outra.',som:[[48,0,.5],[52,.5,.5],[55,1,.5],[48,1.7,1.2],[52,1.7,1.2],[55,1.7,1.2]]},
 {c:'harm',p:77,u:'Livro p. 77',t:'Acorde suspenso (Csus4)',fig:'tec|48,53,55|C/Dó,F/Fá,G/Sol',x:'"sus4" quer dizer 4ª suspensa: o Mi sai e entra o Fá. Fica Dó, Fá, Sol. O som fica "no ar" e pede para voltar ao acorde de Dó, um movimento bem calmo.',som:[[48,0,1],[53,0,1],[55,0,1],[48,1.1,1.5],[52,1.1,1.5],[55,1.1,1.5]]},
 {c:'mao',p:78,u:'Livro p. 78',t:'Si abaixo do Dó central',x:'Para alcançar esse Si sem mudar a mão inteira, há dois jeitos: <b>estender o polegar</b> para a esquerda, ou <b>passar o dedo 2 por cima</b> do polegar. Use o que combinar melhor com a nota seguinte.',som:[[62,0,.5],[59,.6,.8]]},

 {c:'ler',p:82,u:'Unidade 7 (p. 82)',t:'Espaços da clave de Sol: F-A-C-E',x:'Os quatro espaços da clave de Sol, de baixo para cima, são Fá, Lá, Dó, Mi (F A C E, "face" em inglês).',fig:'face',jogo:'n4'},
 {c:'harm',p:86,u:'Livro p. 86',t:'Acorde de F no lugar do livro',fig:'tec|53,57,60|F/Fá,A/Lá,C/Dó',x:'O livro toca o acorde de Fá perto do Dó central: Fá, Lá, Dó, com 5, 3 e 1 na mão esquerda. Três notas construídas em 3as, como o de Dó.',som:[[53,0,1.4],[57,0,1.4],[60,0,1.4]]},
 {c:'harm',p:88,u:'Livro p. 88',t:'Arpejo',x:'A palavra vem de "harpa": tocar as notas de um acorde uma depois da outra, subindo ou descendo. No arpejo cruzado, a mão esquerda passa por cima da direita para continuar subindo.',som:[[53,0,.4],[57,.4,.4],[60,.8,.4],[65,1.2,.4],[69,1.6,.4],[72,2,.8]]},

 {c:'ler',p:90,u:'Unidade 8 (p. 90)',t:'Pentascala de Dó agudo',x:'Dó no 3º espaço da clave de Sol, depois Ré, Mi, Fá e Sol. Sobem de 2ª em 2ª. Você agora tem a mesma pentascala em três lugares: grave, central e agudo.',som:[[72,0,.45],[74,.5,.45],[76,1,.45],[77,1.5,.45],[79,2,.8]],jogo:'n4'},
 {c:'teoria',p:94,u:'Livro p. 94',t:'Imitação',x:'Uma mão toca uma ideia e, logo depois, a outra repete a mesma ideia. É como uma conversa entre as mãos.'},
 {c:'mao',p:96,u:'Unidade 9 (p. 96)',t:'Pentascala de Sol em 3 lugares',x:'Sol, Lá, Si, Dó, Ré. Aparece no Sol grave, no Sol da clave de Fá (ambos com a mão esquerda, 5 no Sol) e no Sol da clave de Sol (mão direita, 1 no Sol). De um Sol para o seguinte há uma oitava.',som:[[67,0,.4],[69,.45,.4],[71,.9,.4],[72,1.35,.4],[74,1.8,.8]]},
 {c:'ritmo',p:98,u:'Livro p. 98',t:'Andante, Moderato, Allegro',x:'Palavras italianas de andamento: <b>Andante</b> = no passo de quem caminha; <b>Moderato</b> = moderado; <b>Allegro</b> = rápido e alegre.'},
 {c:'harm',p:100,u:'Livro p. 100',t:'Acordes G e Gsus4',fig:'tec|55,59,62|G/Sol,B/Si,D/Ré',x:'Mesmo desenho do Dó: <b>G</b> é Sol, Si, Ré e <b>Gsus4</b> é Sol, Dó, Ré. No sus4, o Si sobe para o Dó.',som:[[55,0,1],[60,0,1],[62,0,1],[55,1.1,1.5],[59,1.1,1.5],[62,1.1,1.5]]},

 {c:'teoria',p:104,u:'Unidade 10 (p. 104)',t:'Meio tom',x:'A distância até a tecla mais perto, branca ou preta. Mi–Fá e Si–Dó são meios tons entre duas teclas brancas, porque não há preta entre elas.',som:[[64,0,.6],[65,.7,.6],[60,1.5,.6],[61,2.2,.6]]},
 {c:'ler',p:104,u:'Livro p. 104',t:'Sustenido',fig:'acidentes',x:'♯ = meio tom acima. Vale para aquela nota até o fim do compasso; no compasso seguinte precisa ser escrito de novo.',som:[[65,0,.6],[66,.7,.6]]},
 {c:'ler',p:108,u:'Livro p. 108',t:'Bemol',fig:'acidentes',x:'♭ = meio tom abaixo. Mesma regra do sustenido: vale até a barra de compasso.',som:[[71,0,.6],[70,.7,.6]]},
 {c:'ler',p:110,u:'Livro p. 110',t:'Bequadro',fig:'acidentes',x:'♮ cancela um sustenido ou bemol e devolve a nota natural. Às vezes aparece só como lembrete, no compasso seguinte. Uma nota com acidente ligada à próxima continua com ele, mesmo depois da barra.',som:[[70,0,.6],[71,.7,.6]]},
 {c:'teoria',p:112,u:'Livro p. 112',t:'Tom',x:'Dois meios tons, sempre com uma tecla no meio. Dó–Ré é um tom, porque Dó♯ fica entre eles.',som:[[60,0,.6],[62,.7,.6]]},
 {c:'teoria',p:114,u:'Livro p. 114',t:'Pentascala maior: T T ½ T',x:'Toda pentascala maior segue o mesmo padrão: <b>tom, tom, meio tom, tom</b>. Em Dó só há teclas brancas. Em Ré, para manter o padrão, entra o Fá♯; em Lá, o Dó♯. São 12 no total, e estão todas no app na p. 176.',som:[[62,0,.45],[64,.5,.45],[66,1,.45],[67,1.5,.45],[69,2,.8]]},

 {c:'teoria',p:116,u:'Unidade 11 (p. 116)',t:'Como contar um intervalo',x:'Conte as teclas brancas (ou letras) incluindo a primeira e a última. Dó até Fá: Dó Ré Mi Fá = 4ª.',som:[[60,0,.6],[65,.7,.8]]},
 {c:'teoria',p:116,u:'Unidade 11 (p. 116)',t:'4ª e 5ª na pauta',x:'<b>4ª</b> = de linha para espaço, ou de espaço para linha. <b>5ª</b> = de linha para linha, ou de espaço para espaço, pulando uma. A 5ª tem um som bem aberto.',som:[[60,0,.6],[65,.6,.8],[60,1.6,.6],[67,2.2,.8]]},
 {c:'teoria',p:122,u:'Livro p. 122',t:'6ª',x:'Seis teclas brancas contando as pontas: Dó até Lá. Na pauta, de linha para espaço ou de espaço para linha, como a 4ª, mas bem mais larga.',som:[[60,0,.6],[69,.7,.8],[60,1.7,1],[69,1.7,1]]},

 {c:'teoria',p:128,u:'Unidade 12 (p. 128)',t:'Escala de Dó maior',x:'A pentascala de Dó mais Lá e Si, terminando no Dó de cima. A escala maior é toda de tons, menos dois meios tons: entre os graus 3–4 (Mi–Fá) e 7–8 (Si–Dó).',fig:'escala',som:[[60,0,.4],[62,.4,.4],[64,.8,.4],[65,1.2,.4],[67,1.6,.4],[69,2,.4],[71,2.4,.4],[72,2.8,.9]]},
 {c:'teoria',p:128,u:'Livro p. 128',t:'Tônica, dominante e sensível',x:'Nomes dos graus da escala: <b>tônica</b> = 1º grau, a casa da música; <b>dominante</b> = 5º grau; <b>sensível</b> = 7º grau, que "puxa" para a tônica logo acima. Toque a escala até o Si e pare: o ouvido pede o Dó.',som:[[60,0,.5],[67,.6,.5],[71,1.2,.9],[72,2.1,1.1]]},
 {c:'mao',p:129,u:'Livro p. 129',t:'Dedilhado da escala',x:'Mão direita, subindo: 1 2 3, <b>polegar passa por baixo</b>, 1 2 3 4 5. Mão esquerda, subindo: 5 4 3 2 1, <b>o 3 passa por cima</b>, 3 2 1. Descendo, faz-se o caminho inverso. O polegar passa leve, sem levantar o cotovelo.'},
 {c:'teoria',p:130,u:'Livro p. 130',t:'Tonalidade de Dó maior',x:'Uma música em Dó maior usa as notas da escala de Dó na melodia e na harmonia, e quase sempre termina com Dó no baixo.'},
 {c:'mao',p:132,u:'Livro p. 132',t:'Melodia acima do acompanhamento',x:'A mão do acompanhamento toca mais baixo que a mão da melodia. Deixe os dedos da harmonia na superfície da tecla e dê mais peso à melodia.'},
 {c:'harm',p:134,u:'Unidade 13 (p. 134)',t:'Acorde G7',fig:'tec|47,53,55|B/Si,F/Fá,G/Sol',x:'Sol com sétima: Sol, Si, Ré e Fá. Na mão esquerda costuma ser tocado invertido e com 3 notas: Si, Fá e Sol, sem o Ré. Assim a mão quase não anda desde o acorde de Dó.',som:[[47,0,1],[53,0,1],[55,0,1],[48,1.1,1.5],[52,1.1,1.5],[55,1.1,1.5]]},
 {c:'harm',p:134,u:'Livro p. 134',t:'Posição fundamental e inversão',x:'Em <b>posição fundamental</b>, a nota que dá o nome ao acorde é a mais grave. <b>Inverter</b> é trocar a ordem das notas: as notas continuam as mesmas, mas uma delas muda de oitava. Serve para a mão andar menos entre um acorde e outro.'},
 {c:'harm',p:134,u:'Livro p. 134',t:'Algarismos romanos: I e V7',x:'Mostram em que grau da escala o acorde se apoia. Em Dó: <b>I</b> = C e <b>V7</b> = G7. Cifra fica em cima da pauta; o algarismo romano fica embaixo.'},
 {c:'mao',p:136,u:'Livro p. 136',t:'Troca de dedo',x:'Tocar uma nota repetida com outro dedo para a mão chegar a uma nova posição.'},
 {c:'harm',p:142,u:'Unidade 14 (p. 142)',t:'Acordes principais: I, IV e V',fig:'tec|48,52,55,53,57,60|C/Dó,E/Mi,G/Sol,F/Fá,A/Lá,C/Dó',x:'São os acordes construídos nos graus 1, 4 e 5 da escala: <b>tônica</b>, <b>subdominante</b> e <b>dominante</b>. Em Dó maior: C, F e G. Com esses três dá para acompanhar uma quantidade enorme de músicas.',som:[[48,0,.8],[52,0,.8],[55,0,.8],[53,.9,.8],[57,.9,.8],[60,.9,.8],[55,1.8,.8],[59,1.8,.8],[62,1.8,.8],[48,2.7,1.2],[52,2.7,1.2],[55,2.7,1.2]]},
 {c:'harm',p:144,u:'Livro p. 144',t:'Inverter o IV',x:'Para evitar o salto de C para F, a mão esquerda toca o acorde de Fá como Dó, Fá, Lá (5-2-1): o Dó fica parado, o Mi sobe para Fá e o Sol sobe para Lá.',som:[[48,0,.9],[52,0,.9],[55,0,.9],[48,1,1.3],[53,1,1.3],[57,1,1.3]]},
 {c:'ler',p:148,u:'Livro p. 148',t:'Acidentes',x:'Sustenidos, bemóis e bequadros fora da escala da música. Eles trazem notas de fora para dar cor. Em The Entertainer, o Ré♯ é um deles.'},
 {c:'harm',p:150,u:'Livro p. 150',t:'Lead sheet',x:'Partitura só com a melodia e a cifra. Quem toca decide como fazer o acompanhamento. Comece com um acorde no 1º tempo de cada compasso. Compasso sem letra: repita o acorde anterior. É assim que a maioria da música popular é tocada.'},
 {c:'teoria',p:154,u:'Unidade 15 (p. 154)',t:'Escala de Sol maior',x:'A pentascala de Sol mais Mi e Fá♯, terminando no Sol de cima. O Fá♯ é necessário para o meio tom ficar entre os graus 7 e 8.',som:[[67,0,.4],[69,.4,.4],[71,.8,.4],[72,1.2,.4],[74,1.6,.4],[76,2,.4],[78,2.4,.4],[79,2.8,.9]]},
 {c:'ler',p:156,u:'Livro p. 156',t:'Armadura de clave',x:'Os sustenidos ou bemóis logo depois da clave valem para a música toda. Um ♯ na linha do Fá: todo Fá vira Fá♯, em qualquer oitava (tonalidade de Sol maior).'},
 {c:'harm',p:160,u:'Unidade 16 (p. 160)',t:'Acorde D7',fig:'tec|54,60,62|F♯,C/Dó,D/Ré',x:'Ré, Fá♯, Lá e Dó. É o V7 de Sol maior. Na mão esquerda, invertido e com 3 notas: Fá♯, Dó e Ré, sem o Lá.',som:[[54,0,1],[60,0,1],[62,0,1],[55,1.1,1.5],[59,1.1,1.5],[62,1.1,1.5]]},
 {c:'expr',p:162,u:'Livro p. 162',t:'Pianíssimo',x:'<b>pp</b>: muito suave, mais suave que <b>p</b>.'},
 {c:'harm',p:164,u:'Livro p. 164',t:'Acordes em Sol maior',x:'Em Sol: I = G, IV = C, V7 = D7. Para a mão andar pouco, o IV vira Sol, Dó, Mi (5-2-1).',som:[[55,0,.9],[59,0,.9],[62,0,.9],[55,1,.9],[60,1,.9],[64,1,.9],[54,2,.9],[60,2,.9],[62,2,.9],[55,3,1.3],[59,3,1.3],[62,3,1.3]]},
 {c:'ler',p:165,u:'Livro p. 165',t:'1ª e 2ª casa',x:'Toque até a 1ª casa, volte para o sinal de repetição e, na segunda vez, pule a 1ª casa e toque a 2ª.'}];
function concFig(s,k){var INK=jInk(),W=300,Y={tt:30,bt:114},q=function(x,c,i,d,col){return jNota(s,x,c,i,col||INK,INK,null,d,Y)},tx=function(x,y,t,st){return el(s,'text',{x:x,y:y,'text-anchor':'middle',style:'font-size:12px;fill:var(--tx2);'+(st||'')},t)};
 function pauta(qual,w){jPauta(s,w||W,INK,qual,Y)}
 function vb(y0,h){s.setAttribute('viewBox','0 '+y0+' '+W+' '+h)}
 /* teclado com as notas do acorde acesas: 'tec|48,52,55|Dó,Mi,Sol' */
 if(k.indexOf('tec|')===0){var pt=k.split('|'),on=pt[1].split(',').map(Number),nm=pt[2].split(','),ini=Math.floor(Math.min.apply(null,on)/12)*12,fim=ini+23;if(Math.max.apply(null,on)>fim)fim+=12;
  var tw=22,ax=0,xs={};for(var a=ini;a<=fim;a++)if(!isB(a)){xs[a]=ax;ax+=tw}
  s.setAttribute('viewBox','0 0 '+ax+' 104');s.style.maxWidth=Math.min(420,ax*1.4)+'px';
  for(a=ini;a<=fim;a++)if(!isB(a)){var i1=on.indexOf(a);el(s,'rect',{x:xs[a],y:2,width:tw-1,height:84,rx:3,style:'fill:'+(i1>=0?'#B5D4F4':'#fff')+';stroke:#888780'});if(i1>=0&&nm[i1]){var lb=nm[i1].split('/');el(s,'text',{x:xs[a]+tw/2,y:68,'text-anchor':'middle',style:'font-size:11px;fill:#185FA5;font-weight:700'},lb[0]);if(lb[1])el(s,'text',{x:xs[a]+tw/2,y:80,'text-anchor':'middle',style:'font-size:9px;fill:#185FA5;font-weight:700'},lb[1])}if(a===60)tx(Math.max(26,Math.min(ax-26,xs[a]+tw/2)),99,'Dó central','font-size:9px')}
  for(a=ini;a<=fim;a++)if(isB(a)){var i2=on.indexOf(a);el(s,'rect',{x:xs[a-1]+tw-7,y:2,width:13,height:52,rx:2,style:'fill:'+(i2>=0?'#378ADD':'#2b2b29')});if(i2>=0&&nm[i2])tx(xs[a-1]+tw-.5,66,nm[i2].split('/')[0],'font-size:10px;font-weight:700;fill:#185FA5')}
  return}
 /* cifra: as letras em cima da pauta e a melodia embaixo delas */
 if(k==='cifra'){pauta('g');vb(0,100);[[62,30,'C'],[112,29,''],[162,28,''],[212,29,'G'],[262,28,'C']].forEach(function(n){q(n[0],'g',n[1]);if(n[2])el(s,'text',{x:n[0],y:18,'text-anchor':'middle',style:'font-size:16px;font-weight:700;fill:#378ADD'},n[2])});return}
 /* acorde empilhado com o nome de cada nota */
 if(k==='triade'){pauta('g');vb(0,100);[[28,'fundamental (Dó)'],[30,'3ª (Mi)'],[32,'5ª (Sol)']].forEach(function(n,i){q(100,'g',n[0]);var y=jy('g',n[0],Y);el(s,'text',{x:128,y:y+4,style:'font-size:12px;fill:var(--tx2)'},n[1])});return}
 if(k==='teclas'){var x=0,kw=22,ws=[];vb(0,96);for(var m=48;m<=72;m++){if(!isB(m)){el(s,'rect',{x:x+10,y:2,width:kw-1,height:80,rx:3,style:'fill:'+(m%12===0?'#B5D4F4':'#fff')+';stroke:#888780'});if(m%12===0)tx(x+10+kw/2,76,'Dó','font-size:10px;fill:#185FA5;font-weight:700');ws[m]=x;x+=kw}}
  x=0;for(m=48;m<=72;m++){if(!isB(m)){x+=kw;continue}el(s,'rect',{x:x+10-kw*0.3,y:2,width:kw*0.6,height:48,rx:2,style:'fill:#2C2C2A'})}tx(150,94,'grupo de 2 pretas · grupo de 3 pretas','font-size:10px');return}
 if(k==='figuras'){vb(0,96);el(s,'line',{x1:10,x2:290,y1:62,y2:62,style:'stroke:'+INK});[[50,1,'semínima','1'],[115,2,'mínima','2'],[185,3,'mín. pontuada','3'],[255,4,'semibreve','4']].forEach(function(f){jNota(s,f[0],'g',33,INK,INK,null,f[1],{tt:62-30,bt:0});tx(f[0],84,f[2]);tx(f[0],14,f[3]+(f[3]==='1'?' tempo':' tempos'),'font-weight:700;fill:var(--tx)')});return}
 if(k==='pauta'){pauta('g');vb(8,96);[[60,30,'linha'],[90,31,'espaço'],[120,32,'linha'],[150,33,'espaço'],[180,34,'linha'],[210,35,'espaço'],[240,36,'linha']].forEach(function(n){q(n[0]+20,'g',n[1]);tx(n[0]+20,100,nmT([n[1],0]),'font-size:11px')});return}
 if(k==='claves'){pauta('gf',170);vb(10,170);q(110,'g',32,4,'#185FA5');tx(180,jy('g',32,Y)+4,'Sol: 2ª linha','text-anchor:start;fill:#185FA5;font-weight:700');q(110,'f',24,4,'#185FA5');tx(180,jy('f',24,Y)+4,'Fá: 4ª linha','text-anchor:start;fill:#185FA5;font-weight:700');return}
 if(k==='central'){pauta('gf',170);vb(10,170);q(80,'g',28,4,'#185FA5');q(140,'f',28,4,'#185FA5');tx(180,jy('g',28,Y)+4,'Dó central','text-anchor:start;fill:#185FA5;font-weight:700');tx(180,jy('f',28,Y)+4,'o mesmo Dó','text-anchor:start;fill:#185FA5;font-weight:700');return}
 if(k==='f44'||k==='f34'){pauta('g',100);var nb=k==='f44'?'4':'3';[[Y.tt+23,nb],[Y.tt+47,'4']].forEach(function(t){el(s,'text',{x:62,y:t[0],'text-anchor':'middle',style:'font-size:24px;font-weight:700;fill:'+INK},t[1])});tx(112,Y.tt+18,nb+' tempos por compasso','text-anchor:start;font-size:12px');tx(112,Y.tt+44,'semínima = 1 tempo','text-anchor:start;font-size:12px');s.setAttribute('viewBox','0 18 300 66');return}
 if(k==='acento'){pauta('g');vb(0,100);[[70,28],[120,30],[170,32],[220,30],[270,28]].forEach(function(n,j){q(n[0],'g',n[1]);if(j===0||j===4)el(s,'text',{x:n[0],y:Y.tt+80,'text-anchor':'middle',style:'font-size:18px;font-weight:700;fill:#185FA5'},'>')});return}
 if(k==='pedal'){pauta('g');vb(0,110);[[70,28,4],[150,30,2],[230,32,2]].forEach(function(n){q(n[0],'g',n[1],n[2])});el(s,'path',{d:'M60 '+(Y.tt+70)+' V'+(Y.tt+82)+' H270 V'+(Y.tt+70),style:'fill:none;stroke:#185FA5;stroke-width:2'});tx(60,Y.tt+96,'pé desce','font-size:10px');tx(165,Y.tt+96,'fica embaixo','font-size:10px');tx(270,Y.tt+96,'sobe','font-size:10px');return}
 if(k==='segunda'||k==='terca'){pauta('g');vb(0,100);var ns=k==='segunda'?[30,31,32,31]:[28,30,32,30];ns.forEach(function(i,j){q(70+j*60,'g',i);tx(70+j*60,98,nmT([i,0]),'font-size:11px')});
  for(var j=0;j<3;j++)tx(100+j*60,Y.tt-4,k==='segunda'?'2ª':'3ª','fill:#185FA5;font-weight:700');return}
 if(k==='suplementar'){pauta('g');vb(-16,120);[[70,28],[120,40],[170,41],[220,42]].forEach(function(n){q(n[0],'g',n[1]);tx(n[0],Y.tt+96,jNome(n[1]),'font-size:11px')});return}
 if(k==='ligval'||k==='legato'){pauta('g');vb(0,100);var L=k==='ligval'?[[90,31,2],[190,31,2]]:[[60,28],[110,29],[160,30],[210,31],[260,32,2]];L.forEach(function(n){q(n[0],'g',n[1],n[2]||1)});
  var a=L[0],b=L[L.length-1],ya=jy('g',a[1],Y)+12,yb=jy('g',b[1],Y)+12;el(s,'path',{d:'M'+(a[0]+4)+' '+ya+' Q'+((a[0]+b[0])/2)+' '+(Math.max(ya,yb)+(k==='ligval'?16:26))+' '+(b[0]-4)+' '+yb,style:'fill:none;stroke:#185FA5;stroke-width:2'});return}
 if(k==='staccato'){pauta('g');vb(0,100);[[70,32],[130,32],[190,30],[250,28]].forEach(function(n){q(n[0],'g',n[1]);el(s,'circle',{cx:n[0],cy:jy('g',n[1],Y)+(n[1]<34?14:-14),r:2.6,style:'fill:#185FA5'})});return}
 if(k==='pausas'){pauta('g');vb(10,74);[[70,1,'1 tempo'],[150,2,'2 tempos'],[230,4,'o compasso']].forEach(function(p){drawRest(s,p[0],Y.tt+24,p[1],INK);tx(p[0],Y.tt+66,p[2],'font-size:11px')});return}
 if(k==='colcheia'){pauta('g');vb(0,100);q(70,'g',30,0.5);[[140,30],[180,32]].forEach(function(n){q(n[0],'g',n[1],1)});el(s,'path',{d:'M146.5 '+(jy('g',30,Y)-36)+' L186.5 '+(jy('g',32,Y)-36)+' v5 L146.5 '+(jy('g',30,Y)-31)+' Z',style:'fill:'+INK});tx(70,98,'sozinha','font-size:11px');tx(160,98,'em par = 1 tempo','font-size:11px');return}
 if(k==='fermata'){pauta('g');vb(-10,100);q(150,'g',32,2);var fy=Y.tt-8;el(s,'path',{d:'M138 '+fy+' Q150 '+(fy-18)+' 162 '+fy,style:'fill:none;stroke:#185FA5;stroke-width:2.4'});el(s,'circle',{cx:150,cy:fy-3,r:2.6,style:'fill:#185FA5'});return}
 if(k==='face'){pauta('g');vb(8,96);[31,33,35,37].forEach(function(i,j){q(80+j*55,'g',i,2,'#185FA5');tx(80+j*55,100,nmT([i,0]),'font-weight:700;fill:#185FA5')});return}
 if(k==='acidentes'){pauta('g');vb(0,100);[[70,31,'♯','Fá♯'],[150,34,'♭','Si♭'],[230,34,'♮','Si']].forEach(function(n){q(n[0],'g',n[1]);el(s,'text',{x:n[0]-20,y:jy('g',n[1],Y)+6,'text-anchor':'middle',style:'font-size:18px;fill:#185FA5'},n[2]);tx(n[0],98,NOMES==='pt'?n[3]:n[3].replace('Fá','F').replace('Si','B'),'font-size:11px')});return}
 if(k==='escala'){pauta('g');vb(0,100);for(var e=0;e<8;e++){q(52+e*31,'g',28+e,1,e===0||e===7?'#185FA5':e===4?'#185FA5':INK);tx(52+e*31,98,nmT([28+e,0]),'font-size:10px')}return}}
function concHtml(){var pg=PAGLIV&&PAGLIV.p||8,ja=CONC.filter(function(c){return c.p<=pg}),vem=CONC.filter(function(c){return c.p>pg}).slice(0,4),h=paginaHtml();
 h+='<details class="conc estudo"><summary><b>Como estudar para aprender mais rápido</b><span class="lb">o que fazer e o que evitar</span></summary><div class="conc-body"><h3 class="dh">Faça</h3><ol class="dicas">'+ESTUDO.map(function(d){return '<li class="dica">'+ilu(d[2],'dica')+'<div><b>'+d[0]+'.</b> '+d[1]+'</div></li>'}).join('')+'</ol><h3 class="dh">Evite (vira vício)</h3><ul class="dicas evite">'+VICIOS.map(function(d){return '<li class="dica">'+ilu(d[2],'dica')+'<div><b>'+d[0]+'.</b> '+d[1]+'</div></li>'}).join('')+'</ul></div></details>';
 var cat=concCat(),ord=ja.filter(function(c){return c.top}).concat(ja.filter(function(c){return !c.top}).reverse());
 h+='<h2 class="conc-h">O que você já viu, até a página '+pg+'</h2><div class="cchips" role="group" aria-label="Filtrar por assunto">'+CCAT.map(function(x){var n=x[0]==='todos'?ja.length:ja.filter(function(c){return c.c===x[0]}).length;return '<button type="button" class="cchip" data-ccat="'+x[0]+'" aria-pressed="'+(x[0]===cat)+'">'+ilu(x[2],'chip')+'<span>'+x[1]+'</span><small>'+n+'</small></button>'}).join('')+'</div><div class="conc-list">'+ord.map(function(c,j){var k=CONC.indexOf(c),ci=CCAT.filter(function(x){return x[0]===c.c})[0];
  return '<details class="conc" data-cc="'+c.c+'"'+(j===0?' open':'')+(cat!=='todos'&&cat!==c.c?' hidden':'')+'><summary>'+ilu(ci[2],'chip')+'<b>'+(c.nt?c.t:tDesc(c.t))+'</b><span class="lb">'+c.u+'</span></summary><div class="conc-body">'+(c.ilu?ilu(c.ilu,'conc'):'')+(c.fig?'<svg class="fig" data-fig="'+k+'" role="img" aria-label="Exemplo: '+c.t+'"></svg>':'')+'<p>'+(c.nt?c.x:tDesc(c.x))+'</p><div class="row">'+
   (c.som?'<button data-csom="'+k+'">▶ Ouvir</button>':'')+(c.jogo?'<button data-jgniv="'+c.jogo+'">Treinar no jogo das notas</button>':'')+'</div></div></details>'}).join('')+'</div>';
 if(vem.length)h+='<p class="lb vem">Vem aí: '+vem.map(function(c){return c.t+' (p. '+c.p+')'}).join(', ')+'.</p>';return h}
function concCat(){var v='todos';try{v=localStorage.getItem('conc_cat')||'todos'}catch(e){}return CCAT.some(function(x){return x[0]===v})?v:'todos'}
function concFiltra(raiz,v){raiz.querySelectorAll('[data-ccat]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.ccat===v))});raiz.querySelectorAll('details.conc[data-cc]').forEach(function(d){d.hidden=v!=='todos'&&d.dataset.cc!==v})}
function concMontar(p){p.querySelectorAll('[data-ccat]').forEach(function(b){b.onclick=function(){try{localStorage.setItem('conc_cat',b.dataset.ccat)}catch(e){}concFiltra(p,b.dataset.ccat)}});
 p.querySelectorAll('svg[data-fig]').forEach(function(s){try{concFig(s,CONC[+s.dataset.fig].fig)}catch(e){s.remove()}});
 p.querySelectorAll('[data-csom]').forEach(function(b){b.onclick=function(){var c=CONC[+b.dataset.csom];tocarSeq(c.som.map(function(n){return [n[0],n[1],n[2],n[3]||0.8]}))}})}
/* ---------- treinador: o que o resultado diz para fazer na próxima tentativa ----------
   Segue o modelo de retorno de Hattie (onde estou, para onde vou, próximo passo): um foco só por vez, com o lugar exato,
   o que aconteceu, como treinar (um exercício com números) e quando está pronto, e um botão que já prepara esse treino.
   Compara com as suas tentativas anteriores (fica guardado: piano_fb, por perfil) e sugere tirar ajudas (som guia, cores,
   nomes, nota acesa, cliques) quando você já acerta com elas: ajuda ligada o tempo todo vira dependência. */
var FB={};try{FB=JSON.parse(localStorage.getItem('piano_fb'))||{}}catch(e){}
var RLAST=null,FOCO_T='',AJI={tempo:'metronomo',pno:'ouvido',nomes:'guia',live:'olhos',hl:'olhos',cnt:'contar',clk:'contar'};
function fbSave(){try{localStorage.setItem('piano_fb',JSON.stringify(FB))}catch(e){}}
function fbKey(){var b=CUR.base||CUR;return b.id+(CUR._mao?'_'+CUR._mao:'')}
function fbHist(k){return FB[k]||[]}
function quando(t){var d=new Date(t),hj=new Date(),on=new Date();on.setDate(hj.getDate()-1);var hm=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
 return dkey(d)===dkey(hj)?'hoje, '+hm:dkey(d)===dkey(on)?'ontem, '+hm:String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')}
function faixa(l){l=l.slice().sort(function(a,b){return a-b});if(!l.length)return '';if(l.length===1)return 'o compasso '+l[0];var seg=l[l.length-1]-l[0]===l.length-1;return seg?'os compassos '+l[0]+' a '+l[l.length-1]:'os compassos '+l.slice(0,-1).join(', ')+' e '+l[l.length-1]}
/* recorde de uma música: a melhor tentativa da música inteira (sem trecho), com o modo e o andamento */
function recordeDe(k){var b=null;fbHist(k).forEach(function(x){if(x.tr)return;if(!b||x.pct>b.pct||(x.pct===b.pct&&x.mode==='time'&&(b.mode!=='time'||x.bpm>b.bpm)))b=x});return b}
function recLab(r){return r?r.pct+'% '+(r.mode==='time'?'com tempo a '+r.bpm+' BPM':'no modo Espera')+' ('+quando(r.t).replace(/, .*/,'')+')':''}
/* recorde por nível: cada música (e mão) tem um recorde para cada modo e andamento — modo Espera; com tempo a 50 BPM;
   a 55 BPM... — para comparar a melhora no mesmo nível. piano_recs = {música[_mão]: {nível: {pct, t, n}}}; só a música inteira.
   Na primeira vez, monta a partir das tentativas guardadas (piano_fb). */
var RECN=null;
function recnLer(){if(RECN)return RECN;try{RECN=JSON.parse(localStorage.getItem('piano_recs'))}catch(e){}
 if(!RECN){RECN={};Object.keys(FB).forEach(function(k){fbHist(k).forEach(function(x){if(!x.tr&&x.pct!=null)recnPoe(k,x.mode==='wait'?'wait':'time|'+x.bpm,x.pct,x.t)})});recnSalva()}return RECN}
function recnSalva(){try{localStorage.setItem('piano_recs',JSON.stringify(RECN||{}))}catch(e){}}
function recnPoe(k,nv,pct,t){var R=RECN||(RECN={}),o=R[k]||(R[k]={}),r=o[nv];if(!r)r=o[nv]={pct:pct,t:t,n:0};r.n=(r.n||0)+1;if(pct>r.pct){r.pct=pct;r.t=t}}
function nivelAgora(){return MODE==='wait'?'wait':'time|'+(+document.getElementById('bpm').value)}
function nivelNome(nv){return nv==='wait'?'no modo Espera':'com tempo a '+String(nv).split('|')[1]+' BPM'}
function recNivel(k,nv){return (recnLer()[k]||{})[nv]||null}
/* o melhor nível já alcançado nessa música: o maior andamento com 90%+ (ou, sem isso, a maior nota) */
function recMelhor(k){var o=recnLer()[k]||{},b=null;Object.keys(o).forEach(function(nv){var r=o[nv],bp=nv==='wait'?0:+nv.split('|')[1],x={nv:nv,pct:r.pct,bp:bp};
 if(!b||(x.pct>=90&&(b.pct<90||x.bp>b.bp))||(b.pct<90&&x.pct<90&&x.pct>b.pct))b=x});return b}
var AJ={tempo:['Passe para o modo Com tempo','Você acertou as notas no modo Espera. Agora o ritmo: no modo Com tempo, bem devagar.','Passar para Com tempo'],
 pno:['Toque sem o som guia','Você já acertou 3 vezes com o som guia ligado. Agora sem ele: é assim que dá para saber se você está lendo a partitura ou só seguindo o som. Se cair muito, ouça a música uma vez com ele e desligue de novo.','Desligar o som guia'],
 nomes:['Tire os nomes escritos nas notas','Com o nome escrito, o olho lê a letra e não a posição na pauta. Troque por dedos (ou nada) e leia pela pauta.','Trocar nomes por dedos'],
 live:['Desligue as cores durante a música','Você já acerta bem. Sem as cores, você aprende a perceber o erro pelo ouvido; o resultado completo continua aparecendo no fim.','Desligar as cores durante a música'],
 hl:['Desligue a nota acesa','A nota acesa em azul faz o olho seguir a luz. Sem ela, você acha a nota na partitura sozinho.','Desligar a nota acesa'],
 cnt:['Tire a contagem da tela','Você já acerta com o "Compasso 1 · tempo 1…" na tela. Agora conte você mesmo, baixinho ou em voz alta. Ela sai só deste exercício.','Tirar a contagem'],
 clk:['Uma vez sem os cliques','O tempo tem que estar dentro de você. Conte "1 2 3 4" em voz alta e toque sem metrônomo uma vez; depois compare o resultado.','Desligar os cliques']};
function ajudaSugerida(h,cur){var L=h.slice(-3),ok=function(f,min){return L.length>=3&&L.every(function(x){return f(x)&&x.pct>=(min||85)})};
 if(cur.mode==='wait'&&h.slice(-2).length===2&&h.slice(-2).every(function(x){return x.mode==='wait'&&x.pct>=90}))return 'tempo';
 if(OPT.pno&&(ok(function(x){return x.a.pno},80)||h.slice(-6).length===6&&h.slice(-6).every(function(x){return x.a.pno})))return 'pno';
 if(SHOW==='n'&&ok(function(x){return x.a.show==='n'}))return 'nomes';
 if(OPT.live!==false&&ok(function(x){return x.a.live!==false},90))return 'live';
 if(OPT.hl&&ok(function(x){return x.a.hl},90))return 'hl';
 if(OPT.cnt&&cur.mode==='time'&&ok(function(x){return x.a.cnt&&x.mode==='time'},90))return 'cnt';
 if(OPT.clk&&cur.mode==='time'&&ok(function(x){return x.a.clk&&x.mode==='time'},95))return 'clk';return null}
function ajuda(k){if(run)return;if(k==='tempo'){var b=document.querySelector('.mode[data-v="time"]');if(b)b.click()}
 else if(k==='nomes'){var b2=document.querySelector('.show[data-v="f"]');if(b2)b2.click()}
 else if(AJXK.indexOf(k)>=0)ajxDefine(k,false);
 else if(OPT[k]!==false){var b3=document.querySelector('.sw[data-k="'+k+'"]');if(b3)b3.click()}
 show('Pronto: '+(AJ[k]?AJ[k][2].toLowerCase():'ajuste feito')+(AJXK.indexOf(k)>=0?' só neste exercício (nos outros continua)':'')+'. Aperte "Começar".',true)}
/* compassos com problema, do pior para o melhor, e o tipo principal */
function coach(c,pct,tm,T){var n=EV.length,bpm=+document.getElementById('bpm').value,k=fbKey(),h=fbHist(k),tr=CUR.mmap?CUR.mmap.join(','):'',
  ant=h.filter(function(x){return x.tr===tr}).slice(-1)[0],sev={},tipo={},hands={};
 function add(e,t,w){var m=mnum(e);sev[m]=(sev[m]||0)+w;tipo[m]=tipo[m]||{};tipo[m][t]=(tipo[m][t]||0)+1;hands[t]=hands[t]||{};hands[t][e.h]=1}
 EV.forEach(function(e){if(e.wrongs&&e.wrongs.length)add(e,'nota',3);else if(e.st==='miss')add(e,'falta',2);
  if(tm&&e.pressMs!=null&&Math.abs(e.pressMs)>T.ok)add(e,'tempo',Math.abs(e.pressMs)>T.warn?1.5:1);
  if(tm&&e.relSt&&e.relSt!=='ok')add(e,e.relMs<0?'cedo':'demais',0.7)});
 var cnt=function(t){var s=0;Object.keys(tipo).forEach(function(m){s+=tipo[m][t]||0});return s},
  ms=function(t){return Object.keys(tipo).filter(function(m){return tipo[m][t]}).map(Number).sort(function(a,b){return (sev[b]||0)-(sev[a]||0)})},
  mao=function(t){var x=Object.keys(hands[t]||{});return x.length===1?x[0]:''};
 /* bloco para treinar: o pior compasso e os vizinhos que também tiveram problema (até 3), mais o compasso anterior quando o problema é chegar a tempo */
 function bloco(l,antes){if(!l.length)return [];var s=l[0],set={};l.forEach(function(m){set[m]=1});var b=[s];for(var d=1;d<=2&&b.length<3;d++){if(set[s+d])b.push(s+d);if(set[s-d]&&b.length<3)b.unshift(s-d)}
  b.sort(function(a,b){return a-b});var all=CUR.mmap||CUR.ms.map(function(_,i){return i+1});if(antes&&b[0]>all[0]&&all.indexOf(b[0]-1)>=0)b.unshift(b[0]-1);return b}
 var tot=CUR.ms.length,bpm5=function(f){return Math.max(30,Math.round(bpm*f/5)*5)},foco=null,mlist,mt,quem;
 function act(mode,b,m,lst){return 'd|'+mode+'|'+(b||0)+'|'+(m||'')+'|'+(lst&&lst.length&&lst.length<tot?lst.join(','):'')}
 var nw=cnt('nota'),nf=cnt('falta'),nt=cnt('tempo'),nc=cnt('cedo');
 var resto=[];if(nw)resto.push(nw+(nw>1?' notas trocadas':' nota trocada'));if(nf)resto.push(nf+(nf>1?' notas faltaram':' nota faltou'));if(tm&&nt)resto.push(nt+(nt>1?' notas fora do tempo':' nota fora do tempo'));if(tm&&nc)resto.push(nc+(nc>1?' notas soltas antes da hora':' nota solta antes da hora'));
 var obs=resto.length?' Ainda apareceram: '+resto.join(', ')+'. Dá para limpar depois, no trecho (veja "Tudo o que apareceu").':'';
 if(pct>=90&&tm&&bpm>=140){foco={i:'subir',t:'tirar uma ajuda ou subir a exigência',o:'Muito bem: '+pct+'% a '+bpm+' BPM, o andamento máximo do app.'+obs,c:'Toque sem os cliques ou sem a contagem, ou troque a Exigência do ritmo para "Normal".',p:'90% ou mais assim.',a:act('time',bpm,'',[]),l:'Repetir'}}
 else if(pct>=90){foco={i:'subir',t:tm?'subir o andamento':'ir para o modo Com tempo',o:'Muito bem: '+pct+'% '+(tm?'a '+bpm+' BPM':'das notas certas')+'.'+obs,c:tm?'Suba 5 BPM ('+(bpm+5)+') e toque de novo. Só suba de novo quando passar de 90%.':'No modo Com tempo, bem devagar.',p:tm?'90% ou mais a '+(bpm+5)+' BPM.':'90% no modo Com tempo.',a:tm?act('time',Math.min(140,bpm+5),'',[]):act('time',bpm5(0.9),'',[]),l:tm?'Subir para '+(bpm+5)+' BPM':'Passar para Com tempo'}}
 else if(nw){mlist=bloco(ms('nota'));quem=mao('nota');var ex=EV.filter(function(e){return e.wrongs&&e.wrongs.length}).slice(0,3).map(function(e){return 'no compasso '+mnum(e)+' você tocou '+e.wrongs.map(chrT).join(' e ')+' no lugar de '+evName(e)+(dedo(e)?' (dedo '+dedo(e)+')':'')});
  foco={i:'dedos',t:'acertar as notas d'+faixa(mlist),o:'Notas trocadas: '+ex.join('; ')+'.',
   c:'No modo Espera'+(quem?', só a mão '+(quem==='d'?'direita':'esquerda'):'')+', '+(mlist.length<tot?'só '+faixa(mlist):'a música toda')+'. Antes de cada nota, diga em voz alta o nome e o dedo ("Mi, dedo 3") e só então toque, olhando a partitura e não a mão.',
   p:'2 vezes seguidas com 100% no modo Espera. Depois, o mesmo trecho no modo Com tempo.',a:act('wait',0,quem,mlist),l:'Preparar esse treino'}}
 else if(tm&&nf>=Math.max(2,n*0.08)){mlist=bloco(ms('falta'),true);foco={i:'chegar',t:'chegar a tempo n'+faixa(mlist),o:nf+' notas ficaram sem tocar ('+faixa(ms('falta').slice(0,4))+'). Quando a mão não chega, quase sempre é a troca de posição ou a próxima nota que você ainda não leu.',
   c:'Com tempo, a '+bpm5(0.8)+' BPM (20% mais devagar), '+faixa(mlist)+'. O trecho começa um compasso antes de propósito, para treinar a chegada. Olhe a próxima nota enquanto toca a atual.',
   p:'90% ou mais no trecho; aí volte para '+bpm+' BPM.',a:act('time',bpm5(0.8),'',mlist),l:'Preparar esse treino'}}
 else if(tm&&nt>=Math.max(2,n*0.15)){var P=EV.filter(function(e){return e.pressMs!=null}).map(function(e){return e.pressMs}),avg=Math.round(P.reduce(function(a,b){return a+b},0)/P.length),
   lt=ms('tempo'),conc=lt.length&&lt.length<=Math.max(2,tot/3);mlist=conc?bloco(lt,true):[];
  foco={i:'metronomo',t:avg<-T.ok/2?'parar de adiantar':avg>T.ok/2?'parar de atrasar':'deixar o tempo regular',o:nt+' notas fora do tempo, em média '+Math.abs(avg)+' ms '+(avg<0?'antes':'depois')+' do clique'+(conc?', concentradas n'+faixa(lt.slice(0,3)):'')+'.',
   c:(avg<-T.ok/2?'A mão está correndo para a próxima nota. ':avg>T.ok/2?'Você procura a tecla na hora de tocar. ':'')+'A '+bpm5(0.85)+' BPM, com cliques: conte "1 e 2 e" em voz alta e faça a nota cair junto com a sua voz no clique.'+(avg>T.ok/2?' Deixe o dedo já em cima da próxima tecla antes da hora.':''),
   p:'a média ficar abaixo de '+T.ok+' ms (as notas verdes). Aí suba 5 BPM.',a:act('time',bpm5(0.85),'',mlist),l:'Preparar esse treino'}}
 else if(tm&&nc>=Math.max(2,n*0.1)){mlist=bloco(ms('cedo'));foco={i:'segurar',t:'segurar as notas longas',o:nc+' notas soltas antes da hora, principalmente '+faixa(ms('cedo').slice(0,3))+'.',
   c:'Com tempo, '+(mlist.length<tot?faixa(mlist):'a música toda')+': conte os tempos em voz alta enquanto segura ("1-2" na mínima, "1-2-3-4" na semibreve) e só levante o dedo quando a próxima nota descer.',
   p:'nenhuma nota amarela por "soltou cedo".',a:act('time',bpm,'',mlist),l:'Preparar esse treino'}}
 else if(pct>=90){var aj=null;foco={i:'subir',t:tm?'subir o andamento':'ir para o modo Com tempo',o:'Muito bem: '+pct+'% '+(tm?'a '+bpm+' BPM':'das notas certas')+'.',
   c:tm?'Suba 5 BPM ('+(bpm+5)+') e toque de novo. Só suba de novo quando passar de 90%.':'No modo Com tempo, bem devagar.',p:tm?'90% ou mais a '+(bpm+5)+' BPM.':'90% no modo Com tempo.',a:tm?act('time',Math.min(140,bpm+5),'',[]):act('time',bpm5(0.9),'',[]),l:tm?'Subir para '+(bpm+5)+' BPM':'Passar para Com tempo'}}
 else{mlist=bloco(Object.keys(sev).map(Number).sort(function(a,b){return sev[b]-sev[a]}));foco={i:'trecho',t:'limpar '+faixa(mlist),o:'É onde mais apareceu problema nesta tentativa.',c:'Treine só esse trecho, '+(tm?'a '+bpm5(0.85)+' BPM':'no modo Espera')+', 3 vezes seguidas.',p:'3 vezes com 90% ou mais.',a:act(tm?'time':'wait',tm?bpm5(0.85):0,'',mlist),l:'Preparar esse treino'}}
 /* comparação com a última vez (no mesmo trecho e na mesma mão) */
 var prog='',fm=Object.keys(sev).map(Number);
 if(ant){var d=pct-ant.pct,mel=(ant.fm||[]).filter(function(m){return fm.indexOf(m)<0&&(CUR.mmap?CUR.mmap.indexOf(m)>=0:m<=tot)}),rep=fm.filter(function(m){return (ant.fm||[]).indexOf(m)>=0});
  prog='Na última vez ('+quando(ant.t)+'): '+ant.pct+'%'+(ant.mode!==(tm?'time':'wait')?' no modo '+(ant.mode==='time'?'Com tempo':'Espera'):ant.bpm!==bpm&&tm?' a '+ant.bpm+' BPM':'')+'. '+(d>0?'Subiu '+d+' pontos.':d<0?'Caiu '+(-d)+' pontos.':'Igual.')+
   (mel.length?' Saíram certos agora: '+faixa(mel.slice(0,4)).replace(/^o |^os /,'')+'.':'')+(rep.length?' Ainda com problema: '+faixa(rep.slice(0,4)).replace(/^o |^os /,'')+(rep.length>=1&&h.length>=2&&h.slice(-2).every(function(x){return (x.fm||[]).indexOf(rep[0])>=0})?' (é a 3ª vez seguida no compasso '+rep[0]+': vale treinar ele sozinho)':'')+'.':'');
  if(ant.foco)prog+=' O foco da última vez era: '+ant.foco+'.'}
 var cur={t:Date.now(),pct:pct,mode:tm?'time':'wait',bpm:bpm,tr:tr,ti:(CUR.base||CUR).title,id:(CUR.base||CUR).id,mao:CUR._mao||'',fm:fm,foco:foco.t,act:foco.a,a:{pno:!!OPT.pno,live:OPT.live!==false,hl:!!OPT.hl,cnt:!!OPT.cnt,clk:!!OPT.clk,show:SHOW}};
 var sug=ajudaSugerida(h.concat([cur]),cur);RLAST={k:k,e:cur};FOCO_T=foco.t;
 return {foco:foco,prog:prog,sug:sug}}
function coachHtml(o){var f=o.foco,h='';
 if(o.prog)h+='<div class="prog">'+o.prog+'</div>';
 h+='<div class="foco">'+(f.i?ilu(f.i,'foco'):'')+'<div><div class="foco-t">Próxima tentativa: '+f.t+'</div><p>'+f.o+'</p><p><b>Como:</b> '+f.c+'</p><p class="foco-ok"><b>Pronto quando:</b> '+f.p+'</p><button class="primary" data-act="'+f.a+'">'+f.l+'</button></div></div>';
 if(o.sug){var s=AJ[o.sug];h+='<div class="sug">'+ilu(AJI[o.sug]||'olhos','sug')+'<div><b>'+s[0]+'.</b> '+s[1]+' <button data-act="o|'+o.sug+'">'+s[2]+'</button></div></div>'}
 return h}
/* guarda a tentativa (últimas 15 de cada música/mão) */
function fbGuardar(){if(!RLAST)return;var l=FB[RLAST.k]||[];l.push(RLAST.e);FB[RLAST.k]=l.slice(-15);RLAST=null;fbSave();paintUlt()}
/* embaixo do título: recorde da música e o que ficou da última vez */
function paintUlt(){var el_=document.getElementById('exUlt');if(!el_)return;if(!CUR){el_.innerHTML='';return}var k=fbKey(),h=fbHist(k),u=h[h.length-1],nv=nivelAgora(),rn=recNivel(k,nv),mb=recMelhor(k);
 if(!u&&!mb){el_.innerHTML='';return}
 el_.innerHTML=(mb?'<span class="rec">Recorde '+nivelNome(nv)+': <b>'+(rn?rn.pct+'%'+(rn.n>1?' ('+rn.n+' tentativas)':''):'ainda não tocou')+'</b>'+(mb.nv!==nv?' · melhor nível: '+mb.pct+'% '+nivelNome(mb.nv):'')+'</span>':'')+(u?'<span>Última vez ('+quando(u.t)+'): <b>'+u.pct+'%</b>'+(u.tr?' num trecho':'')+'. Ficou para treinar: '+u.foco+'.'+(u.act&&!run?' <button data-act="'+u.act+'">Preparar esse treino</button>':'')+'</span>':'')}
/* aba Hoje: de onde você parou */
function ultimaSessao(){var best=null;Object.keys(FB).forEach(function(k){var x=FB[k][FB[k].length-1];if(x&&(!best||x.t>best.e.t))best={k:k,e:x}});return best}
function retomar(k){var s=FB[k]&&FB[k][FB[k].length-1];if(!s)return;var ex=byId(s.id)||USERS.filter(function(u){return u.id===s.id})[0];if(!ex)return;
 if(s.mao&&s.mao!==MAO)setMao(s.mao);load_ex(ex);if(s.act)doAct(s.act);var p=document.getElementById('practice');if(p)p.scrollIntoView({block:'start',behavior:'smooth'})}
var VICIOS=[
 ['Tocar sempre com o som guia','Ouvir a música antes ajuda; tocar sempre junto faz você seguir o som em vez de ler. O app avisa quando é hora de desligar.','ouvido'],
 ['Olhar para as mãos o tempo todo','Os olhos ficam na partitura; a mão acha as teclas pelo tato (os grupos de 2 e 3 pretas são o mapa). Olhe para baixo só nas trocas de posição.','olhos'],
 ['Parar para consertar no modo Com tempo','Errou? Continue no tempo e conserte depois, no trecho. Parar toda vez ensina a parar.','metronomo'],
 ['Recomeçar sempre do começo','O começo fica ótimo e o fim nunca. Treine o pedaço difícil sozinho ("Trecho" ou "Treinar só os compassos com erro").','trecho'],
 ['Acelerar antes de acertar','Erro repetido rápido vira hábito. Suba o andamento só com 90% ou mais.','subir'],
 ['Trocar de dedo a cada vez','Escolha um dedilhado (o do livro ou o do app) e use sempre o mesmo: é ele que faz a mão achar a nota sozinha.','dedos'],
 ['Tocar tenso','Ombro alto, punho duro e dedos esticados cansam e erram. Mão arredondada, como segurando uma bola, punho solto. Se doer, pare e solte os braços.','tensao'],
 ['Pé no pedal o tempo todo','Pedal só onde está escrito; levante na troca de acorde, senão o som embola.','pedal']];
/* ---------- ilustrações do app: desenhos de traço simples, na cor do texto (claro e escuro) com detalhes em azul ----------
   ilu(nome, classe extra) devolve o <svg>. Classes nos desenhos: a = traço azul, af = preenchido azul-claro, f = preenchido na cor do texto */
var ILU={
 pauta:['Partitura','<path d="M8 22h80M8 32h80M8 42h80M8 52h80M8 62h80" stroke-width="1.4"/><ellipse class="af" cx="42" cy="47" rx="8" ry="5.5" transform="rotate(-18 42 47)"/><path class="a" d="M49 45V14"/><ellipse class="af" cx="68" cy="37" rx="8" ry="5.5" transform="rotate(-18 68 37)"/><path class="a" d="M75 35V8"/>'],
 acorde:['Acorde','<ellipse class="f" cx="42" cy="56" rx="14" ry="9"/><ellipse class="f" cx="42" cy="36" rx="14" ry="9"/><ellipse class="f" cx="42" cy="16" rx="14" ry="9"/><path d="M56 56V4" stroke-width="3.4"/>'],
 juntar:['Melodia mais acorde','<ellipse class="f" cx="22" cy="42" rx="10" ry="7"/><path d="M32 42V10" stroke-width="3"/><path class="a" d="M43 32h12M49 26v12" stroke-width="3.4"/><ellipse class="f" cx="72" cy="50" rx="9" ry="6"/><ellipse class="f" cx="72" cy="36" rx="9" ry="6"/><ellipse class="f" cx="72" cy="22" rx="9" ry="6"/><path d="M81 50V6" stroke-width="3"/><text x="24" y="68" text-anchor="middle" style="font-size:12px">melodia</text><text x="72" y="68" text-anchor="middle" style="font-size:12px">acorde</text>'],
 escala:['Escala','<path d="M8 62h18V50h16V38h16V26h16V14h14"/><circle class="af" cx="17" cy="54" r="4.5"/><circle class="af" cx="34" cy="42" r="4.5"/><circle class="af" cx="50" cy="30" r="4.5"/><circle class="af" cx="66" cy="18" r="4.5"/>'],
 expressao:['Expressão','<path class="a" d="M10 36L72 16M10 36L72 56"/><path d="M84 18c-4 8-4 28 0 36" stroke-width="2.6"/>'],
 livro:['Livro','<path d="M48 18C38 11 20 11 10 15v44c10-4 28-4 38 3c10-7 28-7 38-3V15c-10-4-28-4-38 3z"/><path d="M48 18v44"/><path class="a" d="M18 26h20M18 34h20M58 26h20M58 34h14" stroke-width="1.6"/>'],
 historico:['Histórico','<path d="M12 8v52h74"/><rect class="af" x="20" y="38" width="10" height="22" rx="2"/><rect class="af" x="36" y="28" width="10" height="32" rx="2"/><rect class="af" x="52" y="34" width="10" height="26" rx="2"/><rect class="af" x="68" y="18" width="10" height="42" rx="2"/>'],
 teclado:['Piano','<rect x="6" y="16" width="84" height="42" rx="4"/><path d="M18 16v42M30 16v42M42 16v42M54 16v42M66 16v42M78 16v42" stroke-width="1.4"/><rect class="f" x="14" y="16" width="8" height="24" rx="1"/><rect class="f" x="26" y="16" width="8" height="24" rx="1"/><rect class="f" x="50" y="16" width="8" height="24" rx="1"/><rect class="f" x="62" y="16" width="8" height="24" rx="1"/><rect class="f" x="74" y="16" width="8" height="24" rx="1"/>'],
 tela:['Tela','<rect x="8" y="10" width="80" height="46" rx="5"/><path d="M36 66h24M48 56v10"/><path d="M16 26h64M16 32h64M16 38h64" stroke-width="1.1"/><circle class="a" cx="40" cy="32" r="3" fill="#378ADD"/>'],
 facil:['Facilidades','<circle cx="48" cy="14" r="7"/><path d="M20 26c18 6 38 6 56 0M48 30v16l-10 18M48 46l10 18"/><circle class="af" cx="72" cy="52" r="10"/><path class="a" d="M68 52l3 3 6-6"/>'],
 mao:['Mão arredondada, como segurando uma bola','<line x1="4" y1="60" x2="92" y2="60"/><path d="M12 60v7M26 60v7M40 60v7M54 60v7M68 60v7M82 60v7" stroke-width="1.3"/><rect class="f" x="21" y="60" width="9" height="5" rx="1"/><rect class="f" x="49" y="60" width="9" height="5" rx="1"/>'+
  '<circle class="af" cx="56" cy="45" r="9" stroke-dasharray="3 3"/><path d="M2 30h20M2 42h20"/><path d="M22 30C34 23 48 17 61 21C71 24 77 36 76 58"/><path d="M22 42C30 42 38 40 46 38C57 35 66 43 68 58"/><path d="M60 23C66 30 68 42 66 56" stroke-width="1.5"/><path d="M38 41C43 46 45 52 43 58" stroke-width="1.8"/><circle class="a" cx="72" cy="59" r="2.6" fill="#378ADD"/>'],
 postura:['Costas retas, antebraço na altura das teclas','<circle cx="28" cy="12" r="7"/><path d="M28 20v28"/><path d="M28 25l10 15h24"/><path d="M62 40c3 0 4 2 4 5"/><path d="M28 48h18v18h7"/><rect x="10" y="50" width="26" height="5" rx="2"/><path d="M14 55v13M32 55v13"/>'+
  '<rect x="60" y="45" width="32" height="5" rx="1"/><path d="M62 50v18M90 50v18"/><path class="a" d="M38 40h30" stroke-dasharray="3 3"/><path class="a" d="M76 22l4 4 8-9"/>'],
 olhos:['Olhos na partitura, não nas mãos','<path d="M6 30c8-10 22-10 30 0c-8 10-22 10-30 0z"/><circle class="f" cx="23" cy="30" r="4"/><path class="a" d="M40 30h12m-5-5 5 5-5 5"/>'+
  '<rect x="56" y="12" width="36" height="38" rx="3"/><path d="M60 22h28M60 27h28M60 32h28M60 37h28M60 42h28" stroke-width="1.2"/><circle class="f" cx="70" cy="34.5" r="2.6"/><circle class="f" cx="80" cy="29.5" r="2.6"/><path d="M10 62h30" stroke-dasharray="2 4" opacity=".5"/>'],
 contar:['Conte em voz alta','<path d="M10 14h64a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H36l-12 10v-10H10a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6z"/><text x="42" y="37" text-anchor="middle" class="t">1 e 2 e</text>'],
 devagar:['Devagar e certo primeiro','<path class="af" d="M18 52a24 18 0 0 1 48 0z"/><path d="M28 52l6-12h16l6 12M34 40l8-6 8 6" stroke-width="1.4"/><circle cx="74" cy="46" r="6"/><circle class="f" cx="76" cy="45" r="1.2"/><path d="M66 50l4-2"/><path d="M24 52v6M36 52v6M50 52v6M60 52v6"/><path d="M14 50l-6 2"/>'],
 trecho:['Treine só o pedaço difícil','<path d="M4 22h88M4 28h88M4 34h88M4 40h88M4 46h88" stroke-width="1.1"/><path d="M34 22v24M62 22v24" stroke-width="1.4"/><circle class="f" cx="16" cy="40" r="2.6"/><circle class="f" cx="24" cy="34" r="2.6"/><circle class="f" cx="78" cy="31" r="2.6"/>'+
  '<circle class="af" cx="48" cy="34" r="15"/><circle class="f" cx="44" cy="37" r="2.6"/><circle class="f" cx="52" cy="28" r="2.6"/><path class="a" d="M59 45l12 13" stroke-width="4"/>'],
 misturar:['Misture os exercícios no mesmo dia','<rect x="6" y="18" width="24" height="32" rx="4" transform="rotate(-8 18 34)"/><rect class="af" x="36" y="14" width="24" height="32" rx="4"/><rect x="66" y="18" width="24" height="32" rx="4" transform="rotate(8 78 34)"/>'+
  '<text x="18" y="38" text-anchor="middle" class="t">♪</text><text x="48" y="35" text-anchor="middle" class="t">ABC</text><text x="78" y="38" text-anchor="middle" class="t">♩</text><path class="a" d="M24 60c10 8 38 8 48 0m-4-5 4 5-6 2"/>'],
 diario:['Um pouco todo dia','<rect x="14" y="10" width="68" height="54" rx="6"/><path d="M14 22h68M30 6v8M66 6v8"/><path class="a" d="M22 34l3 3 6-6M42 34l3 3 6-6M62 34l3 3 6-6M22 50l3 3 6-6M42 50l3 3 6-6" stroke-width="2.4"/><rect x="60" y="45" width="12" height="10" rx="2" stroke-dasharray="2 2"/>'],
 guia:['Leia a partir das notas-guia','<path d="M4 20h88M4 28h88M4 36h88M4 44h88M4 52h88" stroke-width="1.1"/><ellipse class="a" cx="30" cy="44" rx="6" ry="4.4" fill="#378ADD"/><text x="30" y="66" text-anchor="middle" class="t a2">Sol</text>'+
  '<ellipse cx="70" cy="36" rx="6" ry="4.4" fill="currentColor"/><path class="a" d="M38 40q6-6 12-4m0 0q6 0 12-4" stroke-dasharray="2 3"/><text x="70" y="66" text-anchor="middle" class="t">Si</text>'],
 pedal:['Calcanhar no chão, mexa só a frente do pé','<path d="M4 64h88"/><path class="a" d="M52 62L86 54" stroke-width="4"/><circle cx="52" cy="62" r="2.5"/><path d="M36 6l2 38M48 6v38"/><path d="M38 44C35 54 37 61 45 61L76 53C81 51 79 46 73 46L48 44"/><circle class="af" cx="43" cy="60" r="5"/>'],
 tensao:['Ombros soltos, punho solto','<circle cx="48" cy="14" r="8"/><path d="M48 22v8M20 40c8-8 20-10 28-10s20 2 28 10M20 40v24M76 40v24"/><path class="a" d="M26 20v10m-4-4 4 4 4-4M70 20v10m-4-4 4 4 4-4"/>'],
 metronomo:['Metrônomo','<path d="M34 64L42 8h12l8 56z"/><path d="M30 64h36"/><path class="a" d="M48 52L62 18" stroke-width="2.4"/><rect class="af" x="54" y="30" width="8" height="6" rx="1" transform="rotate(22 58 33)"/><path d="M40 44h16" stroke-width="1.2"/>'],
 ouvido:['Ouça e ache no piano','<path d="M30 16c12-10 32-4 32 14c0 10-8 12-10 18c-2 6-4 12-12 12c-6 0-8-4-8-8"/><path d="M40 30c0-6 10-8 12-2c1 4-2 6-4 8" stroke-width="1.8"/>'+
  '<text x="76" y="26" text-anchor="middle" class="t a2">♪</text><text x="84" y="44" text-anchor="middle" class="t a2">♫</text><text x="10" y="44" text-anchor="middle" class="t">♩</text>'],
 hoje:['Treinar hoje','<rect x="16" y="12" width="64" height="52" rx="7"/><path d="M16 24h64M32 6v10M64 6v10"/><circle class="af" cx="48" cy="44" r="12"/><path class="a" d="M42 44l4 4 8-9" stroke-width="2.6"/>'],
 continuar:['Continuar de onde parou','<path d="M28 8h40v56L48 50 28 64z"/><path class="af" d="M42 22l14 8-14 8z"/>'],
 jogo:['Jogo das notas','<circle cx="48" cy="36" r="26"/><circle cx="48" cy="36" r="16"/><circle class="af" cx="48" cy="36" r="7"/><path d="M72 8l-18 22" stroke-width="2.4"/><path class="a" d="M68 6l6 2 2 6"/>'],
 musicas:['Minhas músicas','<rect x="22" y="6" width="52" height="60" rx="4"/><path d="M30 18h36M30 23h36M30 28h36M30 33h36M30 38h36M30 48h36M30 53h36" stroke-width="1.1"/><circle class="f" cx="40" cy="31" r="2.6"/><circle class="f" cx="54" cy="26" r="2.6"/><path d="M42.4 31V18M56.4 26V14" stroke-width="1.4"/><circle class="a" cx="64" cy="51" r="2.6" fill="#378ADD"/>'],
 conceitos:['Conceitos','<path d="M48 8c-12 0-20 8-20 19c0 8 6 12 8 18h24c2-6 8-10 8-18C68 16 60 8 48 8z"/><path d="M38 52h20M40 58h16"/><text x="48" y="34" text-anchor="middle" class="t a2">♪</text>'],
 cabo:['Confira o cabo USB','<rect x="4" y="22" width="40" height="14" rx="2"/><path d="M8 36v10M40 36v10"/><path d="M10 26h28" stroke-width="1"/><path class="a" d="M44 30c14 0 10 20 26 20" stroke-width="2.4"/><rect x="70" y="44" width="16" height="12" rx="2"/><path d="M78 56v6M70 62h16"/>'],
 segurar:['Segure a nota contando','<path d="M10 52h76"/><rect class="af" x="30" y="44" width="20" height="8" rx="2"/><path d="M40 10v26c0 4-2 6-2 8"/><text x="66" y="28" text-anchor="middle" class="t a2">1 – 2</text><path class="a" d="M54 36h26" stroke-dasharray="3 3"/>'],
 chegar:['Prepare a mão antes da hora','<path d="M4 56h88" /><path d="M10 56v8M22 56v8M34 56v8M46 56v8M58 56v8M70 56v8M82 56v8" stroke-width="1.2"/><path d="M14 46c4-10 16-10 20 0"/><path class="af" d="M60 46c4-10 16-10 20 0" stroke-dasharray="3 3"/><path class="a" d="M30 26q20-14 38 0m-6-5 6 5-7 3"/>'],
 subir:['Suba o andamento aos poucos','<path d="M14 58a34 34 0 0 1 68 0"/><path d="M20 58h8M68 58h8M48 24v8" stroke-width="1.6"/><path class="a" d="M48 58l16-20" stroke-width="3"/><circle class="f" cx="48" cy="58" r="4"/><path class="a" d="M80 30V14m-5 5 5-5 5 5"/>'],
 dedos:['Os números dos dedos (mão direita)','<rect x="30" y="34" width="38" height="32" rx="12"/><rect x="31" y="14" width="8" height="26" rx="4"/><rect x="41" y="7" width="8" height="31" rx="4"/><rect x="51" y="9" width="8" height="29" rx="4"/><rect x="61" y="17" width="7" height="24" rx="3.5"/><rect x="16" y="36" width="8" height="22" rx="4" transform="rotate(-38 20 47)"/>'+
  '<text x="12" y="34" class="t a2" text-anchor="middle">1</text><text x="35" y="10" class="t a2" text-anchor="middle">2</text><text x="45" y="4" class="t a2" text-anchor="middle">3</text><text x="55" y="6" class="t a2" text-anchor="middle">4</text><text x="66" y="13" class="t a2" text-anchor="middle">5</text>']};
function ilu(n,cls){var d=ILU[n];if(!d)return '';return '<svg class="ilu'+(cls?' ilu-'+cls:'')+'" viewBox="0 0 96 72" role="img" aria-label="'+d[0]+'"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+d[1]+'</g></svg>'}
/* ---------- facilidades (Ajustes → Facilidades; todas dá para ligar e desligar) ----------
   tela inicial simples, ler o resultado em voz alta, comandos pelas teclas mais graves do piano, avisos com dicas,
   passo a passo para quem começa e tamanho da letra. Opção nova entra com o padrão que mantém o app como estava */
var TESTE=/[?&]teste\b/.test(location.search);
/* voz: só com "Ler o resultado em voz alta" ligado; usa a voz em português do Mac */
function falar(t){if(!OPT.voz||!window.speechSynthesis||ENSAIO)return;try{var x=String(t).replace(/<[^>]+>/g,'').replace(/♯/g,' sustenido').replace(/♭/g,' bemol').replace(/([A-Za-zÀ-ú])(\d)/g,'$1 $2').replace(/%/g,' por cento'),
 u=new SpeechSynthesisUtterance(x),v=speechSynthesis.getVoices().filter(function(z){return /pt[-_]BR/i.test(z.lang)})[0];u.lang='pt-BR';if(v)u.voice=v;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
/* comandos pelo piano: Lá0 = Começar/Parar, Si0 = Recomeçar, Dó1 = preparar o treino sugerido, Ré1 = próxima etapa da rotina */
function cmdPiano(m){if(!OPT.pcmd||[21,23,24,26].indexOf(m)<0)return false;var g=document.getElementById('jgGo');
 if(m===21){if(JG.vis&&g&&!run)g.click();else document.getElementById('go').click()}
 else if(m===23){if(run)document.getElementById('reset').click();else{resetAll();document.getElementById('go').click()}}
 else if(m===24){var b=document.querySelector('#res .foco button');if(b&&!run)b.click()}
 else if(m===26&&!run)proximaEtapa();return true}
/* rotina guiada: a próxima etapa que falta hoje */
function proxEtapa(){var d=day(),r=routine();for(var i=0;i<r.length;i++){var s=r[i],ok=s.test?(d.test!=null):!!d.done[s.id];if(!ok)return s}return null}
function proximaEtapa(){var s=proxEtapa();if(!s){show('<span class="lb">A rotina de hoje está completa. Muito bem!</span>',true);falar('A rotina de hoje está completa.');return}
 if(s.jogo){jAbrir();return}if(s.test){MODE='time';paint()}JG.vis=false;load_ex(byId(s.id));var p=document.getElementById('practice');if(p)p.scrollIntoView({block:'start',behavior:'smooth'});show('<span class="lb">Etapa da rotina: '+s.t+'. Aperte "Começar".</span>',true)}
/* revisão espaçada: a música/exercício do livro que está há mais tempo sem tocar, pelo quanto você já sabia
   (90%+ = revisar a cada 7 dias; 75%+ = 3 dias; menos = todo dia) */
function revisao(){var hoje=dkey(),last={},best={};Object.keys(H.days).forEach(function(k){Object.keys(H.days[k].done||{}).forEach(function(id){var b=id.replace(/_(d|e)$/,''),e=byId(b);
  if(!e||(e.g!=='livro'&&e.g!=='mus')||oculta(b)||!livroVisivel(e))return;if(!last[b]||k>last[b])last[b]=k;best[b]=Math.max(best[b]||0,H.days[k].done[id].best||0)})});
 var c=null;Object.keys(last).forEach(function(id){if(last[id]===hoje)return;var dias=Math.round((new Date(hoje)-new Date(last[id]))/864e5),iv=best[id]>=90?7:best[id]>=75?3:1,r=dias/iv;if(r>=1&&(!c||r>c.r))c={id:id,dias:dias,r:r}});return c}
/* ritmo novo a cada vez: compassos de 4 tempos sorteados com as figuras do nível; toca em qualquer tecla */
var RITN={r1:{t:'Semínimas e mínimas',g:[[1],[1],[2]]},r2:{t:'Com mínima pontuada e semibreve',g:[[1],[1],[2],[3],[4]]},r3:{t:'Com colcheias',g:[[1],[1],[2],[.5,.5],[.5,.5]]},r4:{t:'Tudo: colcheias e semínima pontuada',g:[[1],[2],[3],[.5,.5],[1.5,.5]]}};
function ritmoNovo(k){var L=RITN[k];if(!L)return;var rows=[];for(var m=0;m<6;m++){var b=0,me=[];while(b<4){var op=L.g.filter(function(o){var s=o.reduce(function(a,x){return a+x},0);return s<=4-b}),o=op[Math.floor(Math.random()*op.length)];me=me.concat(o);b+=o.reduce(function(a,x){return a+x},0)}rows.push(me)}
 rows.push(k==='r1'||k==='r3'?[2,2]:[4]);
 var ex={id:'ritmo_'+k,g:'ritmo',title:'Ritmo novo · '+L.t,src:'Ritmo (sequência nova a cada vez)',bpm:60,beats:4,key:0,ms:rhythm(rows),
  desc:'Leia o ritmo e toque em qualquer tecla, com o dedo 3. Conte em voz alta ("1 e 2 e"). Cada vez que abrir, vem um ritmo novo.'};
 MODE='time';paint();JG.vis=false;load_ex(ex);var p=document.getElementById('practice');if(p)p.scrollIntoView({block:'start',behavior:'smooth'})}
function ritmoHtml(){return '<h2>Ritmo novo a cada vez</h2><div class="lb" style="margin-bottom:8px">O app sorteia um ritmo: você lê as figuras e toca em qualquer tecla, junto com o clique.</div><div class="list" style="margin-bottom:16px">'+
 Object.keys(RITN).map(function(k){var d=day().done['ritmo_'+k];return '<div class="ex"><div class="ex-h">'+ilu('metronomo','card')+'<b>'+RITN[k].t+'</b></div>'+(d?'<span class="badge">hoje: '+d.best+'% ('+d.n+'x)</span>':'<span class="badge no">ainda não hoje</span>')+'<button data-ritmo="'+k+'">Abrir um ritmo novo</button></div>'}).join('')+'</div><h2>Exercícios de ritmo</h2>'}
/* tela inicial simples */
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
function inicioHtml(){var s=proxEtapa(),us=ultimaSessao(),h='';
 if(PERFIS.length>1)h+='<div class="ini-perf" role="group" aria-label="Quem vai tocar">'+PERFIS.map(function(p){return '<button class="tg'+(p.id===PERFIL?' on':'')+'" data-perf="'+p.id+'">'+esc(p.nome)+'</button>'}).join('')+'</div>';
 h+='<div class="ini-grid"><button class="ini-b ini-p" data-ini="prox">'+ilu('hoje','ini')+'<b>Treinar hoje</b><span>'+(s?'Próxima etapa: '+tDesc(s.t):'Rotina de hoje completa!')+'</span></button>'+
  (us?'<button class="ini-b" data-ini="retoma">'+ilu('continuar','ini')+'<b>Continuar de onde parei</b><span>'+esc(tDesc(us.e.ti))+'</span></button>':'')+
  '<button class="ini-b" data-ini="jogo">'+ilu('jogo','ini')+'<b>Jogo das notas</b><span>ler as notas na pauta</span></button><button class="ini-b" data-ini="mus">'+ilu('musicas','ini')+'<b>Minhas músicas</b><span>escolher uma música</span></button>'+
  '<button class="ini-b" data-ini="conc">'+ilu('conceitos','ini')+'<b>Conceitos</b><span>o que o livro já ensinou</span></button></div>';return h}
function abaIr(t){TAB=t;var f=document.getElementById('f_ex');if(f)f.open=true;JG.vis=t==='leit';showPanel();saveAtual();if(f)f.scrollIntoView({block:'start',behavior:'smooth'})}
function aplicaFacil(){var b=document.body;if(!b)return;b.classList.toggle('simples',!!OPT.simples);var z=+OPT.letra||1;b.style.zoom=z===1?'':String(z);
 document.querySelectorAll('.letra').forEach(function(x){x.classList.toggle('on',+x.dataset.v===z)});
 var ini=document.getElementById('inicio'),mostra=OPT.simples||OPT.ini!==false;if(!ini)return;ini.style.display=mostra?'':'none';if(!mostra)return;var h=inicioHtml();if(ini.dataset.h===h)return;ini.dataset.h=h;ini.innerHTML=h;
 ini.querySelectorAll('[data-perf]').forEach(function(x){x.onclick=function(){usarPerfil(x.dataset.perf)}});
 ini.querySelectorAll('[data-ini]').forEach(function(x){x.onclick=function(){var a=x.dataset.ini;if(a==='prox')proximaEtapa();else if(a==='retoma'){var u=ultimaSessao();if(u)retomar(u.k)}else if(a==='jogo')jAbrir();else if(a==='mus')abaIr('mus');else if(a==='conc')abaIr('conc')}})}
/* avisos com dicas: dizem o que fazer, não só o que deu errado */
function avisar(h){var a=document.getElementById('aviso');if(!a)return;if(!h||OPT.avisos===false){a.style.display='none';return}a.innerHTML=ilu('cabo','pequena')+'<span>'+h+'</span><button aria-label="Fechar aviso">✕</button>';a.style.display='';a.querySelector('button').onclick=function(){a.style.display='none'}}
/* passo a passo com setas (na primeira vez de quem começa, ou em Ajustes → "Ver o passo a passo agora") */
var TUT=[['#connect','Ligue o piano e aperte aqui. Fica verde quando o app ouve o piano.','f_con'],
 ['#tabs','Aqui você escolhe o que treinar: a rotina de Hoje, o Livro, o Jogo das notas (em "Ler notas"), os Conceitos e as Músicas.','f_ex'],
 ['#go','Começar e Parar. Antes de começar, o app conta "1, 2, 3, 4".'],
 ['.toolbar .segc','"Com tempo" toca com metrônomo. "Espera" espera você achar cada nota, sem pressa.'],
 ['#cd','Aqui aparecem a contagem e os avisos. No fim, embaixo da partitura, vem o resultado: o que treinar na próxima vez, com um botão que já prepara o treino.'],
 ['#ajBtn','Em Ajustes ficam o som, os cliques e as Facilidades: letra maior, voz, tela simples, comandos pelo piano e este passo a passo (dá para desligar).']];
function tutorial(i){i=i||0;var o=document.getElementById('tutO');if(o)o.remove();document.querySelectorAll('.tut-alvo').forEach(function(e){e.classList.remove('tut-alvo')});
 if(i>=TUT.length){try{localStorage.setItem('piano_tutvisto','1')}catch(e){}return}
 var st=TUT[i];if(st[2]){var f=document.getElementById(st[2]);if(f)f.open=true}var e=document.querySelector(st[0]);if(!e||!e.offsetParent){tutorial(i+1);return}
 e.scrollIntoView({block:'center'});e.classList.add('tut-alvo');var r=e.getBoundingClientRect(),d=document.createElement('div');d.id='tutO';d.className='tut';var baixo=r.top<window.innerHeight/2;
 d.innerHTML='<div class="tut-box '+(baixo?'baixo':'cima')+'" role="dialog" aria-label="Passo a passo"><span class="tut-seta" aria-hidden="true"></span><b>Passo '+(i+1)+' de '+TUT.length+'</b><p>'+st[1]+'</p><div class="row"><button class="primary" id="tutP">'+(i<TUT.length-1?'Próximo':'Entendi')+'</button><button id="tutF">Fechar</button></div></div>';
 document.body.appendChild(d);var b=d.firstChild,bw=Math.min(360,window.innerWidth-32),left=Math.max(16,Math.min(window.innerWidth-bw-16,r.left+r.width/2-bw/2));b.style.width=bw+'px';b.style.left=left+'px';
 b.style.top=(baixo?r.bottom+14:Math.max(16,r.top-14-b.offsetHeight))+'px';b.querySelector('.tut-seta').style.left=Math.max(14,Math.min(bw-26,r.left+r.width/2-left-6))+'px';
 document.getElementById('tutP').onclick=function(){tutorial(i+1)};document.getElementById('tutF').onclick=function(){tutorial(TUT.length)};document.getElementById('tutP').focus()}
/* conceitos para o iPhone: montados aqui (com os desenhos) só quando o iPhone pede */
var CONC_REQ=0,CONC_CACHE=null;
function concCel(){if(!CONC_REQ||Date.now()-CONC_REQ>15000)return null;if(CONC_CACHE&&CONC_CACHE[0]===CONC_REQ)return CONC_CACHE[1];var d=document.createElement('div');d.innerHTML=concHtml();concMontar(d);
 var ps=d.querySelector('#pagSel');if(ps){var row=ps.parentNode,nx=row.nextElementSibling;if(nx)nx.remove();row.outerHTML='<p class="lb">Página do livro: p. '+(PAGLIV&&PAGLIV.p)+'</p>'}
 CONC_CACHE=[CONC_REQ,d.innerHTML];return CONC_CACHE[1]}
/* tela inicial e rotina para o iPhone */
function celInicio(){var d=day(),us=ultimaSessao(),s=proxEtapa();return {tr:seguro(trCel),prox:s?tDesc(s.t):null,volta:us?{k:us.k,t:tDesc(us.e.ti)+(us.e.mao?' (só a mão '+(us.e.mao==='d'?'direita':'esquerda')+')':'')+', '+us.e.pct+'%. Ficou para treinar: '+us.e.foco+'.'}:null,
 rot:routine().map(function(x){var ok=x.test?(d.test!=null):!!d.done[x.id];return [tDesc(x.t),ok?1:0,x.jogo?'jogo':x.id,x.test?1:0]})}}
/* para a tela do iPhone: se algo ainda não existe (começo do app), manda vazio em vez de travar */
function seguro(f){try{return f()}catch(e){return null}}
/* tema: Automático (segue o Mac), Claro ou Escuro; fica guardado neste navegador */
function temaAplica(){var t='auto';try{t=localStorage.getItem('tema_app')||'auto'}catch(e){}if(t==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',t);
 var b=document.getElementById('temaBtn');if(b){b.innerHTML=(t==='dark'?'☾':t==='light'?'☀':'◐')+'<span> '+(t==='dark'?'Escuro':t==='light'?'Claro':'Automático')+'</span>';b.setAttribute('aria-label','Tema: '+(t==='dark'?'escuro':t==='light'?'claro':'automático, igual ao Mac'))}}
function temaTroca(){var t='auto';try{t=localStorage.getItem('tema_app')||'auto'}catch(e){}t=t==='auto'?'light':t==='light'?'dark':'auto';try{localStorage.setItem('tema_app',t)}catch(e){}temaAplica();render();if(TAB==='leit'||TAB==='conc')showPanel();if(window.CEL_SOON)CEL_SOON()}
function abrirEtapa(id,test){if(run)return;if(id==='jogo'){jAbrir();return}var e=byId(id);if(!e)return;if(test){MODE='time';paint()}JG.vis=false;load_ex(e)}
temaAplica();(function(){var b=document.getElementById('temaBtn');if(b)b.onclick=temaTroca})();
/* ícones nas abas e nas áreas da tela (o texto continua ao lado) */
var ICONES={hoje:'hoje',aq:'dedos',livro:'livro',ritmo:'metronomo',leit:'jogo',conc:'conceitos',mus:'musicas',hist:'historico',rep:'continuar'};
document.querySelectorAll('#tabs .tab').forEach(function(b){var k=ICONES[b.dataset.t];if(k&&!b.querySelector('.ilu'))b.insertAdjacentHTML('afterbegin',ilu(k,'tab'))});
[['f_con','teclado'],['f_ex','livro']].forEach(function(p){var s=document.querySelector('#'+p[0]+'>summary');if(s&&!s.querySelector('.ilu'))s.insertAdjacentHTML('afterbegin',ilu(p[1],'sec'))});
document.querySelectorAll('#ajDlg .aj h3').forEach(function(h){var k={'Como praticar':'dedos','Facilidades':'facil','O que aparece na tela':'tela','Som guia (a música)':'ouvido','Metrônomo (cliques)':'metronomo'}[h.textContent.trim()];if(k&&!h.querySelector('.ilu'))h.insertAdjacentHTML('afterbegin',ilu(k,'aj'))});
function exIcone(e){return e.g==='livro'?'livro':e.g==='aq'?'dedos':e.g==='ritmo'?'metronomo':e.g==='leit'?'guia':'musicas'}
/* paint() também aplica as facilidades (tela simples, letra) */
var _paintBase=paint;paint=function(){_paintBase();aplicaFacil()};
document.querySelectorAll('.letra').forEach(function(b){b.onclick=function(){OPT.letra=+b.dataset.v||1;saveSet();aplicaFacil()}});
(function(){var b=document.getElementById('tutVer');if(b)b.onclick=function(){var d=document.getElementById('ajDlg');if(d&&d.close)d.close();tutorial(0)}})();
/* ---------- backup do progresso ----------
   Guarda todas as chaves do app (todos os perfis: histórico, recordes, ajustes, músicas importadas, jogo, tentativas).
   Salva na pasta do app (backups/) e uma cópia no iCloud Drive (pasta "Treino de Piano"); automático uma vez por dia.
   Restaurar troca tudo pelo backup escolhido, mas antes salva o estado atual (dá para voltar). */
function bkDados(){var d={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^piano_/.test(k)||k==='tema_app')d[k]=localStorage[k]}
 return {app:'treino-piano',versao:1,criado:new Date().toISOString(),perfis:PERFIS.map(function(p){return p.nome}),dados:d}}
/* ---------- replays: cada tentativa guardada no Mac (pasta replays/, com cópia no iCloud) ----------
   Guarda as teclas tocadas (nota, força, hora), o pedal, a nota da tentativa e o resultado completo daquela vez.
   Pesa uns 7 KB por minuto de teclas, mais o resultado. Ouvir, cortar o começo e o fim (sem apagar nada), renomear,
   ★ guardar sempre, apagar (lixeira por 30 dias) e compartilhar (áudio .wav ou MIDI). O celular usa a mesma lista. */
var REPS=null,REPABERTO=null,REPDADOS={},REPCONF=null,REPNOME=false,REPFIM=null;
function repPode(){return /^https?:/.test(location.protocol)&&!/[?&](teste|ensaio)\b/.test(location.search)&&(!CEREBRO||COMMAC)}
/* cor de cada tecla tocada: a do evento da partitura em que ela entrou (o = certa, w = quase, b = errada, x = a mais) */
function repCores(){var fila=EV.map(function(e){return {st:e.st,falta:(e.midis||[]).slice()}}),i0=0,out=[];
 REC.forEach(function(r){if(!r[3])return;var achou=null;for(var i=i0;i<fila.length&&i<i0+8;i++){var k=fila[i].falta.indexOf(r[0]);if(k>=0){fila[i].falta.splice(k,1);achou=fila[i];break}}
  while(i0<fila.length&&!fila[i0].falta.length)i0++;
  out.push(!achou?'x':achou.st==='ok'?'o':achou.st==='warn'?'w':'b')});return out}
/* no fim de cada música: a estatística vai sempre para a evolução (/api/tentativas, sem as teclas);
   o replay (teclas, pedal e som) só fica guardado quando você aperta "Salvar replay" no resultado */
var REPPEND=null,TENT=null;
var REPSALIC='<svg viewBox="0 0 24 24" aria-hidden="true" class="rep-salic"><path d="M6 3h9l3 3v15H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 3v5h6V3M9 21v-6h6v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
function repPrepara(c,pct,som){REPPEND=null;if(!repPode()||!CUR)return;var ons=REC.filter(function(r){return r[3]});if(!ons.length)return;
 var t0=REC[0][2],cores=repCores(),k=0,notas=REC.map(function(r){var x=[r[0],Math.round(r[1]),Math.round(r[2]-t0),r[3]?1:0];if(r[3])x.push(cores[k++]||'o');return x});
 var ped=RECP.map(function(p){return [Math.max(0,Math.round(p[0]-t0)),p[1]?1:0]}),src=CUR.base||CUR,fimMs=notas[notas.length-1][2];
 var meta={id:Date.now(),ex:src.id,titulo:tDesc(src.title)+(CUR.mmap&&CUR.title!==src.title?' · '+tDesc(CUR.title).split(' · ').slice(-1)[0]:''),perfil:PERFIL,t:Date.now(),pct:pct,
  ok:c.ok||0,quase:c.warn||0,erradas:c.bad||0,faltaram:c.miss||0,modo:MODE,bpm:+document.getElementById('bpm').value,mao:MAO||'ambas',dur:fimMs+1200,n:ons.length,ini:0,fim:0,est:false,nome:''};
 var est={};['id','ex','titulo','perfil','t','pct','ok','quase','erradas','faltaram','modo','bpm','mao','n'].forEach(function(x){est[x]=meta[x]});
 fetch('/api/tentativas',{method:'POST',body:JSON.stringify(est)}).then(function(r){if(r.ok){TENT=null;if(TAB==='rep')repMostrar()}}).catch(function(){});
 REPPEND={meta:meta,dados:{notas:notas,ped:ped},som:som,t0:t0};repBotao()}
/* botão no resultado (o celular recebe o mesmo resultado e o mesmo botão) */
function repBotao(salvo){var t=document.querySelector('#res .fbtop');if(!t)return;var b=t.querySelector('.rep-sal');if(!b){b=document.createElement('button');t.appendChild(b)}
 b.className='rep-sal'+(salvo===true?' ok':'');
 if(salvo===true){b.removeAttribute('data-act');b.disabled=true;b.innerHTML=REPSALIC+'Replay salvo'}
 else if(salvo){b.removeAttribute('data-act');b.disabled=true;b.innerHTML=REPSALIC+'Salvando…'}
 else{b.setAttribute('data-act','repsalvar');b.disabled=false;b.innerHTML=REPSALIC+'Salvar replay'}
 if(window.CEL_SOON)CEL_SOON()}
function repSalvarAgora(){var p=REPPEND;if(!p)return;REPPEND=null;var r=document.getElementById('res');
 p.dados.res=r?r.innerHTML.replace(/<button class="rep-sal[\s\S]*?<\/button>/,''):'';repBotao('…');
 (p.som||Promise.resolve(null)).then(function(s){return s&&s.iph?pgBaixaIph(s.k):s}).then(function(s){if(s){p.meta.som=1;p.meta.somOff=Math.round(p.t0-s.p0)}
  return fetch('/api/replays',{method:'POST',body:JSON.stringify(p.meta)+'\n'+JSON.stringify(p.dados)}).then(function(x){if(!x.ok)throw 0;
   return s?fetch('/api/replays?id='+p.meta.id+'&acao=som',{method:'POST',body:s.blob}).then(function(y){if(!y.ok)throw 0}):null})
  .then(function(){REPS=null;repBotao(true);show(s?'Replay salvo, com o som do seu piano.':'Replay salvo. Ele fica na aba Replays.',true);if(TAB==='rep')repMostrar();
   reg('replay salvo: '+p.meta.titulo+' · '+p.meta.pct+'% · '+p.meta.n+' teclas'+(s?' · som do piano '+Math.round(s.blob.size/1024)+' KB':' · sem som gravado'))})})
  .catch(function(){REPPEND=p;repBotao();show('Não consegui salvar o replay. Tente de novo.',true)})}
function tentCarregar(){return fetch('/api/tentativas',{cache:'no-store'}).then(function(r){return r.ok?r.json():[]}).catch(function(){return []}).then(function(l){
 TENT=l.filter(function(m){return (m.perfil||'p0')===PERFIL}).sort(function(a,b){return b.t-a.t});return TENT})}
function repCarregar(){return fetch('/api/replays',{cache:'no-store'}).then(function(r){return r.json()}).then(function(l){
 REPS=l.filter(function(m){return (m.perfil||'p0')===PERFIL}).sort(function(a,b){return b.t-a.t});return REPS})}
function repDados(id){return REPDADOS[id]?Promise.resolve(REPDADOS[id]):fetch('/api/replays?id='+id,{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){REPDADOS[id]=j;return j})}
function repQuando(t){var d=new Date(t),h=new Date(),hm=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),o=new Date(h);o.setDate(h.getDate()-1);
 return d.toDateString()===h.toDateString()?'hoje '+hm:d.toDateString()===o.toDateString()?'ontem '+hm:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' '+hm}
function repDur(ms){var s=Math.round(ms/1000);return Math.floor(s/60)+':'+('0'+s%60).slice(-2)}
function repNome(m){return m.nome||m.titulo}
function repMao(m){return m.mao==='d'?'mão direita':m.mao==='e'?'mão esquerda':'as duas mãos'}
/* linha da evolução: a nota de cada tentativa, da mais antiga à mais nova */
function repLinha(l,w,h,cls){var p=l.slice().reverse().slice(-30).map(function(m){return m.pct});if(p.length<2)return '';
 var pts=p.map(function(v,i){return (i*w/(p.length-1)).toFixed(1)+','+(h-3-v/100*(h-6)).toFixed(1)}).join(' '),u=pts.split(' ').pop().split(',');
 return '<svg class="'+cls+'" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" aria-hidden="true"><polyline points="'+pts+'" fill="none" stroke="#378ADD" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx="'+u[0]+'" cy="'+u[1]+'" r="3.5" fill="#378ADD"/></svg>'}
/* lista: cada música com a evolução (todas as tentativas, mesmo sem replay salvo) e, embaixo, os replays salvos dela */
function repGrupo(m){return m.titulo+'|'+(m.mao||'')+'|'+(m.modo==='wait'?'w':m.bpm)}
function repLista(l,t){t=t||[];if(!l.length&&!t.length)return '<div class="rep-vazio"><b>Ainda não há tentativas.</b><span class="lb">Termine uma música: a nota de cada vez aparece aqui, para ver o quanto você está melhorando. Para guardar o som, aperte "Salvar replay" no resultado.</span></div>';
 var gs={},rs={},ord=[];t.forEach(function(m){if(!gs[repGrupo(m)]){gs[repGrupo(m)]=[];ord.push(repGrupo(m))}gs[repGrupo(m)].push(m)});
 l.forEach(function(m){if(!rs[repGrupo(m)])rs[repGrupo(m)]=[];rs[repGrupo(m)].push(m);if(!gs[repGrupo(m)]){gs[repGrupo(m)]=[];ord.push(repGrupo(m))}if(!t.some(function(x){return x.id===m.id}))gs[repGrupo(m)].push(m)});
 ord.sort(function(a,b){return gs[b][0].t-gs[a][0].t});
 return '<div class="rep-lista">'+ord.map(function(ex){var g=gs[ex].sort(function(a,b){return b.t-a.t}),ult=g[0],pri=g[g.length-1],dif=ult.pct-pri.pct,best=Math.max.apply(null,g.map(function(m){return m.pct})),r=rs[ex]||[];
  return '<div class="rep-ex"><div class="rep-exh"><div><b>'+esc(ult.titulo)+'</b><span class="lb">'+g.length+(g.length>1?' tentativas':' tentativa')+' · última '+repQuando(ult.t)+' · recorde '+best+'% · '+repMao(ult)+(ult.modo==='time'?', '+ult.bpm+' BPM':', Espera')+'</span></div>'+
   '<div class="rep-ev">'+repLinha(g,100,30,'rep-spark')+'<span class="rep-pct">'+ult.pct+'%</span>'+(g.length>1?'<span class="rep-dif'+(dif<0?' neg':'')+'" title="Desde a primeira tentativa">'+(dif>=0?'+':'')+dif+'</span>':'')+'</div></div>'+
   (r.length?'<div class="rep-tries">'+r.map(function(m){return '<button data-rep="'+m.id+'">'+(m.est?'★ ':'')+'<b>'+m.pct+'%</b> '+(m.nome?esc(m.nome)+' · ':'')+repQuando(m.t)+'</button>'}).join('')+'</div>':'')+'</div>'}).join('')+'</div>'}
/* rolo de piano: cada tecla como um traço na cor da correção; o que está fora do corte fica apagado */
function repRolo(d,m){var ns=d.notas,ons=[],abre={};ns.forEach(function(r){if(r[3]){abre[r[0]]=r}else if(abre[r[0]]){var a=abre[r[0]];ons.push([a[0],a[2],r[2],a[4]]);delete abre[r[0]]}});
 Object.keys(abre).forEach(function(k){var a=abre[k];ons.push([a[0],a[2],a[2]+400,a[4]])});if(!ons.length)return '';
 var lo=Math.min.apply(null,ons.map(function(o){return o[0]}))-2,hi=Math.max.apply(null,ons.map(function(o){return o[0]}))+2,W=1000,H=180,dur=m.dur||1,sx=W/dur,sy=H/(hi-lo+1);
 var cor={o:'#C0DD97',w:'#FAC775',b:'#F7C1C1',x:'#F7C1C1'},h='<svg class="rep-rolo" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="Teclas tocadas, na cor da correção">';
 ons.forEach(function(o){h+='<rect x="'+(o[1]*sx).toFixed(1)+'" y="'+((hi-o[0])*sy).toFixed(1)+'" width="'+Math.max(3,(o[2]-o[1])*sx).toFixed(1)+'" height="'+Math.max(3,sy-1).toFixed(1)+'" rx="2" fill="'+(cor[o[3]]||cor.o)+'"/>'});
 var ini=m.ini||0,fim=m.fim||dur;h+='<rect id="repFora1" x="0" y="0" width="'+(ini*sx).toFixed(1)+'" height="'+H+'" class="rep-fora"/><rect id="repFora2" x="'+(fim*sx).toFixed(1)+'" y="0" width="'+((dur-fim)*sx).toFixed(1)+'" height="'+H+'" class="rep-fora"/>';
 return h+'</svg>'}
/* o resultado daquela vez, sem os botões (que começariam um treino) */
function repRes(h){return String(h||'').replace(/<div class="fbtop">[\s\S]*?<\/div>/,'').replace(/ data-act="[^"]*"/g,' disabled')}
function repDetalhe(m,d){var dur=m.dur||1,ini=m.ini||0,fim=m.fim||dur;
 var cab=REPNOME?'<div class="rep-renome"><input id="repNomeIn" value="'+esc(repNome(m)).replace(/"/g,'&quot;')+'" maxlength="80" aria-label="Nome do replay"><button data-repacao="nomeok" class="rep-go">Guardar nome</button><button data-repacao="nomeno">Cancelar</button></div>':'<h2>'+esc(repNome(m))+'</h2>';
 var c=[[m.ok,'#C0DD97','certas'],[m.quase,'#FAC775','quase'],[m.erradas,'#F7C1C1','erradas'],[m.faltaram,'#D3D1C7','faltaram']].filter(function(x){return x[0]});
 return '<div class="rep-det"><div class="rep-top"><button data-repacao="volta">‹ Replays</button><button data-repacao="estrela" class="'+(m.est?'on':'')+'">'+(m.est?'★ Guardado sempre':'☆ Guardar sempre')+'</button></div>'+cab+
  '<span class="lb">'+(m.som?'<b>Som do seu piano</b> · ':'')+esc(m.titulo)+' · '+repQuando(m.t)+' · '+repDur(fim-ini)+' · '+repMao(m)+' · '+(m.modo==='time'?m.bpm+' BPM, com tempo':'modo Espera')+'</span>'+
  '<div class="rep-nota"><span class="rep-pct">'+m.pct+'%</span><div class="rep-bar">'+c.map(function(x){return '<span style="flex:'+x[0]+';background:'+x[1]+'"></span>'}).join('')+'</div><span class="lb">'+c.map(function(x){return x[0]+' '+x[2]}).join(' · ')+'</span></div>'+
  (d?repRolo(d.dados,m):'<p class="lb">Carregando as teclas…</p>')+
  '<div class="rep-corte"><label>Começo <input type="range" id="repIni" min="0" max="'+dur+'" step="100" value="'+ini+'"></label><label>Fim <input type="range" id="repFim" min="0" max="'+dur+'" step="100" value="'+fim+'"></label><span class="lb" id="repCorteT">'+repDur(ini)+' a '+repDur(fim)+'</span><button data-repacao="corte">Guardar corte</button></div>'+
  '<div class="rep-acoes"><button data-repacao="ouvir" class="rep-go" id="repOuvirB">'+(RECPLAY?'■ Parar':'▶ Ouvir')+'</button><button data-repacao="nome">Renomear</button><button data-repacao="wav">Compartilhar áudio</button><button data-repacao="midi">Baixar MIDI</button>'+
  (REPCONF===m.id?'<span class="rep-conf">Apagar este replay? Ele fica 30 dias na lixeira. <button data-repacao="apagasim" class="rep-del">Apagar</button><button data-repacao="apagano">Não</button></span>':'<button data-repacao="apagar" class="rep-del">Apagar</button>')+'</div>'+
  (d&&d.dados.res?'<details class="rep-fb"><summary>Ver o resultado desta vez</summary><div class="rep-fbin">'+repRes(d.dados.res)+'</div></details>':'')+'</div>'}
function repMostrar(){var b=document.getElementById('repBox');if(!b)return;
 if(!repPode()){b.innerHTML='<p class="lb">Os replays aparecem no app aberto pelo Mac (endereço localhost:8000).</p>';return}
 Promise.all([REPS?Promise.resolve(REPS):repCarregar(),TENT?Promise.resolve(TENT):tentCarregar()]).then(function(x){var l=x[0],b=document.getElementById('repBox');if(!b)return;
  if(REPABERTO){var m=l.filter(function(x){return x.id===REPABERTO})[0];if(!m){REPABERTO=null;return repMostrar()}
   b.innerHTML=repDetalhe(m,REPDADOS[m.id]);if(!REPDADOS[m.id])repDados(m.id).then(function(){if(REPABERTO===m.id)repMostrar()}).catch(function(){});
   var a=document.getElementById('repIni'),z=document.getElementById('repFim');if(a&&z){var mv=function(){var i=+a.value,f=+z.value;if(i>f-500){if(this===a)a.value=i=Math.max(0,f-500);else z.value=f=i+500}
    var W=1000/(m.dur||1),r1=document.getElementById('repFora1'),r2=document.getElementById('repFora2');if(r1)r1.setAttribute('width',(i*W).toFixed(1));if(r2){r2.setAttribute('x',(f*W).toFixed(1));r2.setAttribute('width',((m.dur-f)*W).toFixed(1))}
    document.getElementById('repCorteT').textContent=repDur(i)+' a '+repDur(f)};a.oninput=mv;z.oninput=mv}
   var ni=document.getElementById('repNomeIn');if(ni){ni.focus();ni.select()}return}
  b.innerHTML='<h2>Evolução e replays de '+esc(perfilNome())+'</h2><span class="lb">A nota de cada tentativa fica guardada sempre. O som só fica quando você aperta "Salvar replay" no resultado.</span>'+repLista(l,TENT)+'<details class="rep-lix" id="repLixD"'+(REPLIXA?' open':'')+'><summary>Lixeira (apagados nos últimos 30 dias)</summary><div id="repLix"><p class="lb">Carregando…</p></div></details>';if(REPLIXA)repLix()}).catch(function(){b.innerHTML='<p class="lb">Não consegui ler os replays do Mac.</p>'})}
/* lixeira: o que foi apagado fica 30 dias e dá para recuperar */
var REPLIXA=false;
function repLix(){var d=document.getElementById('repLix');if(!d)return;fetch('/api/replays?lixeira=1',{cache:'no-store'}).then(function(r){return r.json()}).then(function(l){
 l=l.filter(function(m){return (m.perfil||'p0')===PERFIL}).sort(function(a,b){return b.t-a.t});
 d.innerHTML=l.length?'<div class="rep-tries">'+l.map(function(m){return '<button data-replix="'+m.id+'"><b>'+m.pct+'%</b> '+esc(m.nome||m.titulo)+' · '+repQuando(m.t)+' · Recuperar</button>'}).join('')+'</div>':'<p class="lb">A lixeira está vazia.</p>'}).catch(function(){d.innerHTML='<p class="lb">Não consegui ler a lixeira.</p>'})}
document.addEventListener('toggle',function(e){if(e.target&&e.target.id==='repLixD'){REPLIXA=e.target.open;if(REPLIXA)repLix()}},true);
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-replix]');if(!b)return;var id=+b.dataset.replix;
 fetch('/api/replays?id='+id+'&acao=recuperar',{method:'POST'}).then(function(){REPS=null;reg('replay recuperado da lixeira: '+id);repMostrar()})});
function repMetaSalva(m){return fetch('/api/replays?id='+m.id+'&acao=meta',{method:'POST',body:JSON.stringify(m)}).then(function(){REPS=null;repMostrar()})}
/* tocar um replay: as mesmas regras do "Ouvir o que eu toquei" (pedal segura, a mesma tecla de novo corta), só o trecho do corte */
function repTocar(id){if(RECPLAY){stopSched();RECPLAY=false;clearTimeout(REPFIM);paintOuvir();repMostrar();return Promise.resolve()}
 var m=(REPS||[]).filter(function(x){return x.id===id})[0];return repDados(id).then(function(j){m=m||j.meta;if(m.som&&!viaPiano())return repOuvirReal(m).catch(function(e){reg('ERRO som do replay: '+(e.message||e))});var d=j.dados,ini=m.ini||0,fim=m.fim||m.dur,ns=d.notas,ped=d.ped||[];
  var ons=ns.filter(function(r){return r[3]&&r[2]>=ini&&r[2]<=fim});if(!ons.length)return;
  function solta(t){var dn=false,i;for(i=0;i<ped.length&&ped[i][0]<=t;i++)dn=!!ped[i][1];if(!dn)return t;for(;i<ped.length;i++)if(!ped[i][1])return ped[i][0];return t+3000}
  RECPLAY=true;paintOuvir();pianoVols();if(TAB==='rep')repMostrar();reg('ouvir replay: '+repNome(m)+' · '+ons.length+' teclas, sai por '+(viaPiano()?(MOUT.remoto?'piano pelo iPhone':'piano'):'Mac'));
  return Promise.race([Promise.all(ons.map(function(r){return load(r[0])})),new Promise(function(x){setTimeout(x,1500)})]).then(function(){if(!RECPLAY)return;var c=ctx(),t0=c.currentTime+0.25,first=ons[0][2],end=0;
   ns.forEach(function(r,i){if(!r[3]||r[2]<ini||r[2]>fim)return;var nx=ns.slice(i+1).filter(function(x){return x[0]===r[0]}),off=nx.filter(function(x){return !x[3]})[0],re=nx.filter(function(x){return x[3]})[0],
     fm=off?solta(off[2]):r[2]+500;if(re)fm=Math.min(fm,re[2]);fm=Math.min(fm,fim+300);var du=Math.max(0.15,(fm-r[2])/1000);
    tone(r[0],t0+(r[2]-first)/1000,du,r[1]/127,'rec');end=Math.max(end,(r[2]-first)/1000+du)});
   clearTimeout(REPFIM);REPFIM=setTimeout(function(){RECPLAY=false;paintOuvir();if(TAB==='rep')repMostrar()},(end+1.2)*1000)})})}
/* áudio para compartilhar: as teclas tocadas com as amostras de piano do app (pasta sons/), num .wav com qualidade de CD
   (44,1 kHz, estéreo). A força de cada tecla muda o volume e o brilho; o pedal segura; a tecla solta apaga suave; um pouco de sala.
   Sem compressor (ele achatava o som); no fim só acerta o volume pelo pico. Só o trecho do corte. */
function repSala(oc){var sr=oc.sampleRate,n=Math.round(sr*1.6),b=oc.createBuffer(2,n,sr);
 for(var c=0;c<2;c++){var d=b.getChannelData(c),lp=0;for(var i=0;i<n;i++){lp=lp*0.55+(Math.random()*2-1)*0.45;d[i]=lp*Math.pow(1-i/n,4)}}return b}
function repWavAmostras(id){return repDados(id).then(function(j){var m=(REPS||[]).filter(function(x){return x.id===id})[0]||j.meta,d=j.dados,ini=m.ini||0,fim=m.fim||m.dur,ns=d.notas,ped=d.ped||[];
 function solta(t){var dn=false,i;for(i=0;i<ped.length&&ped[i][0]<=t;i++)dn=!!ped[i][1];if(!dn)return t;for(;i<ped.length;i++)if(!ped[i][1])return ped[i][0];return t+3000}
 var plano=[],end=0,ons=ns.filter(function(r){return r[3]&&r[2]>=ini&&r[2]<=fim});if(!ons.length)throw new Error('sem teclas no trecho');var first=ons[0][2];
 ns.forEach(function(r,i){if(!r[3]||r[2]<ini||r[2]>fim)return;var nx=ns.slice(i+1).filter(function(x){return x[0]===r[0]}),off=nx.filter(function(x){return !x[3]})[0],re=nx.filter(function(x){return x[3]})[0],
  fm=off?solta(off[2]):r[2]+500;if(re)fm=Math.min(fm,re[2]);fm=Math.min(fm,fim+300);var du=Math.max(0.15,(fm-r[2])/1000),t=(r[2]-first)/1000;plano.push({m:r[0],v:r[1]/127,t:t,du:du});end=Math.max(end,t+Math.min(du,3.2))});
 return Promise.all(plano.map(function(p){return load(p.m)})).then(function(){var sr=44100,oc=new OfflineAudioContext(2,Math.ceil((end+2.2)*sr),sr),seco=oc.createGain(),sala=oc.createConvolver(),mol=oc.createGain();
  sala.buffer=repSala(oc);mol.gain.value=0.12;seco.connect(oc.destination);seco.connect(sala);sala.connect(mol);mol.connect(oc.destination);
  plano.forEach(function(p){var b=BUF[p.m];if(!b)return;var o=OFS[p.m]||0,cabe=b.duration-o,vel=Math.min(1,p.v),v=0.06+0.94*Math.pow(vel,1.7),st=p.t+0.1,
    s=oc.createBufferSource(),f=oc.createBiquadFilter(),g=oc.createGain(),pn=oc.createStereoPanner?oc.createStereoPanner():null;
   s.buffer=b;f.type='lowpass';f.frequency.value=1800+16000*vel*vel;f.Q.value=0.4;s.connect(f);f.connect(g);
   if(pn){pn.pan.value=Math.max(-0.5,Math.min(0.5,(p.m-62)/48));g.connect(pn);pn.connect(seco)}else g.connect(seco);
   g.gain.setValueAtTime(v,st);
   if(p.du<cabe-0.4){g.gain.setValueAtTime(v,st+p.du);g.gain.setTargetAtTime(0,st+p.du,0.09);s.start(st,o);s.stop(st+p.du+0.8)}
   else{g.gain.setValueAtTime(v,st+cabe-0.4);g.gain.linearRampToValueAtTime(0,st+cabe-0.02);s.start(st,o);s.stop(st+cabe)}});
  return oc.startRendering()}).then(repWavBlob)})}
function repWavBlob(b){var nc=b.numberOfChannels,ch=[],n=b.length,pk=0,i,c;for(c=0;c<nc;c++){ch.push(b.getChannelData(c));for(i=0;i<n;i++)pk=Math.max(pk,Math.abs(ch[c][i]))}
 var ab=new ArrayBuffer(44+n*nc*2),v=new DataView(ab),w=function(o,s){for(var k=0;k<s.length;k++)v.setUint8(o+k,s.charCodeAt(k))},k=pk>0?0.89/pk:1,p=44;
 w(0,'RIFF');v.setUint32(4,36+n*nc*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,nc,true);v.setUint32(24,b.sampleRate,true);v.setUint32(28,b.sampleRate*nc*2,true);v.setUint16(32,nc*2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*nc*2,true);
 for(i=0;i<n;i++)for(c=0;c<nc;c++){v.setInt16(p,Math.round(Math.max(-1,Math.min(1,ch[c][i]*k))*32767),true);p+=2}return new Blob([ab],{type:'audio/wav'})}
/* MIDI (1 tique = 1 ms): teclas e pedal, para abrir em outros apps de música */
function repMidi(id){return repDados(id).then(function(j){var m=(REPS||[]).filter(function(x){return x.id===id})[0]||j.meta,d=j.dados,ini=m.ini||0,fim=m.fim||m.dur,ev=[],by=[0,0xFF,0x51,3,0x07,0x53,0x00],ult=0;
 d.notas.forEach(function(r){if(r[2]<ini||r[2]>fim+300)return;ev.push([r[2]-ini,r[3]?0x90:0x80,r[0],r[3]?Math.max(1,r[1]):0])});(d.ped||[]).forEach(function(p){if(p[0]>=ini&&p[0]<=fim)ev.push([p[0]-ini,0xB0,64,p[1]?127:0])});
 ev.sort(function(a,b){return a[0]-b[0]});function vlq(n){var o=[n&0x7f];while(n>>=7)o.unshift((n&0x7f)|0x80);return o}
 ev.forEach(function(e){var dt=Math.max(0,Math.round(e[0])-ult);ult+=dt;by=by.concat(vlq(dt),[e[1],e[2],e[3]])});by=by.concat([0,0xFF,0x2F,0]);
 var tl=by.length,arq=[0x4D,0x54,0x68,0x64,0,0,0,6,0,0,0,1,0x01,0xE0,0x4D,0x54,0x72,0x6B,(tl>>>24)&255,(tl>>>16)&255,(tl>>>8)&255,tl&255].concat(by);
 return new Blob([new Uint8Array(arq)],{type:'audio/midi'})})}
function repArquivo(m,ext){return (repNome(m)+' '+m.pct+'%').replace(/[\/\\:*?"<>|]+/g,'-').slice(0,70)+'.'+ext}
/* compartilhar: a folha do macOS (WhatsApp, AirDrop, Mensagens...); se o navegador não tiver, baixa o arquivo */
function repCompartilhar(blob,nome){var f=null;try{f=new File([blob],nome,{type:blob.type})}catch(e){}
 if(f&&navigator.canShare&&navigator.canShare({files:[f]}))return navigator.share({files:[f],title:nome}).catch(function(){});
 var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nome;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},5000);show('Arquivo salvo em Downloads: '+esc(nome),true)}
function repAcao(ac){var m=(REPS||[]).filter(function(x){return x.id===REPABERTO})[0];
 if(ac==='volta'){REPABERTO=null;REPNOME=false;REPCONF=null;repMostrar();return}if(!m)return;
 if(ac==='ouvir')repTocar(m.id);
 else if(ac==='estrela'){m.est=!m.est;repMetaSalva(m)}
 else if(ac==='nome'){REPNOME=true;repMostrar()}else if(ac==='nomeno'){REPNOME=false;repMostrar()}
 else if(ac==='nomeok'){var v=(document.getElementById('repNomeIn').value||'').trim();m.nome=v===m.titulo?'':v.slice(0,80);REPNOME=false;repMetaSalva(m)}
 else if(ac==='corte'){var i=+document.getElementById('repIni').value,f=+document.getElementById('repFim').value;m.ini=i<=0?0:i;m.fim=f>=m.dur?0:f;repMetaSalva(m);show('Corte guardado: '+repDur(i)+' a '+repDur(f)+'. Nada foi apagado; dá para mudar depois.',true)}
 else if(ac==='wav'){show('Preparando o áudio…',true);repWav(m.id,repAvisoPiano).then(function(b){repCompartilhar(b,repArquivo(m,'wav'))}).catch(function(e){show('Não deu para fazer o áudio: '+esc(e.message||e),true)})}
 else if(ac==='midi')repMidi(m.id).then(function(b){repCompartilhar(b,repArquivo(m,'mid'))})
 else if(ac==='apagar'){REPCONF=m.id;repMostrar()}else if(ac==='apagano'){REPCONF=null;repMostrar()}
 else if(ac==='apagasim'){fetch('/api/replays?id='+m.id+'&acao=apagar',{method:'POST'}).then(function(){REPCONF=null;REPABERTO=null;REPS=null;reg('replay apagado: '+repNome(m));repMostrar()})}}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-rep],[data-repacao]');if(!b||!document.getElementById('repBox')||!document.getElementById('repBox').contains(b))return;
 if(b.dataset.rep){REPABERTO=+b.dataset.rep;REPNOME=false;REPCONF=null;repMostrar();var bx=document.getElementById('repBox');if(bx)bx.scrollIntoView({block:'start'})}else repAcao(b.dataset.repacao)});
/* ---------- som de verdade do piano nos replays (OPT.somR, "Gravar o som do piano nos replays") ----------
   Durante cada tentativa, grava o som que o P-225 manda pelo cabo USB:
   - cabo no Mac: o Chrome grava a entrada de som do piano (MediaRecorder, opus, ~1 MB por minuto);
   - cabo no iPhone: o Mac põe uma chave no estado (snap.somk); o app do iPhone grava a entrada USB enquanto ela durar e
     manda o arquivo a /api/somreplay com a hora de início no relógio do Mac.
   "Salvar replay" guarda o som junto (meta.som, meta.somOff = ms da gravação onde fica o tempo 0 das teclas). Ouvir e
   compartilhar usam esse som. Replay sem som: o app toca as teclas no próprio piano e grava (repPorPiano), e guarda.
   Sem piano ligado: as amostras de sons/ (repWavAmostras). */
var PG={st:null,nome:'',g:null,lim:0,fecha:0,somk:null,somenv:null};
function pgAgenda(){clearTimeout(PG.fecha);PG.fecha=setTimeout(pgFechar,15*60000)}
function pgFechar(){if(PG.g)return pgAgenda();if(PG.st)PG.st.getTracks().forEach(function(t){t.stop()});PG.st=null}
function pgEntrada(){if(PG.st&&PG.st.active){pgAgenda();return Promise.resolve(PG.st)}
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder)return Promise.resolve(null);
 var acha=function(){return navigator.mediaDevices.enumerateDevices().then(function(l){return l.filter(function(d){return d.kind==='audioinput'&&/P-Series|P-?\d{3}|Yamaha|Clavinova|Digital Piano/i.test(d.label)})[0]})};
 return acha().then(function(d){if(d&&d.label)return d;return navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){s.getTracks().forEach(function(t){t.stop()});return acha()})})
  .then(function(d){if(!d){reg('som do piano: o piano não aparece como entrada de som no Mac');return null}
   return navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:d.deviceId},echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:2}}).then(function(s){PG.st=s;PG.nome=d.label;pgAgenda();reg('som do piano: entrada aberta ('+d.label+')');return s})})
  .catch(function(e){reg('som do piano: '+(e.name||e));return null})}
function pgGravar(s,ok){var tp=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'',r=new MediaRecorder(s,tp?{mimeType:tp,audioBitsPerSecond:160000}:{});r.partes=[];
 r.ondataavailable=function(e){if(e.data&&e.data.size)r.partes.push(e.data)};r.onstart=function(){r.p0=performance.now();if(ok)ok(true)};r.start(1000);return r}
function pgFim(r,mais){if(!r||r.state==='inactive')return Promise.resolve(null);
 return new Promise(function(ok){setTimeout(function(){r.onstop=function(){ok(r.partes.length&&r.p0?{blob:new Blob(r.partes,{type:r.mimeType||'audio/webm'}),p0:r.p0}:null)};try{r.stop()}catch(e){ok(null)}},mais||0)})}
function pgPode(){return !!(OPT.somR&&repPode()&&(curIn||pianoIphone()))}
/* começa a gravar do lado onde está o cabo. g.pronto: já gravando; g.fim(ms a mais): {blob, p0 em performance.now} ou null; g.larga(): joga fora */
function pgAbre(){var g={};
 if(curIn&&!CEREBRO){g.pronto=pgEntrada().then(function(s){if(!s||g.fora)return false;return new Promise(function(ok){g.r=pgGravar(s,ok)})});
  g.fim=function(mais){g.fora=true;return Promise.race([g.pronto,new Promise(function(x){setTimeout(x,3000)})]).then(function(){return pgFim(g.r,mais)})};
  g.larga=function(){g.fora=true;g.pronto.then(function(){var r=g.r;if(r&&r.state!=='inactive'){r.partes.length=0;r.ondataavailable=null;try{r.stop()}catch(e){}}})};return g}
 if(pianoIphone()||(COMMAC&&curIn)){var k='r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),sai=function(){if(PG.somk===k){PG.somk=null;if(window.CEL_SOON)CEL_SOON()}};
  PG.somk=k;if(window.CEL_SOON)CEL_SOON();g.pronto=new Promise(function(ok){setTimeout(function(){ok(true)},1500)});
  g.fim=function(mais){return new Promise(function(ok){setTimeout(ok,mais||0)}).then(function(){sai();return {iph:true,k:k}})};g.baixa=function(){return pgBaixaIph(k)};g.larga=sai;return g}
 return null}
/* o arquivo que o iPhone mandou (espera até 60 s: o Wi-Fi pode demorar) */
function pgBaixaIph(k){var n=0;PG.somenv=k;if(window.CEL_SOON)CEL_SOON();var fecha=function(x){if(PG.somenv===k){PG.somenv=null;if(window.CEL_SOON)CEL_SOON()}return x};return new Promise(function(ok0){var ok=function(x){ok0(fecha(x))};(function v(){fetch('/api/somreplay?k='+k+'&info=1',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}).then(function(j){
  if(j&&j.erro){reg('som do piano no iPhone: '+j.erro);return ok(null)}
  if(j&&j.p0){fetch('/api/somreplay?k='+k,{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(b){ok({blob:b,p0:j.p0-(Date.now()-performance.now())})}).catch(function(){ok(null)});return}
  if(++n<60)setTimeout(v,1000);else{reg('som do piano no iPhone: o arquivo não chegou');ok(null)}})})()})}
function pgComecar(){pgDescartar();if(!pgPode())return;PG.g=pgAbre();PG.lim=setTimeout(pgDescartar,30*60000)}
function pgDescartar(){clearTimeout(PG.lim);if(PG.g){PG.g.larga();PG.g=null}}
function pgParar(){var g=PG.g;PG.g=null;clearTimeout(PG.lim);return g?g.fim(1500):Promise.resolve(null)}
/* som guardado de um replay, já decodificado */
var REPSOM={};
function repSomBuf(m){if(REPSOM[m.id])return Promise.resolve(REPSOM[m.id]);
 return fetch('/api/replays?id='+m.id+'&som=1',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('sem o som');return r.arrayBuffer()}).then(repDecodifica).then(function(b){REPSOM[m.id]=b;return b})}
function repDecodifica(a){return new Promise(function(res,rej){ctx().decodeAudioData(a,res,rej)})}
/* pedaço da gravação do corte (ini/fim), com 0,3 s antes e 1,5 s depois */
function repTrecho(m,b){var ini=m.ini||0,fim=m.fim||m.dur,sr=b.sampleRate,o=m.somOff||0,a=Math.max(0,Math.round(((o+ini)/1000-0.3)*sr)),z=Math.min(b.length,Math.round(((o+fim)/1000+1.5)*sr));return {a:a,z:Math.max(a+1,z)}}
function repWavReal(m,buf){return (buf?Promise.resolve(buf):repSomBuf(m)).then(function(b){var t=repTrecho(m,b),n=t.z-t.a,sr=b.sampleRate,ch=[];
 for(var c=0;c<Math.min(2,b.numberOfChannels);c++){var x=b.getChannelData(c).slice(t.a,t.z),fi=Math.min(n,Math.round(sr*0.02)),fo=Math.min(n,Math.round(sr*0.5)),i;for(i=0;i<fi;i++)x[i]*=i/fi;for(i=0;i<fo;i++)x[n-1-i]*=i/fo;ch.push(x)}
 return repWavBlob({numberOfChannels:ch.length,length:n,sampleRate:sr,getChannelData:function(c){return ch[c]}})})}
/* replay sem som gravado: o piano toca as teclas e o app grava (leva o tempo do trecho). Replay inteiro: guarda o som para a próxima vez */
var REPGRAV=false;
function repPorPiano(m,j,aviso){if(REPGRAV||!pgPode()||!MOUT||run)return Promise.resolve(null);
 var d=j.dados,ini=m.ini||0,fim=m.fim||m.dur,ns=d.notas,ped=d.ped||[],inteiro=!ini&&!m.fim;
 function solta(t){var dn=false,i;for(i=0;i<ped.length&&ped[i][0]<=t;i++)dn=!!ped[i][1];if(!dn)return t;for(;i<ped.length;i++)if(!ped[i][1])return ped[i][0];return t+3000}
 var plano=[],end=0,ons=ns.filter(function(r){return r[3]&&r[2]>=ini&&r[2]<=fim});if(!ons.length)return Promise.resolve(null);var first=ons[0][2];
 ns.forEach(function(r,i){if(!r[3]||r[2]<ini||r[2]>fim)return;var nx=ns.slice(i+1).filter(function(x){return x[0]===r[0]}),off=nx.filter(function(x){return !x[3]})[0],re=nx.filter(function(x){return x[3]})[0],
  fm=off?solta(off[2]):r[2]+500;if(re)fm=Math.min(fm,re[2]);fm=Math.min(fm,fim+300);var du=Math.max(0.1,(fm-r[2])/1000),t=(r[2]-first)/1000;plano.push({m:r[0],v:r[1]/127,t:t,du:du});end=Math.max(end,t+du)});
 var g=pgAbre();if(!g)return Promise.resolve(null);REPGRAV=true;
 return g.pronto.then(function(ok){if(!ok){REPGRAV=false;g.larga();return null}
  var c=ctx(),t0=c.currentTime+(MOUT.remoto?0.8:0.4),fp=soundPerf(c,t0);pianoVols();
  plano.forEach(function(p){mq(t0+p.t,'rec',2,p.m,127*Math.min(1,p.v),p.du)});
  if(aviso)aviso(end+2);reg('gravando o som do replay pelo piano: '+repNome(m)+' · '+repDur(end*1000));
  return new Promise(function(x){setTimeout(x,(t0-c.currentTime+end)*1000)}).then(function(){return g.fim(2000)}).then(function(rec){REPGRAV=false;if(!rec)return null;
   var mm={};Object.keys(m).forEach(function(k){mm[k]=m[k]});mm.somOff=Math.round(fp-rec.p0-first);
   return rec.blob.arrayBuffer().then(repDecodifica).then(function(b){
    if(inteiro){m.som=1;m.somOff=mm.somOff;REPSOM[m.id]=b;fetch('/api/replays?id='+m.id+'&acao=som',{method:'POST',body:rec.blob}).then(function(){return fetch('/api/replays?id='+m.id+'&acao=meta',{method:'POST',body:JSON.stringify(m)})}).then(function(){REPS=null;if(TAB==='rep')repMostrar()}).catch(function(){})}
    return repWavReal(mm,b)})})}).catch(function(e){REPGRAV=false;reg('ERRO gravando pelo piano: '+(e.message||e));return null})}
function repWav(id,aviso){return repDados(id).then(function(j){var m=(REPS||[]).filter(function(x){return x.id===id})[0]||j.meta;
 if(m.som)return repWavReal(m).catch(function(){return repWavAmostras(id)});
 return repPorPiano(m,j,aviso).then(function(b){return b||repWavAmostras(id)})})}
/* ouvir no Mac com o som gravado (se a saída for o piano, as teclas tocam no próprio piano, como antes) */
function repAvisoPiano(s){show('O piano está tocando o replay para gravar o som de verdade. Leva '+repDur(s*1000)+'; não toque nele até acabar.',true)}
function repOuvirReal(m){return repSomBuf(m).then(function(b){var t=repTrecho(m,b),c=ctx(),s=c.createBufferSource(),g=c.createGain(),st=c.currentTime+0.1,du=(t.z-t.a)/b.sampleRate;
 s.buffer=b;s.connect(g);g.connect(GR);s.start(st,t.a/b.sampleRate,du);sched(s,g,st,st+du);RECPLAY=true;paintOuvir();if(TAB==='rep')repMostrar();reg('ouvir replay (som do piano): '+repNome(m));
 clearTimeout(REPFIM);REPFIM=setTimeout(function(){RECPLAY=false;paintOuvir();if(TAB==='rep')repMostrar()},du*1000+300)})}
/* ---------- som do piano para o vídeo do iPhone ----------
   Com o cabo no Mac, o iPhone grava o vídeo e o Mac grava o som que o piano manda pelo USB (P-Series).
   prep: abre a entrada do piano (o Chrome pede permissão na 1ª vez) | gravar | parar: manda o WAV ao servidor | fim: fecha. */
var SV={st:null,ctx:null,no:null,buf:null,t0:0,k:'',fecha:0};
function svEstado(k,o){return fetch('/api/somvideo?k='+k+'&acao=estado',{method:'POST',body:JSON.stringify(o)}).catch(function(){})}
function svFechar(){try{if(SV.no)SV.no.disconnect()}catch(e){}try{if(SV.ctx)SV.ctx.close()}catch(e){}if(SV.st)SV.st.getTracks().forEach(function(t){t.stop()});SV.st=SV.ctx=SV.no=SV.buf=null;clearTimeout(SV.fecha)}
function svAbrir(k){if(SV.st){svEstado(k,{ok:true,nome:SV.nome});return Promise.resolve()}
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){svEstado(k,{ok:false,erro:'o Chrome não deixa usar o som aqui'});return Promise.resolve()}
 svEstado(k,{ok:false,esperando:true});
 var acha=function(){return navigator.mediaDevices.enumerateDevices().then(function(l){return l.filter(function(d){return d.kind==='audioinput'&&/P-Series|P-?\d{3}|Yamaha|Clavinova|Digital Piano/i.test(d.label)})[0]})};
 return acha().then(function(d){if(d&&d.label)return d;
   return navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){s.getTracks().forEach(function(t){t.stop()});return acha()})})
  .then(function(d){if(!d){svEstado(k,{ok:false,erro:'o Mac não está recebendo som do piano pelo cabo'});reg('som p/ vídeo: piano não aparece como entrada de som');return}
   return navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:d.deviceId},echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:2}}).then(function(s){
    SV.st=s;SV.nome=d.label;svEstado(k,{ok:true,nome:d.label});reg('som p/ vídeo: pronto ('+d.label+')');
    clearTimeout(SV.fecha);SV.fecha=setTimeout(svFechar,30*60000)})})
  .catch(function(e){svEstado(k,{ok:false,erro:'sem permissão para o som no Chrome do Mac ('+(e.name||e)+')'});reg('som p/ vídeo: '+(e.name||e))})}
function svGravar(k){if(!SV.st)return svAbrir(k).then(function(){if(SV.st)svGravar(k)});
 var sr=(SV.st.getAudioTracks()[0].getSettings().sampleRate)||44100,ctx=new AudioContext({sampleRate:sr}),src=ctx.createMediaStreamSource(SV.st),no=ctx.createScriptProcessor(2048,2,2);
 SV.ctx=ctx;SV.no=no;SV.buf=[[],[]];SV.t0=0;SV.k=k;
 no.onaudioprocess=function(e){if(!SV.buf)return;if(!SV.t0)SV.t0=Date.now()-Math.round(e.inputBuffer.duration*1000);var b=e.inputBuffer;
  if(Date.now()-SV.t0>30*60000)return;var i16=function(f){var r=new Int16Array(f.length);for(var i=0;i<f.length;i++)r[i]=Math.max(-1,Math.min(1,f[i]))*32767;return r};
  SV.buf[0].push(i16(b.getChannelData(0)));SV.buf[1].push(i16(b.numberOfChannels>1?b.getChannelData(1):b.getChannelData(0)))};
 src.connect(no);var mudo=ctx.createGain();mudo.gain.value=0;no.connect(mudo);mudo.connect(ctx.destination);
 clearTimeout(SV.fecha);SV.fecha=setTimeout(svFechar,60*60000);reg('som p/ vídeo: gravando')}
function svParar(k){if(!SV.buf||!SV.ctx)return;var sr=SV.ctx.sampleRate,L=SV.buf[0],R=SV.buf[1],n=L.reduce(function(a,x){return a+x.length},0),t0=SV.t0;
 try{SV.no.disconnect();SV.ctx.close()}catch(e){}SV.buf=null;SV.ctx=SV.no=null;
 var dv=new DataView(new ArrayBuffer(44+n*4)),w=function(o,s){for(var i=0;i<s.length;i++)dv.setUint8(o+i,s.charCodeAt(i))};
 w(0,'RIFF');dv.setUint32(4,36+n*4,true);w(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,2,true);dv.setUint32(24,sr,true);dv.setUint32(28,sr*4,true);dv.setUint16(32,4,true);dv.setUint16(34,16,true);w(36,'data');dv.setUint32(40,n*4,true);
 var o=44;for(var j=0;j<L.length;j++){var a=L[j],b=R[j];for(var i=0;i<a.length;i++){dv.setInt16(o,a[i],true);dv.setInt16(o+2,b[i],true);o+=4}}
 fetch('/api/somvideo?k='+k+'&t0='+t0,{method:'POST',body:dv.buffer}).then(function(){reg('som p/ vídeo: mandado ('+Math.round(n/sr)+' s)')}).catch(function(e){reg('ERRO som p/ vídeo: '+e)});
 clearTimeout(SV.fecha);SV.fecha=setTimeout(svFechar,30*60000)}
function svCmd(c){var k=/^\w{1,24}$/.test(c.k||'')?c.k:'';if(!k&&c.v!=='fim')return;
 if(c.v==='prep')svAbrir(k);else if(c.v==='gravar')svGravar(k);else if(c.v==='parar')svParar(k);else if(c.v==='fim')svFechar()}
/* pedidos do celular: ouvir, parar e fazer o áudio para ele compartilhar (fica em /api/replays?id=N&audio=1) */
function repCmd(c){var id=+c.v;if(c.cmd==='repouvir'){if(RECPLAY)repTocar(id);repTocar(id)}else if(c.cmd==='repparar'){if(RECPLAY){stopSched();RECPLAY=false;clearTimeout(REPFIM);paintOuvir()}}
 else if(c.cmd==='repaudio')repWav(id,repAvisoPiano).then(function(b){return fetch('/api/replays?id='+id+'&acao=audio&v='+encodeURIComponent(c.k||''),{method:'POST',body:b})}).catch(function(e){reg('ERRO áudio do replay '+(e.message||e))})}
/* ---------- juntar os dados do Mac e do iPhone (quando o iPhone treinou sozinho, sem o Mac) ----------
   Compara cada lado com a cópia em comum (base): o que só um lado mudou, vale; o que os dois mudaram segue uma regra:
   histórico e tentativas juntam, recordes e página do livro valem o maior, contagens somam, o resto vale a mudança mais recente */
function djRegra(p){
 if(/^piano_hist\/days\/[^/]+\/done\/[^/]+\/best$/.test(p)||/^piano_hist\/days\/[^/]+\/test$/.test(p))return 'max';
 if(/^piano_hist\/days\/[^/]+\/(ms|done\/[^/]+\/n)$/.test(p))return 'soma';
 if(/^piano_jogo\/niv\/[^/]+\/tempo$/.test(p))return 'min';
 if(/^piano_jogo\/niv\/[^/]+\/[^/]+$/.test(p))return 'max';
 if(/^piano_jogo\/notas\/[^/]+\/\d+$/.test(p))return 'soma';
 if(p==='piano_pagina/p')return 'max';
 return ''}
function djIg(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function djObj(x){return x!==null&&typeof x==='object'&&!Array.isArray(x)}
function dj3(base,a,b,p,novoB){
 if(djIg(a,b))return a;if(djIg(a,base))return b;if(djIg(b,base))return a;
 if(a===undefined)return b;if(b===undefined)return a;
 var r=djRegra(p);
 if(typeof a==='number'&&typeof b==='number'){if(r==='max')return Math.max(a,b);if(r==='min')return Math.min(a,b);if(r==='soma')return a+b-(typeof base==='number'?base:0);return novoB?b:a}
 if(Array.isArray(a)&&Array.isArray(b)){
  if(/^piano_jogo\/notas\/[^/]+$/.test(p)){var n=Math.max(a.length,b.length),o=[];for(var i=0;i<n;i++)o.push(dj3(Array.isArray(base)?base[i]:undefined,a[i],b[i],p+'/'+i,novoB));return o}
  /* tentativas de cada exercício (piano_fb) e músicas importadas (piano_users): junta os itens; o mesmo item nos dois lados fica o mais recente */
  if(/^piano_fb\/[^/]+$/.test(p)||p==='piano_users'){var id=function(x){return djObj(x)?(p==='piano_users'?'i'+x.id:'t'+x.t+'|'+(x.id||'')):JSON.stringify(x)};
   var vel=novoB?a:b,nov=novoB?b:a,m={},ord=[];vel.concat(nov).forEach(function(x){var k=id(x);if(!(k in m))ord.push(k);m[k]=x});
   /* item apagado de um lado (estava na base e sumiu): continua apagado */
   if(Array.isArray(base)){var ka={},kb={};a.forEach(function(x){ka[id(x)]=1});b.forEach(function(x){kb[id(x)]=1});base.forEach(function(x){var k=id(x);if(!ka[k]||!kb[k]){var i=ord.indexOf(k);if(i>=0)ord.splice(i,1)}})}
   var out=ord.map(function(k){return m[k]});if(p!=='piano_users')out.sort(function(x,y){return (x&&x.t||0)-(y&&y.t||0)});return out}
  return novoB?b:a}
 if(djObj(a)&&djObj(b)){var o2={},ks={};[a,b].forEach(function(x){Object.keys(x).forEach(function(k){ks[k]=1})});
  Object.keys(ks).forEach(function(k){var v=dj3(djObj(base)?base[k]:undefined,a[k],b[k],p+'/'+k,novoB);if(v!==undefined)o2[k]=v});return o2}
 return novoB?b:a}
function djP(v){if(v==null)return {ok:false,v:v};try{return {ok:true,v:JSON.parse(v)}}catch(e){return {ok:false,v:v}}}
/* base, a (este aparelho) e b (o outro): {chave: texto como no localStorage}. Devolve o resultado no mesmo formato */
function djJuntar(base,a,b){base=base||{};var r={},ma=djP(a.piano_mod).v||{},mb=djP(b.piano_mod).v||{},ks={},LOCAL={piano_celaj:1,piano_perfil:1,piano_atualizado:1};
 [base,a,b].forEach(function(d){Object.keys(d).forEach(function(k){ks[k]=1})});
 Object.keys(ks).forEach(function(k){if(k==='piano_mod')return;if(LOCAL[k]){if(a[k]!==undefined)r[k]=a[k];return}
  var va=a[k],vb=b[k],vz=base[k],nb=(mb[k]||0)>(ma[k]||0);
  if(va===vb){if(va!==undefined)r[k]=va;return}
  if(va===vz){if(vb!==undefined)r[k]=vb;return}if(vb===vz){if(va!==undefined)r[k]=va;return}
  var pa=djP(va),pb=djP(vb),pz=djP(vz);
  if(pa.ok&&pb.ok&&pa.v&&pb.v&&typeof pa.v==='object'&&typeof pb.v==='object'){r[k]=JSON.stringify(dj3(pz.ok?pz.v:undefined,pa.v,pb.v,k.replace(/@.*/,''),nb));return}
  var x=va===undefined?vb:vb===undefined?va:(nb?vb:va);if(x!==undefined)r[k]=x});
 var m={};[ma,mb].forEach(function(o){Object.keys(o).forEach(function(k){m[k]=Math.max(m[k]||0,o[k]||0)})});r.piano_mod=JSON.stringify(m);return r}
function djAtual(){return bkDados().dados}
function djAplicar(r){var ks=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if((/^piano_/.test(k)||k==='tema_app')&&k!=='piano_celaj')ks.push(k)}
 ks.forEach(function(k){if(!(k in r))RAWDEL(k)});Object.keys(r).forEach(function(k){RAWSET(k,r[k])})}
/* iPhone sozinho (?cerebro=1): antes de o app ler os dados, junta a cópia mais nova do Mac que o app do iPhone deixou em window.__MAC_DUMP.
   Com &enviar=1, deixa em window.__RESULTADO o que vai para o Mac; o app do iPhone chama cerebroEnviado() quando o Mac recebeu */
function cerebroJunta(){var m=window.__MAC_DUMP,env=/[?&]enviar\b/.test(location.search);
 if(m&&m.dados&&RAWGET('sync_macv')!==String(m.v)){var base=djP(RAWGET('sync_base')).v||null,r=base?djJuntar(base,djAtual(),m.dados):m.dados;
  djAplicar(r);RAWSET('sync_base',JSON.stringify(r));RAWSET('sync_macv',String(m.v))}
 if(env)window.__RESULTADO={usou:RAWGET('sync_macv')||'',dados:djAtual()}}
function cerebroEnviado(){var r=window.__RESULTADO;if(r)RAWSET('sync_base',JSON.stringify(r.dados));return 'ok'}
function bkPode(){return /^https?:/.test(location.protocol)&&!TESTE&&!ENSAIO}
function bkSalvar(tipo){if(!bkPode())return Promise.reject(new Error('abra o app pelo ícone "Treino de Piano" (não funciona no modo de teste)'));
 return fetch('/api/backup?tipo='+(tipo==='auto'?'auto':'manual'),{method:'POST',body:JSON.stringify(bkDados())}).then(function(r){return r.ok?r.json():r.text().then(function(t){throw new Error(t)})}).then(function(j){try{localStorage['backup_ultimo']=String(Date.now())}catch(e){}return j})}
function bkAuto(){var hoje=dkey();try{if(localStorage['backup_dia']===hoje)return}catch(e){return}bkSalvar('auto').then(function(){try{localStorage['backup_dia']=hoje}catch(e){}}).catch(function(){})}
/* ---------- iPhone sozinho, do lado do Mac: manda a sua cópia dos dados ao servidor (o iPhone junta com ela quando treina sem o Mac)
   e, parado e sem uso há 1 min, junta o que o iPhone devolver (com backup antes) e recarrega ---------- */
(function(){if(CEREBRO||!/^https?:/.test(location.protocol)||/[?&](teste|ensaio)\b/.test(location.search))return;var ult='';
 function manda(){if(!ACTIVE)return;var j;try{j=JSON.stringify(djAtual())}catch(e){return}if(j===ult)return;
  fetch('/api/dados?de=mac',{method:'POST',body:j}).then(function(r){if(r.ok)ult=j}).catch(function(){})}
 function confere(){if(!ACTIVE||run||Date.now()-LASTUSE<60000||(lastAct&&Date.now()-lastAct<60000))return;var feito='0';try{feito=localStorage.getItem('sync_iphone')||'0'}catch(e){}
  fetch('/api/dados?de=iphone&depois='+encodeURIComponent(feito),{cache:'no-store'}).then(function(r){return r.status===200?r.json():null}).then(function(ip){if(!ip||!ip.dados)return;
   /* o iPhone corrigindo com o Mac ligado entrega várias vezes partindo da mesma cópia do Mac: a base é a entrega anterior (já juntada), senão contaria duas vezes */
   var antU='';try{antU=localStorage.getItem('sync_iphone_usou')||''}catch(e){}var baseUrl=ip.usou&&antU===String(ip.usou)&&feito!=='0'?'/api/dados?de=iphone&v='+encodeURIComponent(feito):'/api/dados?de=mac&v='+encodeURIComponent(ip.usou||'');
   return fetch(baseUrl,{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}).then(function(dm){
    return bkSalvar('auto').catch(function(){}).then(function(){if(run)return;var agora=djAtual(),base=dm&&dm.dados?dm.dados:agora;
     reg('juntou os dados que o iPhone treinou sozinho ('+ip.v+(dm&&dm.dados?'':', sem a cópia-base')+')');djAplicar(djJuntar(base,agora,ip.dados));regEnvia();try{localStorage.setItem('sync_iphone',String(ip.v));localStorage.setItem('sync_iphone_usou',String(ip.usou||''))}catch(e){}ult='';location.reload()})})}).catch(function(){})}
 setTimeout(manda,5000);setInterval(manda,30000);setInterval(confere,30000);window.dadosMandaAgora=manda})();
function bkRestaurar(obj){if(!obj||obj.app!=='treino-piano'||!obj.dados)return Promise.reject(new Error('este arquivo não é um backup do Treino de piano'));
 return bkSalvar('manual').catch(function(){}).then(function(){var del=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^piano_/.test(k))del.push(k)}
  del.forEach(function(k){RAWDEL(k)});Object.keys(obj.dados).forEach(function(k){if(/^piano_/.test(k)||k==='tema_app')localStorage[k]=obj.dados[k]});
  try{sessionStorage.setItem('restaurado',obj.criado||'1')}catch(e){}location.reload()})}
function bkQuando(nome){var m=/progresso-(\d+)-(\d+)-(\d+)-(\d\d)(\d\d)\d\d(-auto)?/.exec(nome);return m?m[3]+'/'+m[2]+'/'+m[1]+' às '+m[4]+':'+m[5]+(m[6]?' (automático)':''):nome}
function bkHtml(){var u=0;try{u=+localStorage['backup_ultimo']||0}catch(e){}
 return '<h2 class="conc-h">Backup do progresso</h2><div class="bk">'+ilu('diario','sug')+'<div><p>Guarda tudo: histórico, recordes, ajustes, músicas importadas e os perfis de todas as pessoas. O app salva sozinho uma vez por dia, na pasta do app (<b>backups</b>) e no <b>iCloud Drive</b> (pasta "Treino de Piano"), que você abre também pelo iPhone. Nunca vai para o GitHub.</p>'+
  '<p class="lb">Último backup: '+(u?quando(u):'ainda nenhum')+'.</p><div class="row"><button class="primary" id="bkSalvar">Salvar meu progresso agora</button><button id="bkLista">Restaurar um backup…</button><button id="bkBaixar">Baixar arquivo</button><label class="bkfile"><input type="file" id="bkAbrir" accept=".json,application/json">Abrir arquivo…</label></div>'+
  '<div id="bkStat" class="lb" aria-live="polite"></div><div id="bkList"></div></div></div>'}
function bkMontar(p){var st=function(t){var e=document.getElementById('bkStat');if(e)e.innerHTML=t};
 var sv=document.getElementById('bkSalvar');if(!sv)return;
 sv.onclick=function(){st('Salvando…');bkSalvar('manual').then(function(j){st('Salvo: '+bkQuando(j.nome)+(j.icloud?', com cópia no iCloud Drive.':'.'));showPanel()}).catch(function(e){st('Não deu: '+e.message)})};
 document.getElementById('bkBaixar').onclick=function(){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(bkDados())],{type:'application/json'}));a.download='progresso-treino-piano-'+dkey()+'.json';document.body.appendChild(a);a.click();a.remove()};
 document.getElementById('bkAbrir').onchange=function(){var f=this.files[0];if(!f)return;f.text().then(function(t){var o=JSON.parse(t);if(!confirm('Trocar o progresso atual pelo deste arquivo ('+(o.criado?new Date(o.criado).toLocaleString('pt-BR'):'sem data')+')? O progresso atual é salvo antes, em backups.'))return;st('Restaurando…');return bkRestaurar(o)}).catch(function(e){st('Não deu: '+e.message)})};
 document.getElementById('bkLista').onclick=function(){if(!bkPode()){st('Abra o app pelo ícone "Treino de Piano" para ver os backups.');return}st('Carregando…');fetch('/api/backups').then(function(r){return r.json()}).then(function(l){st(l.length?'Escolha qual backup trazer de volta:':'Ainda não há backups.');
  document.getElementById('bkList').innerHTML='<div class="bk-lista">'+l.slice(0,20).map(function(x){return '<div class="bk-item"><span>'+bkQuando(x.nome)+'</span><span class="lb">'+Math.max(1,Math.round(x.tam/1024))+' KB</span><button data-bk="'+x.nome+'">Restaurar</button></div>'}).join('')+'</div>';
  document.querySelectorAll('[data-bk]').forEach(function(b){b.onclick=function(){if(!confirm('Trocar o progresso atual pelo de '+bkQuando(b.dataset.bk)+'? O progresso atual é salvo antes, então dá para voltar.'))return;st('Restaurando…');
   fetch('/api/backup?nome='+encodeURIComponent(b.dataset.bk)).then(function(r){return r.json()}).then(bkRestaurar).catch(function(e){st('Não deu: '+e.message)})}})}).catch(function(){st('Não consegui ler os backups.')})}}
/* ---------- continuar de onde parou depois de recarregar (atualização do app ou recarga) ----------
   Na hora de sair, guarda na sessão desta aba: o resultado na tela, o jogo (tela e rodada em andamento), a rolagem,
   os conceitos abertos e se os Ajustes estavam abertos. Ao voltar (até 1 hora depois), põe tudo de volta. */
function sessaoSalva(){if(ENSAIO)return;try{var r=document.getElementById('res'),d=document.getElementById('ajDlg');
 sessionStorage.setItem('sessao',JSON.stringify({t:Date.now(),res:r&&!run?r.innerHTML:'',y:window.scrollY,aj:!!(d&&d.open),
  conc:[].map.call(document.querySelectorAll('details.conc[open] summary b'),function(b){return b.textContent}),
  jg:{vis:JG.vis,on:JG.on,modo:JG.modo,nivel:JG.nivel,n:JG.n,acertos:JG.acertos,erros:JG.erros,combo:JG.combo,bestCombo:JG.bestCombo,tempos:JG.tempos,pontos:JG.pontos,alvo:JG.on&&JG.modo!=='corre'&&JG.alvo?{c:JG.alvo.c,i:JG.alvo.i,ns:JG.alvo.ns,k:JG.cor?JG.alvo.ns.length:JG.alvo.k}:null,errou:JG.errou,msg:JG.msg}}))}catch(e){}}
window.addEventListener('pagehide',sessaoSalva);window.addEventListener('beforeunload',sessaoSalva);
function sessaoVolta(){if(ENSAIO)return;var s=null;try{s=JSON.parse(sessionStorage.getItem('sessao'));sessionStorage.removeItem('sessao')}catch(e){}if(!s||Date.now()-s.t>3600000)return;
 var j=s.jg||{};
 if(j.vis||j.on){jAbrir();if(j.on&&j.modo!=='corre'&&j.alvo&&j.n<JTOT){JG.on=true;JG.vis=true;['n','acertos','erros','combo','bestCombo','pontos'].forEach(function(k){JG[k]=j[k]||0});JG.tempos=j.tempos||[];
   var a=j.alvo;if(a.k>=a.ns.length){JG.n++;jProxima()}else{JG.alvo={c:a.c,i:a.i,ns:a.ns,k:a.k};JG.cor=null;JG.errou=!!j.errou;JG.dica=false;JG.pausa=false;JG.t0=performance.now();if(j.msg)jMsg(j.msg[0],j.msg[1]);if(JG.modo==='ouvido')jOuvir();jDesenha();jKb();jPainel()}praticaVis()}
  else if(j.on&&j.modo==='corre')jMsg('O jogo parou por causa da atualização do app. Aperte "Começar o jogo" para continuar.')}
 if(s.res&&!run&&!document.getElementById('res').innerHTML)document.getElementById('res').innerHTML=s.res;
 if(s.conc&&s.conc.length&&TAB==='conc')document.querySelectorAll('details.conc').forEach(function(d){var b=d.querySelector('summary b');d.open=!!(b&&s.conc.indexOf(b.textContent)>=0)});
 if(s.aj){var d=document.getElementById('ajDlg');if(d&&d.showModal&&!d.open)d.showModal()}
 setTimeout(function(){window.scrollTo(0,s.y||0)},80)}
/* ---------- ajudas por exercício ----------
   O que está em ⚙ Ajustes vale para todos os exercícios (o padrão, com ajuda). Ao tirar uma ajuda pela dica do resultado
   ou pelo botão ao lado da contagem, ela sai só daquele exercício; nos outros continua o padrão. Fica salvo por perfil (piano_ajx) */
var AJXK=['cnt','hl','live','pno','clk'],AJX={},OPTB={};try{AJX=JSON.parse(localStorage.getItem('piano_ajx'))||{}}catch(e){}
AJXK.forEach(function(k){OPTB[k]=OPT[k]});
function ajxSalva(){try{localStorage.setItem('piano_ajx',JSON.stringify(AJX))}catch(e){}}
function ajxId(){return CUR?(CUR.base||CUR).id:''}
function optSalvar(){var o={};Object.keys(OPT).forEach(function(k){o[k]=OPT[k]});AJXK.forEach(function(k){if(k in OPTB)o[k]=OPTB[k]});return o}
function ajxAplica(){var o=AJX[ajxId()]||{};AJXK.forEach(function(k){OPT[k]=(k in o)?o[k]:OPTB[k]});
 if(AC){var n=AC.currentTime;try{GP.gain.setTargetAtTime(OPT.pno?1.5:0,n,0.02);GC.gain.setTargetAtTime(OPT.clk?(+document.getElementById('clkVol').value)/100:0,n,0.02)}catch(e){}}
 _paintBase();cntPinta()}
function ajxDefine(k,v){var id=ajxId();if(!id)return;var o=AJX[id]||{};if(v===OPTB[k])delete o[k];else o[k]=v;if(Object.keys(o).length)AJX[id]=o;else delete AJX[id];ajxSalva();ajxAplica();render()}
/* mexeu no botão em Ajustes: muda o padrão de todos e tira a exceção deste exercício */
document.querySelectorAll('.sw').forEach(function(b){b.addEventListener('click',function(){var k=b.dataset.k;if(AJXK.indexOf(k)<0)return;OPTB[k]=OPT[k];var o=AJX[ajxId()];if(o&&k in o){delete o[k];if(!Object.keys(o).length)delete AJX[ajxId()];ajxSalva()}saveSet();cntPinta()})});
/* botão ao lado da contagem: liga ou desliga a contagem só neste exercício */
function cntPinta(){var b=document.getElementById('cntBtn');if(!b)return;var exc=AJX[ajxId()]&&'cnt' in AJX[ajxId()];b.textContent=OPT.cnt?'Esconder a contagem':'Mostrar a contagem';b.title=(OPT.cnt?'Esconde':'Mostra')+' "Compasso 1 · tempo 1…" só neste exercício'+(exc?' (este exercício está diferente do padrão)':'')}
(function(){var b=document.getElementById('cntBtn');if(b)b.onclick=function(){ajxDefine('cnt',!OPT.cnt);if(!run)show(OPT.cnt?'<span class="lb">Contagem ligada neste exercício.</span>':'<span class="lb">Contagem escondida só neste exercício: conte você mesmo. Nos outros ela continua.</span>',true)}})();
/* ---------- o celular acompanha a música sozinho (como o Ableton Link) ----------
   No modo Com tempo, o celular recebe uma vez: a hora do Mac em que o tempo 0 começa, o andamento e onde fica cada nota
   na partitura. Com o relógio já acertado com o Mac, ele mesmo acende a nota da vez, conta "Compasso · tempo" e troca de
   linha, sem esperar o Wi-Fi a cada tempo. As cores de certo/errado continuam vindo do Mac. */
var RELC=null;
/* notas esperadas (para o app do iPhone conferir pelo som): as próximas, com a hora do Mac em que cada uma deve soar */
function espSnap(){if(!run||!CUR)return null;var t0=MODE==='time'&&startPerf?Date.now()-performance.now()+startPerf:null,l=[];
 EV.forEach(function(e){if(e.st||l.length>=10||!e.midis||!e.midis.length)return;l.push([t0==null?null:Math.round(t0+e.beat*spb*1000),e.midis.slice()])});return {modo:MODE,l:l}}
/* onde ficam os compassos na linha (para a virada pela metade no celular) e o compasso da vez */
function linSnap(){if(!CUR||VIS==='fall')return null;var per=perLine(),x0=70+Math.abs(CUR.key)*12,e=EV.filter(function(x){return !x.st})[0]||EV[EV.length-1];
 return {per:per,x0:x0,mw:Math.round((largura()-10-x0)/per*100)/100,m:e?e.m:0}}
function relSnap(){if(!(run||ASS)||(MODE!=='time'&&!ASS)||!startPerf||!CUR||VIS==='fall')return null;
 if(!RELC||RELC.k!==GOID){var per=perLine(),ksw=Math.abs(CUR.key)*12,x0=70+ksw,mw=(largura()-10-x0)/per,gs={};
  EV.forEach(function(e){var k=Math.round(e.beat*1000);if(gs[k])return;var mi=e.m%per;gs[k]=[Math.round(e.beat*1000)/1000,Math.floor(e.m/per),Math.round(x0+mi*mw+26+noteX(e)*(mw-38))]});
  RELC={k:GOID,g:Object.keys(gs).map(function(k){return gs[k]}).sort(function(a,b){return a[0]-b[0]})}}
 return {t0:Math.round(Date.now()-performance.now()+startPerf),spb:spb,beats:CUR.beats,fim:CUR.ms.length*CUR.beats,mm:CUR.mmap||null,g:RELC.g}}
/* ---------- quiálteras (3 notas no lugar de 2) ----------
   Nas durações de 1/3 e 2/3 de tempo, o grupo ganha um "3" em cima (ou embaixo) da barra */
function eTri(e){var D=e.ndur||e.dur;return Math.abs(D*3-Math.round(D*3))<1e-6&&Math.abs(D*4-Math.round(D*4))>1e-6}
/* ---------- atualização sem perder nada ----------
   O app guarda o que está aberto (exercício ou música, trecho de linhas, modo, andamento, aba) e volta igual ao recarregar.
   Quando o arquivo do app muda no Mac, ele se atualiza sozinho: só com o exercício parado, depois de 1 min sem uso,
   com a versão nova igual por 2 conferências seguidas e só se o código novo não tiver erro */
function saveAtual(){if(!CUR)return;var b=CUR.base||CUR;try{localStorage.setItem('piano_atual',JSON.stringify({id:b.id,mmap:CUR.mmap||null,tit:CUR.mmap?CUR.title.slice(b.title.length+3):null,mode:MODE,bpm:+document.getElementById('bpm').value,tab:TAB}))}catch(e){}}
function restoreAtual(){var a=null;try{a=JSON.parse(localStorage.getItem('piano_atual'))}catch(e){}
 var ex=a&&(byId(a.id)||USERS.filter(function(u){return u.id===a.id})[0]);if(!ex){load_ex((byId('p32_yankee')||EX[0]));return}
 if(a.mode==='wait'||a.mode==='time'){MODE=a.mode;paint()}if(a.tab&&document.querySelector('.tab[data-t="'+a.tab+'"]')){TAB=a.tab;showPanel()}
 load_ex(ex);if(a.mmap&&a.mmap.length)practiceMeasures(a.mmap,a.tit||null);
 if(a.bpm){var r=document.getElementById('bpm');r.value=a.bpm;document.getElementById('bv').textContent=a.bpm+' BPM'}saveAtual()}
var LASTUSE=Date.now();['pointerdown','keydown'].forEach(function(t){document.addEventListener(t,function(){LASTUSE=Date.now()},true)});
/* confere cada arquivo novo antes de atualizar: o HTML (scripts de dentro dele), o .css e os .js */
function codeOk(files,tx){var ok=true;tx.forEach(function(t,i){var f=files[i];if(t==null||!ok)return;
  if(/\.css$/.test(f)){try{if(typeof CSSStyleSheet==='function'&&new CSSStyleSheet().replaceSync)new CSSStyleSheet().replaceSync(t)}catch(e){ok=false}}
  else if(/\.js$/.test(f)){try{new Function(t)}catch(e){ok=false}}
  else{var d=new DOMParser().parseFromString(t,'text/html');d.querySelectorAll('script:not([src])').forEach(function(s){try{new Function(s.textContent)}catch(e){ok=false}})}});return ok}
(function(){if(!/^https?:/.test(location.protocol)||ENSAIO)return;var files=[location.pathname,'treino-piano.css','treino-piano.js','queda.js'],first={},seen={};
 function check(){Promise.all(files.map(function(f){return fetch(f,{cache:'no-store'}).then(function(r){return r.ok?r.text():null}).catch(function(){return null})})).then(function(tx){
   var changed=false,stable=true;tx.forEach(function(t,i){var f=files[i];if(t==null)return;if(first[f]==null)first[f]=t;if(t!==first[f]){changed=true;if(seen[f]!==t)stable=false}seen[f]=t});
   if(!changed||!stable||run||Date.now()-LASTUSE<60000||(lastAct&&Date.now()-lastAct<60000))return;
   if(typeof PAUSA!=='undefined'&&PAUSA)return;/* pausado no meio da música: não troca (perderia o ponto da pausa) */
   if(document.getElementById('res').innerHTML&&Date.now()-LASTUSE<300000)return;/* resultado na tela: espera 5 min para não sumir enquanto você lê */
   if(!codeOk(files,tx))return;
   ensaiar(function(){saveAtual();reg('atualizou sozinho (arquivos novos)');regEnvia();try{sessionStorage.setItem('piano_atualizado','1')}catch(e){}location.reload()})})}
 /* abre a versão nova escondida; só atualiza se ela chegar ao fim do início (APP_OK) sem erro */
 var ENS=false;function ensaiar(ok){if(ENS)return;ENS=true;var f=document.createElement('iframe'),done=false;f.style.cssText='position:fixed;width:900px;height:700px;left:-10000px;top:0;visibility:hidden';
  f.src=location.pathname+'?teste&ensaio=1&v='+Date.now();f.onload=function(){setTimeout(function(){if(done)return;done=true;var good=false;try{good=f.contentWindow.APP_OK===true}catch(e){}f.remove();ENS=false;if(good)ok()},2500)};
  setTimeout(function(){if(!done){done=true;f.remove();ENS=false}},15000);document.body.appendChild(f)}
 setInterval(check,20000);check()})();
['bpm'].forEach(function(id){document.getElementById(id).addEventListener('change',saveAtual)});

/* folha de Ajustes, andamento na barra (−/+ de 5 em 5) e menu do perfil */
(function(){var d=document.getElementById('ajDlg');document.getElementById('ajBtn').onclick=function(){if(d.showModal)d.showModal();else d.setAttribute('open','')};
 document.getElementById('ajClose').onclick=function(){d.close?d.close():d.removeAttribute('open')};
 d.addEventListener('click',function(e){if(e.target===d)d.close()});
 var b=document.getElementById('bpm'),bv=document.getElementById('bv'),b2=document.getElementById('bv2');function sync(){if(document.activeElement!==b2)b2.value=b.value;var r=document.getElementById('bpmR');if(r)r.value=b.value}sync();
 /* digitar o andamento: vale ao apertar Enter ou sair do campo (30 a 140) */
 function typed(){if(run){sync();return}var v=Math.round(+b2.value);if(!(v>0)){sync();return}v=Math.max(+b.min,Math.min(+b.max,v));b.value=v;b.oninput();b2.value=v}
 b2.addEventListener('change',typed);b2.addEventListener('keydown',function(e){if(e.key==='Enter'){b2.blur()}});b2.addEventListener('focus',function(){b2.select()});new MutationObserver(sync).observe(bv,{childList:true,characterData:true,subtree:true});
 /* slider da barra: anda junto com o andamento (parado); tocando, fica travado */
 var br=document.getElementById('bpmR');br.oninput=function(){if(run){sync();return}b.value=br.value;b.oninput();b2.value=br.value};
 document.addEventListener('click',function(e){document.querySelectorAll('details.menu[open]').forEach(function(m){if(!m.contains(e.target))m.open=false})});
 document.querySelectorAll('.menupop button').forEach(function(x){x.addEventListener('click',function(){x.closest('details').open=false})})})();
paintNomes();paintMao();
paint();paintAudio();updToday();showPanel();restoreAtual();window.scrollTo(0,0);
try{if(sessionStorage.getItem('piano_atualizado')){sessionStorage.removeItem('piano_atualizado');show('<span class="lb">O app foi atualizado. Tudo continua como estava: é só apertar "Começar".</span>',true)}}catch(e){}
/* sem exercícios de livro (app público, sem conteudo-pessoal.js): a aba Livro some */
if(!EX.some(function(e){return e.g==='livro'})){var tbL=document.querySelector('.tab[data-t="livro"]');if(tbL)tbL.style.display='none'}
/* o Mac trocou entre claro e escuro: redesenha (a tinta da partitura acompanha) */
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){render();if(TAB==='leit'||TAB==='conc')showPanel()})}catch(e){}
/* facilidades: tela simples e letra; passo a passo na primeira vez de quem começa (nunca no teste nem no ensaio) */
aplicaFacil();
/* backup automático do dia (uma vez por dia, alguns segundos depois de abrir) */
if(bkPode())setTimeout(bkAuto,8000);
try{if(sessionStorage.getItem('restaurado')){sessionStorage.removeItem('restaurado');show('<span class="lb">Progresso restaurado do backup. Tudo como estava naquele dia.</span>',true)}}catch(e){}
try{if(OPT.tut!==false&&!TESTE&&!ENSAIO&&!localStorage.getItem('piano_tutvisto')&&!Object.keys(H.days).length)setTimeout(function(){tutorial(0)},900)}catch(e){}
PRONTO=true;sessaoVolta();praticaVis();
window.APP_OK=true;/* chegou ao fim do início sem erro */
if(!ENSAIO)connectMidi(true);
/* ---------- espelho do iPhone: com o cabo no iPhone ("O iPhone corrige" ligado), quem corrige é o iPhone; esta aba mostra a tela
   dele (celular.html?espelho=1) e os botões comandam o iPhone: play, trocar música, ajustes. Some quando o iPhone para de mandar. ---------- */
(function(){if(CEREBRO||!/^https?:/.test(location.protocol)||/[?&](teste|ensaio)\b/.test(location.search))return;var on=false,box=null,esc=0;
 function poe(v){if(v===on)return;on=v;
  if(v){box=document.createElement('div');box.id='espBox';
   box.innerHTML='<div class="esp-top"><div><b>O iPhone está corrigindo</b><span class="lb">O piano está no cabo do iPhone. Esta é a tela dele: os botões daqui comandam o iPhone.</span></div><button id="espEsc">Esconder por 5 min</button></div><iframe src="celular.html?espelho=1" title="Tela do iPhone"></iframe>';
   document.body.appendChild(box);document.getElementById('espEsc').onclick=function(){esc=Date.now();poe(false)};reg('espelho do iPhone: aberto')}
  else{if(box)box.remove();box=null}}
 function confere(){if(run)return;fetch('/api/espelho?info=1',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){poe(j.idade<12&&Date.now()-esc>300000)}).catch(function(){})}
 setInterval(confere,3000);confere()})();
