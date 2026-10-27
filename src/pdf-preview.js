// Render private PDF bytes locally; never send documents to an external viewer.
export function mountPdfPreview(host,download,loadPdf=async()=> (await import('./student-files.js')).getDocument){
 let disposed=false,task=null,pdf=null,renderTask=null,pageNumber=1,zoom=1,version=0;
 host.innerHTML='<div class="student-actions pdf-toolbar"><button type="button" data-pdf="prev" disabled>← Poprzednia</button><label>Strona <input data-pdf="page" type="number" min="1" value="1" disabled aria-label="Numer strony PDF"></label><span data-pdf="count"></span><button type="button" data-pdf="next" disabled>Następna →</button><label>Powiększenie <select data-pdf="zoom" disabled><option value="1">Dopasuj do szerokości</option><option value="1.5">150%</option><option value="2">200%</option></select></label></div><p role="status" data-pdf="status">Wczytuję PDF…</p><div class="pdf-canvas-wrap"><canvas aria-label="Podgląd strony PDF" role="img"></canvas></div><p class="student-muted">Oryginalny dokument. Tekst dostępny w zakładce „Tekst źródłowy”; plik możesz też pobrać.</p>';
 const el=k=>host.querySelector('[data-pdf="'+k+'"]'),canvas=host.querySelector('canvas'),status=el('status');
 async function draw(){
  const own=++version;renderTask?.cancel();const previous=renderTask;renderTask=null;
  try{
   if(previous)await previous.promise.catch(()=>{});
   const page=await pdf.getPage(pageNumber);if(disposed||own!==version)return;
   const base=page.getViewport({scale:1}),width=Math.max(240,Math.min(1200,host.clientWidth||800));
   const viewport=page.getViewport({scale:width/base.width*zoom}),ratio=Math.min(2,globalThis.devicePixelRatio||1);
   canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
   canvas.setAttribute('aria-label','Strona '+pageNumber+' z '+pdf.numPages+' — PDF');
   el('page').value=pageNumber;el('count').textContent='z '+pdf.numPages;el('prev').disabled=pageNumber<=1;el('next').disabled=pageNumber>=pdf.numPages;
   status.textContent='Wczytuję stronę '+pageNumber+'…';
   renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});await renderTask.promise;
   if(!disposed&&own===version)status.textContent='Strona '+pageNumber+' z '+pdf.numPages;
  }catch(error){if(!disposed&&own===version&&error.name!=='RenderingCancelledException')status.textContent='Nie udało się wyświetlić strony. Możesz pobrać PDF lub przełączyć na tekst źródłowy.';}
 }
 const onClick=e=>{if(!pdf)return;const action=e.target.dataset.pdf;if(action==='prev'&&pageNumber>1)pageNumber--;else if(action==='next'&&pageNumber<pdf.numPages)pageNumber++;else return;void draw();};
 const onChange=e=>{if(!pdf)return;if(e.target===el('page'))pageNumber=Math.max(1,Math.min(pdf.numPages,Math.trunc(Number(e.target.value))||1));else if(e.target===el('zoom'))zoom=Number(e.target.value);else return;void draw();};
 host.addEventListener('click',onClick);host.addEventListener('change',onChange);
 void (async()=>{try{const blob=await download();if(disposed)return;const getDocument=await loadPdf();if(disposed)return;const data=new Uint8Array(await blob.arrayBuffer());if(disposed)return;task=getDocument({data,isEvalSupported:false});pdf=await task.promise;if(disposed)return;el('page').max=pdf.numPages;el('page').disabled=false;el('zoom').disabled=false;await draw();}catch{if(!disposed)status.textContent='Nie udało się otworzyć PDF. Spróbuj ponownie, pobierz plik lub wybierz tekst źródłowy.';}})();
 return ()=>{disposed=true;version++;host.removeEventListener('click',onClick);host.removeEventListener('change',onChange);renderTask?.cancel();void task?.destroy()?.catch(()=>{});host.replaceChildren();};
}
