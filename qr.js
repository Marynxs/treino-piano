/* ---------- QR code (versão 5, correção L, máscara 0): até 106 caracteres. Feito à mão, sem biblioteca. ----------
   window.QR(texto) devolve uma matriz de 37×37 (true = quadradinho preto) ou null se o texto for longo demais.
   window.QRsvg(texto, px) devolve o <svg> pronto, com a margem branca que o leitor precisa. */
(function(){
 var N=37,DATA=108,ECC=26;
 function mul(x,y){var z=0;for(var i=7;i>=0;i--){z=((z<<1)^((z>>>7)*0x11D))&255;z^=((y>>>i)&1)*x}return z}
 function div(d){var r=[];for(var i=0;i<d-1;i++)r.push(0);r.push(1);var root=1;
  for(i=0;i<d;i++){for(var j=0;j<r.length;j++){r[j]=mul(r[j],root);if(j+1<r.length)r[j]^=r[j+1]}root=mul(root,2)}return r}
 function rem(data,dv){var r=dv.map(function(){return 0});data.forEach(function(b){var f=b^r.shift();r.push(0);dv.forEach(function(c,i){r[i]^=mul(c,f)})});return r}
 function bytes(s){var u=unescape(encodeURIComponent(s)),a=[];for(var i=0;i<u.length;i++)a.push(u.charCodeAt(i));return a}
 window.QR=function(txt){var b=bytes(String(txt));if(b.length>106)return null;
  var bits=[];function put(v,n){for(var i=n-1;i>=0;i--)bits.push((v>>>i)&1)}
  put(4,4);put(b.length,8);b.forEach(function(x){put(x,8)});
  put(0,Math.min(4,DATA*8-bits.length));while(bits.length%8)bits.push(0);
  var d=[];for(var i=0;i<bits.length;i+=8){var v=0;for(var j=0;j<8;j++)v=(v<<1)|bits[i+j];d.push(v)}
  for(var p=0;d.length<DATA;p++)d.push(p%2?0x11:0xEC);
  var all=d.concat(rem(d,div(ECC)));
  var m=[],fn=[];for(i=0;i<N;i++){m.push(new Array(N).fill(false));fn.push(new Array(N).fill(false))}
  function set(x,y,v){m[y][x]=!!v;fn[y][x]=true}
  for(i=0;i<N;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
  [[3,3],[N-4,3],[3,N-4]].forEach(function(c){for(var dy=-4;dy<=4;dy++)for(var dx=-4;dx<=4;dx++){var x=c[0]+dx,y=c[1]+dy,k=Math.max(Math.abs(dx),Math.abs(dy));if(x>=0&&x<N&&y>=0&&y<N)set(x,y,k!==2&&k!==4)}});
  for(var dy=-2;dy<=2;dy++)for(var dx=-2;dx<=2;dx++)set(30+dx,30+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);
  var f=(1<<3)|0,r=f;for(i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);var fb=((f<<10)|r)^0x5412;
  function g(i){return (fb>>>i)&1}
  for(i=0;i<=5;i++)set(8,i,g(i));set(8,7,g(6));set(8,8,g(7));set(7,8,g(8));for(i=9;i<15;i++)set(14-i,8,g(i));
  for(i=0;i<8;i++)set(N-1-i,8,g(i));for(i=8;i<15;i++)set(8,N-15+i,g(i));set(8,N-8,1);
  var k=0;for(var right=N-1;right>=1;right-=2){if(right===6)right=5;
   for(var vert=0;vert<N;vert++)for(j=0;j<2;j++){var x=right-j,up=((right+1)&2)===0,y=up?N-1-vert:vert;
    if(!fn[y][x]&&k<all.length*8){m[y][x]=((all[k>>>3]>>>(7-(k&7)))&1)===1;k++}}}
  for(y=0;y<N;y++)for(x=0;x<N;x++)if(!fn[y][x]&&(x+y)%2===0)m[y][x]=!m[y][x];
  return m};
 window.QRsvg=function(txt,px){var m=window.QR(txt);if(!m)return '';var q=4,t=N+2*q,d='';
  for(var y=0;y<N;y++)for(var x=0;x<N;x++)if(m[y][x])d+='M'+(x+q)+' '+(y+q)+'h1v1h-1z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+t+' '+t+'" width="'+(px||180)+'" height="'+(px||180)+'" shape-rendering="crispEdges" role="img" aria-label="QR code: '+String(txt).replace(/"/g,'')+'"><rect width="'+t+'" height="'+t+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>'};
})();
