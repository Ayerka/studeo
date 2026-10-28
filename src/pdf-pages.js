// Physical PDF page numbers, kept unchanged so citations and preview agree.
export function selectPdfPages(range, count, limit=100){
 if(!Number.isSafeInteger(count)||count<1)throw Error('Nie udało się ustalić liczby stron PDF.');
 const input=String(range||'').trim().replace(/[–—]/g,'-');
 if(!input){if(count>limit)throw Error(`PDF ma ${count} stron. Wpisz strony do nauki, np. 1-50 (maksymalnie ${limit} stron naraz).`);return Array.from({length:count},(_,i)=>i+1);}
 const selected=new Set();
 for(const part of input.split(',')){
  const match=part.trim().match(/^(\d+)\s*(?:-\s*(\d+))?$/);
  if(!match)throw Error('Wpisz strony w formacie 1-50 lub 1-10, 25, 40-50.');
  const first=Number(match[1]),last=Number(match[2]||match[1]);
  if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||first<1||last>count||first>last)throw Error(`Zakres stron musi mieścić się między 1 a ${count}, od mniejszej do większej liczby.`);
  if(last-first+1>limit)throw Error(`Wybierz maksymalnie ${limit} stron naraz.`);
  for(let page=first;page<=last;page++){selected.add(page);if(selected.size>limit)throw Error(`Wybierz maksymalnie ${limit} stron naraz.`);}
 }
 return [...selected].sort((a,b)=>a-b);
}
