import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import workerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerURL;
export async function readMaterial(file){
 if(/\.(txt|md)$/i.test(file.name)){const text=await file.text();if(text.length>120000)throw Error('Tekst jest za długi. Podziel go na części do 120 tys. znaków.');return [{page:1,text}];}
 if(!/\.pdf$/i.test(file.name))return [];
 const task=getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});
 try{const pdf=await task.promise;if(pdf.numPages>100)throw Error('Podziel PDF na części do 100 stron.');const pages=[];let total=0;
 for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),content=await page.getTextContent();const text=content.items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('');total+=text.length;if(total>120000)throw Error('PDF zawiera za dużo tekstu. Podziel go na mniejsze części.');pages.push({page:n,text});page.cleanup();}return pages;
 }finally{await task.destroy();}
}

export {getDocument};

// One rasterized page at a time bounds memory usage on phones and iPads.
export async function openOcrPdf(file){
 const task=getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});
 try{const pdf=await task.promise;return {count:pdf.numPages,async image(number){
  const page=await pdf.getPage(number),base=page.getViewport({scale:1});
  const viewport=page.getViewport({scale:Math.min(2.5,2000/Math.max(base.width,base.height))});
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  try{await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'#ffffff'}).promise;
   const image=canvas.toDataURL('image/jpeg',0.85);if(image.length>2800000)throw Error('Obraz strony jest za duży do OCR.');return image;
  }finally{canvas.width=0;canvas.height=0;page.cleanup();}
 },close:()=>task.destroy()};}catch(error){await task.destroy();throw error;}
}
