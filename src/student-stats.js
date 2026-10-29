import {coursePlan} from './subject-course.js';
const count=v=>Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):0;
export function studyDate(value){const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).format(d):null;}
const shift=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export function recordStudyDay(previous,next,now=new Date()){
 if(!previous||next.kind!=='deck')return next;
 const a=previous.payload||{},b=next.payload||{};
 const learned=Object.keys(b.lessonDone||{}).some(k=>b.lessonDone[k]&&!a.lessonDone?.[k])||(b.cards||[]).some(c=>count(c.review?.count)>count(a.cards?.find(x=>x.id===c.id)?.review?.count))||['testAnswers','practice'].some(key=>Object.keys(b[key]||{}).some(k=>JSON.stringify(b[key][k])!==JSON.stringify(a[key]?.[k])));
 if(!learned)return next;
 return {...next,payload:{...b,studyDays:[...new Set([...(a.studyDays||[]),...(b.studyDays||[]),studyDate(now)])].filter(Boolean).sort()}};
}
export function studentStats(subjects,entries,owner,builtin={},now=new Date()){
 const today=studyDate(now),ids=new Set(subjects.filter(s=>s.user_id===owner&&!s.archived).map(s=>s.id));
 const rows=entries.filter(e=>e.user_id===owner&&ids.has(e.subject_id)&&!e.archived),decks=rows.filter(e=>e.kind==='deck');
 const modules=[...ids].flatMap(id=>coursePlan(rows,id).current.map(x=>x.deck));
 const totalLessons=34+modules.reduce((n,d)=>n+(d.payload.sections||[]).length,0);
 const doneLessons=Math.min(34,new Set(builtin?.progress?.done||[]).size)+modules.reduce((n,d)=>n+(d.payload.sections||[]).filter((_,i)=>d.payload.lessonDone?.[i]).length,0);
 const cards=decks.flatMap(d=>d.payload.cards||[]),tasks=rows.filter(e=>e.kind==='task'),days=new Set();
 const add=value=>{const day=studyDate(value);if(day&&day<=today)days.add(day);};
 for(const d of decks){const p=d.payload;for(const day of p.studyDays||[])if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&day<=today)days.add(day);for(const done of Object.values(p.lessonDone||{}))if(done?.at)add(done.at);for(const c of p.cards||[])if(c.review?.lastAt)add(c.review.lastAt);for(const key of ['testAnswers','practice'])for(const a of Object.values(p[key]||{}))if(a?.at)add(a.at);for(const h of p.testHistory||[])for(const key of ['testAnswers','practice'])for(const a of Object.values(h[key]||{}))if(a?.at)add(a.at);}
 for(const exam of builtin?.history||[])if(exam?.at)add(exam.at);
 let streak=0,day=days.has(today)?today:shift(today,-1);while(days.has(day)){streak++;day=shift(day,-1);}
 return {doneLessons,totalLessons,reviews:cards.reduce((n,c)=>n+count(c.review?.count),0),known:cards.filter(c=>c.known).length,cards:cards.length,doneTasks:tasks.filter(t=>t.payload.status==='done').length,tasks:tasks.length,repeated:tasks.reduce((n,t)=>n+(t.payload.completions||[]).length,0),streak,week:Array.from({length:7},(_,i)=>{const date=shift(today,i-6);return {date,active:days.has(date)};})};
}
