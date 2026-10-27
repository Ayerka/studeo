export const OCR_BATCH=5;
export function ocrCandidates(material){return (material.payload.pages||[]).filter(p=>p.text.trim().length<80&&!material.payload.ocr?.pages?.[p.page]);}
export function applyOcrPage(material,page,result){
 const source=material.payload.pages?.find(p=>p.page===page);if(!source)throw Error('Brak strony w materiale.');
 if(typeof result.text!=='string'||result.text.length>16000||typeof result.uncertain!=='boolean')throw Error('Niepoprawny wynik OCR.');
 const text=result.text.trim(),pages=material.payload.pages.map(p=>p.page===page?{...p,text:text||p.text}:p);
 if(pages.reduce((n,p)=>n+p.text.length,0)>120000)throw Error('Odczyt przekracza 120 tys. znaków. Podziel PDF na części.');
 return {...material,payload:{...material.payload,pages,ocr:{...material.payload.ocr,pages:{...material.payload.ocr?.pages,[page]:{at:new Date().toISOString(),uncertain:result.uncertain||!text,empty:!text,originalText:material.payload.ocr?.pages?.[page]?.originalText??source.text}}}}};
}
