// Renderiza páginas do livro (PDF) em JPG usando só o macOS (PDFKit), sem instalar nada.
// Uso: osascript -l JavaScript ferramentas/render-livro.js "<pdf>" "<pasta saída>" <pág. inicial do livro> <pág. final> [largura]
// Página N do livro = índice N (0-based) do PDF.
ObjC.import('PDFKit');ObjC.import('AppKit');
function run(argv){
 var doc=$.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(argv[0]));
 var out=argv[1],a=+argv[2],b=+argv[3],W=+(argv[4]||1100);
 for(var bp=a;bp<=b;bp++){var p=doc.pageAtIndex(bp);
  var r=p.boundsForBox($.kPDFDisplayBoxMediaBox),s=W/r.size.width,h=Math.round(r.size.height*s);
  var img=p.thumbnailOfSizeForBox($.NSMakeSize(W,h),$.kPDFDisplayBoxMediaBox);
  var rep=$.NSBitmapImageRep.imageRepWithData(img.TIFFRepresentation);
  var d=rep.representationUsingTypeProperties($.NSBitmapImageFileTypeJPEG,$({NSImageCompressionFactor:0.8}));
  d.writeToFileAtomically(out+'/p'+('00'+bp).slice(-3)+'.jpg',true)}
 return 'ok '+doc.pageCount}
