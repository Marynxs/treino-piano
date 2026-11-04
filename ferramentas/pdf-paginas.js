// Separa páginas de um PDF em outro PDF, usando só o macOS (PDFKit).
// Uso: osascript -l JavaScript ferramentas/pdf-paginas.js "<entrada>" "<saída>" <página inicial> <página final>
// As páginas são contadas como no visualizador de PDF: a primeira é a 1.
ObjC.import('PDFKit');
function run(a){
 var d=$.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(a[0]));
 if(d.isNil())return 'erro: não abriu o PDF';
 var ini=+a[2],fim=+a[3],tot=d.pageCount;
 if(ini<1||fim<ini||ini>tot)return 'erro: esse PDF tem '+tot+' páginas';
 fim=Math.min(fim,tot);
 var n=$.PDFDocument.alloc.init;
 for(var i=ini;i<=fim;i++)n.insertPageAtIndex(d.pageAtIndex(i-1),n.pageCount);
 return n.writeToFile(a[1])?'ok':'erro: não gravou o PDF'}
