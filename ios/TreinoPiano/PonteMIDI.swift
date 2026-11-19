// Para o cérebro (a página do Mac rodando no iPhone): um navigator.requestMIDIAccess de mentira, ligado ao cabo pelo CoreMIDI.
// Entradas: as teclas e o pedal. Saídas: o som guia, o metrônomo e a gravação vão para o piano, como no Mac.
import Foundation

enum PonteMIDI {
    static let script = """
    (function(){var ins=new Map(),outs=new Map(),acc=null;
    function Porta(id,nome,fab,tipo){this.id=id;this.name=nome;this.manufacturer=fab||'';this.type=tipo;this.state='connected';this.connection='open';this.onmidimessage=null}
    Porta.prototype.send=function(d,ts){var a=ts?Math.max(0,ts-performance.now()):0;webkit.messageHandlers.midiOut.postMessage({d:Array.prototype.slice.call(d),a:a})};
    Porta.prototype.open=function(){return Promise.resolve(this)};Porta.prototype.close=function(){return Promise.resolve(this)};
    Porta.prototype.addEventListener=function(t,f){if(t==='midimessage')this.onmidimessage=f};Porta.prototype.removeEventListener=function(){};
    window.__midiPortas=function(l){ins.clear();outs.clear();(l.ins||[]).forEach(function(p,i){ins.set('i'+i,new Porta('i'+i,p.nome,p.fab,'input'))});
     (l.outs||[]).forEach(function(p,i){outs.set('o'+i,new Porta('o'+i,p.nome,p.fab,'output'))});if(acc&&acc.onstatechange)try{acc.onstatechange({port:null})}catch(e){}};
    window.__midiIn=function(lista){lista.forEach(function(x){var t=performance.now()-Math.max(0,Date.now()-x[3]);ins.forEach(function(i){if(i.onmidimessage)i.onmidimessage({data:new Uint8Array([x[0],x[1],x[2]]),timeStamp:t})})})};
    navigator.requestMIDIAccess=function(){if(!acc)acc={inputs:ins,outputs:outs,onstatechange:null,sysexEnabled:false};webkit.messageHandlers.midiOut.postMessage({portas:1});return Promise.resolve(acc)};})();
    """
}
