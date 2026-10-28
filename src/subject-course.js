// Course sources are private student entries. No content or progress is shared between accounts.
export const COURSE_CHUNK=24000;
export function courseSources(entries,subjectId){return entries.filter(e=>e.subject_id===subjectId&&!e.archived&&!e.payload?.courseSnapshot&&((e.kind==='material')||(e.kind==='note'&&!e.payload?.ai)));}
export function sourcePages(source){return source.kind==='note'?[{page:1,text:source.payload.text||''}]:(source.payload.pages||[]).filter(p=>Number.isInteger(p.page)&&typeof p.text==='string');}
export function splitCoursePages(pages){
 const chunks=[];let current=[],size=0;
 for(const page of pages){let text=page.text.trim();while(text){const available=COURSE_CHUNK-size;if(available<100){if(current.length)chunks.push(current);current=[];size=0;continue;}
 let end=Math.min(text.length,available);if(end<text.length){const boundary=text.lastIndexOf(' ',end);if(boundary>Math.max(0,end-500))end=boundary;}
 const part=text.slice(0,end).trim();text=text.slice(end).trim();if(part){current.push({page:page.page,text:part});size+=part.length;}
 if(text||size>=COURSE_CHUNK-100){chunks.push(current);current=[];size=0;}}
 }if(current.length)chunks.push(current);
 // A tiny tail is merged into the preceding chunk; total remains below the server's 50k limit.
 if(chunks.length>1&&chunks.at(-1).reduce((n,p)=>n+p.text.length,0)<100)chunks[chunks.length-2].push(...chunks.pop());
 return chunks.map(chunk=>{const byPage=new Map();for(const p of chunk)byPage.set(p.page,(byPage.get(p.page)||'')+' '+p.text);return [...byPage].map(([page,text])=>({page,text:text.trim()}));});
}
export function coursePlan(entries,subjectId){
 const jobs=[],skipped=[];
 for(const source of courseSources(entries,subjectId)){
 const pages=sourcePages(source);if(pages.reduce((n,p)=>n+p.text.trim().length,0)<100){skipped.push(source);continue;}
 const chunks=splitCoursePages(pages);
 chunks.forEach((chunk,part)=>jobs.push({source,pages:chunk,part:part+1,parts:chunks.length,key:source.id+':'+source.revision+':'+(part+1)}));
 }
 const snapshots=entries.filter(e=>e.subject_id===subjectId&&e.payload?.courseSnapshot?.version===1);
 const modules=entries.filter(e=>e.subject_id===subjectId&&e.kind==='deck'&&!e.archived&&snapshots.some(s=>s.id===e.payload.sourceId));
 const current=[];const pending=[];
 for(const job of jobs){const snapshot=snapshots.find(s=>(s.payload.courseSnapshot.key===job.key||(job.source.payload.fileRemoved===true&&s.payload.courseSnapshot.sourceId===job.source.id&&s.payload.courseSnapshot.part===job.part))&&JSON.stringify(s.payload.pages)===JSON.stringify(job.pages));const deck=snapshot&&modules.find(d=>d.payload.sourceId===snapshot.id);if(deck)current.push({job,snapshot,deck});else pending.push({...job,snapshot});}
 const old=modules.filter(m=>!current.some(x=>x.deck.id===m.id));
 return {jobs,current,pending,old,skipped};
}
export async function courseSnapshotId(owner,subject,key){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('studeo-course-v1:'+owner+':'+subject+':'+key)));
 bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;const h=Array.from(bytes.slice(0,16),b=>b.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export function courseQuestions(plan,count=20,random=Math.random){
 if(![10,20,30].includes(count))throw Error('Wybierz 10, 20 lub 30 pytań.');
 const questions=plan.current.flatMap(({deck,snapshot})=>(deck.payload.questions||[]).map(q=>({...q,moduleId:deck.id,sourceTitle:snapshot.payload.courseSnapshot.sourceTitle})));
 const unique=[...new Map(questions.map(q=>[q.id,q])).values()];
 for(let i=unique.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[unique[i],unique[j]]=[unique[j],unique[i]];}
 return unique.slice(0,count);
}
