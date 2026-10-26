export const MAX_FILE=20*1024*1024;
export function normalizeAnswer(v){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ł/g,'l').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
export function makeStudy(pages){
 const cards=[];const seen=new Set();
 for(const page of pages){
  const sentences=page.text.replace(/\s+/g,' ').split(/(?<=[.!?])\s+|\n+/);
  for(const sentence of sentences){
   const text=sentence.trim();if(text.length<45||text.length>420||seen.has(text))continue;
   const words=text.match(/[\p{L}][\p{L}-]{5,}/gu)||[];if(!words.length)continue;
   const answer=words.sort((a,b)=>b.length-a.length)[0];
   seen.add(text);cards.push({id:crypto.randomUUID(),front:text.replace(answer,'[…]'),back:answer,quote:text,page:page.page,known:false});
   if(cards.length===30)break;
  }if(cards.length===30)break;
 }
 return {cards,sections:pages.filter(p=>p.text.trim()).slice(0,100).map(p=>({page:p.page,text:p.text.slice(0,12000)})),method:'extractive-v1'};
}
export function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function occursOn(event,date){
 const p=event.payload,d=dateKey(date);if(!/^\d{4}-\d{2}-\d{2}$/.test(p.date||''))return false;
 if(!p.weekly)return p.date===d;
 if(d<p.date||(p.until&&d>p.until))return false;
 return new Date(p.date+'T12:00:00').getDay()===date.getDay();
}
export function validateEvent(p){if(!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!/^\d{2}:\d{2}$/.test(p.start)||!/^\d{2}:\d{2}$/.test(p.end)||p.start>=p.end)throw Error('Podaj datę oraz koniec zajęć późniejszy niż początek.');if(p.until&&p.until<p.date)throw Error('Koniec powtarzania nie może być przed pierwszymi zajęciami.');return p;}
export function createStudentStore(client){
 let owner=null,epoch=0;
 const check=e=>{if(e!==epoch)throw Error('Konto zmieniło się. Otwórz panel ponownie.');};
 return {
  setOwner(id){owner=id;epoch++;},
  async list(table){const e=epoch;if(!owner)throw Error('Zaloguj się.');let rows=[];for(let offset=0;;offset+=500){const {data,error}=await client.from(table).select('*').eq('user_id',owner).order('created_at').range(offset,offset+499);check(e);if(error)throw error;rows.push(...data);if(data.length<500)return rows;}},
  async save(table,row){const e=epoch;if(!owner)throw Error('Zaloguj się.');const {id,revision,...fields}=row;let query;
   if(revision)query=client.from(table).update({...fields,revision:revision+1}).eq('id',id).eq('user_id',owner).eq('revision',revision);
   else query=client.from(table).insert({...fields,id:id||crypto.randomUUID(),user_id:owner});
   const {data,error}=await query.select().maybeSingle();check(e);if(error)throw error;if(!data)throw Error('Ten wpis zmienił się na innym urządzeniu. Skopiuj swoją treść i odśwież panel przed ponowną edycją.');return data;
  }
 };
}

// Studeo beta: scheduling is stored with each private card, never in shared local storage.
export function reviewCard(card,grade,now=new Date()){
 if(!['again','hard','good','easy'].includes(grade))throw Error('Wybierz ocenę powtórki.');
 const previous=Math.max(0,Number(card.review?.intervalDays)||0);
 const intervalDays=grade==='again'?0:grade==='hard'?Math.max(1,Math.round(previous*1.2)):grade==='good'?Math.max(3,Math.round(previous*2)):Math.max(7,Math.round(previous*2.5));
 return {...card,known:['good','easy'].includes(grade),review:{grade,intervalDays,dueAt:new Date(now.getTime()+(grade==='again'?600000:intervalDays*86400000)).toISOString(),lastAt:now.toISOString(),count:(Number(card.review?.count)||0)+1}};
}
export function dueCards(entries,now=new Date()){
 return entries.filter(e=>!e.archived&&e.kind==='deck').flatMap(deck=>(deck.payload.cards||[]).map((card,index)=>({deck,card,index})))
 .filter(({card})=>!card.review?.dueAt||Date.parse(card.review.dueAt)<=now.getTime())
 .sort((a,b)=>(Date.parse(a.card.review?.dueAt)||0)-(Date.parse(b.card.review?.dueAt)||0));
}
export function parseManualCards(text){
 const lines=String(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(!lines.length||lines.length>100)throw Error('Wpisz od 1 do 100 fiszek.');
 return lines.map((line,i)=>{const split=line.indexOf('|');const front=line.slice(0,split).trim(),back=line.slice(split+1).trim();if(split<1||!back||front.length>1500||back.length>1500)throw Error(`Fiszka ${i+1}: wpisz pytanie | odpowiedź (do 1500 znaków na stronę).`);return {id:crypto.randomUUID(),front,back,known:false};});
}
export function completeTask(payload,now=new Date()){
 if(!['daily','weekly'].includes(payload.repeat))return {...payload,status:'done',completedAt:now.toISOString()};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(payload.due||''))throw Error('Zadanie powtarzalne wymaga terminu.');
 const next=new Date(payload.due+'T12:00:00');next.setDate(next.getDate()+(payload.repeat==='daily'?1:7));
 return {...payload,status:'todo',completedAt:null,due:dateKey(next),completions:[...(payload.completions||[]),{due:payload.due,at:now.toISOString()}].slice(-100)};
}
