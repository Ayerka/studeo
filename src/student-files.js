import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import workerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {selectPdfPages} from './pdf-pages.js';
GlobalWorkerOptions.workerSrc=workerURL;
export async function readMaterial(file,range=''){
 if(/\.(txt|md)$/i.test(file.name)){const text=await file.text();if(text.length>120000)throw Error('Tekst jest za długi. Podziel go na części do 120 tys. znaków.');return [{page:1,text}];}
 if(!/\.pdf$/i.test(file.name))return [];
 const task=getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});
 try{const pdf=await task.promise,numbers=selectPdfPages(range,pdf.numPages);const pages=[];let total=0;
 for(const n of numbers){const page=await pdf.getPage(n);try{const content=await page.getTextContent();const text=content.items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('');total+=text.length;if(total>120000)throw Error('Wybrane strony zawierają ponad 120 tys. znaków. Wybierz mniejszy zakres.');pages.push({page:n,text});}finally{page.cleanup();}}return pages;
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
