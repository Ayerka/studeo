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
export function renderStudentStats(subjects,entries,owner,builtin,now=new Date()){
 const s=studentStats(subjects,entries,owner,builtin,now);
 const bar=(value,max,label)=>`<progress value="${value}" max="${Math.max(1,max)}" aria-label="${label}"></progress>`;
 return `<section class="student-card student-insights" aria-label="Twoje statystyki"><header><div><span class=student-eyebrow>KAŻDY KROK SIĘ LICZY</span><h2>Twoje statystyki</h2></div><span class=student-pill>Tylko Twoje konto</span></header><div class=student-insights-grid><article><div><span>Ukończone lekcje</span><strong>${s.doneLessons}<small> / ${s.totalLessons}</small></strong></div>${bar(s.doneLessons,s.totalLessons,'Ukończone lekcje')}<p>Aktualne kursy + „Od zera do hakera”.</p></article><article><div><span>Powtórki fiszek</span><strong>${s.reviews}</strong></div>${bar(s.known,s.cards,'Opanowane fiszki prywatnych przedmiotów')}<p>${s.known} z ${s.cards} fiszek opanowanych w Twoich przedmiotach.</p></article><article><div><span>Zadania gotowe</span><strong>${s.doneTasks}<small> / ${s.tasks}</small></strong></div>${bar(s.doneTasks,s.tasks,'Zadania gotowe')}<p>Do tego ${s.repeated} zapisanych wykonań zadań cyklicznych.</p></article><article><div><span>Seria dni nauki</span><strong>${s.streak}<small> dni</small></strong></div><div class=student-study-week aria-label="Ostatnie 7 dni nauki">${s.week.map(d=>`<span class="${d.active?'is-active':''}" title="${d.date}: ${d.active?'nauka zapisana':'brak zapisanej nauki'}" aria-label="${d.date}: ${d.active?'nauka zapisana':'brak zapisanej nauki'}">${d.active?'✓':'·'}<small>${d.date.slice(8)}</small></span>`).join('')}</div><p>Jedna lekcja, ocena fiszki lub odpowiedź w teście to krok dalej.</p></article></div><details><summary>Jak liczymy statystyki?</summary><p>Liczniki obejmują aktywne przedmioty i zachowane wyniki. Archiwizacja może je zmniejszyć. Serię liczymy z zapisanych dat nauki, według czasu w Polsce; wczorajsza seria trwa, dopóki dzisiaj masz czas na naukę. Starsze działania bez daty nie są odtwarzane. W kursie „Od zera do hakera” do serii zaliczamy zapisane ukończone testy. Godzin nauki nie pokazujemy, bo aplikacja jeszcze ich nie mierzy.</p></details></section>`;
}
