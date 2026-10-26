import {test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';
import {makeStudy,normalizeAnswer,occursOn,validateEvent} from '../src/student-model.js';
import {handleStudy,validateStudy} from '../worker/study.js';
test('student subjects and entries enforce owner isolation and parent ownership',async()=>{
 const db=new PGlite();const A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002';
 try{await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values('${A}'),('${B}');`);
 await db.exec(await readFile(new URL('../supabase/migrations/002_student.sql',import.meta.url),'utf8'));
 await db.exec(`create schema storage;create table storage.buckets(id text primary key,allowed_mime_types text[]);insert into storage.buckets values('student-private',array['application/pdf']);`);
 await db.exec(await readFile(new URL('../supabase/migrations/005_student_tasks.sql',import.meta.url),'utf8'));
 await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${A}',false);`);
 const s=(await db.query(`insert into student_subjects(title) values('Moje zajęcia') returning id`)).rows[0].id;
 const e=(await db.query(`insert into student_entries(subject_id,kind,title,payload) values('${s}','task','Tajne','{"text":"notatka A","status":"doing"}') returning id`)).rows[0].id;
 await db.exec(`select set_config('request.jwt.claim.sub','${B}',false)`);
 assert.equal((await db.query('select * from student_subjects')).rows.length,0);assert.equal((await db.query('select * from student_entries')).rows.length,0);
 await assert.rejects(db.query(`insert into student_subjects(user_id,title) values('${A}','Obcy')`));
 await assert.rejects(db.query(`insert into student_entries(subject_id,kind,title) values('${s}','note','Obcy')`));
 assert.equal((await db.query(`update student_entries set payload='{}' where id='${e}' returning id`)).rows.length,0);
 await db.exec(`select set_config('request.jwt.claim.sub','${A}',false)`);
 assert.equal((await db.query(`update student_entries set revision=revision+1 where id='${e}' and revision=1 returning id`)).rows.length,1);
 assert.equal((await db.query(`update student_entries set payload='{}' where id='${e}' and revision=1 returning id`)).rows.length,0);
 assert.equal((await db.query('select payload from student_entries')).rows[0].payload.text,'notatka A');
 await db.exec('reset role;set role anon;');await assert.rejects(db.query('select * from student_entries'));
 }finally{await db.close();}
});
test('generated cloze answers are supported by exact source and accent-insensitive',()=>{const pages=[{page:3,text:'Integralność danych oznacza ochronę informacji przed nieuprawnioną zmianą. Dostępność oznacza możliwość korzystania z usługi przez uprawnionych użytkowników.'}];const deck=makeStudy(pages);assert.ok(deck.cards.length);for(const c of deck.cards){assert.ok(pages[0].text.includes(c.quote));assert.ok(c.quote.includes(c.back));assert.equal(c.page,3);}assert.equal(normalizeAnswer('Poufność!'),normalizeAnswer('poufnosc'));});
test('recurring events honor first date and end date without timezone shifts',()=>{const e={payload:{date:'2026-10-12',weekly:true,until:'2026-10-26'}};assert.equal(occursOn(e,new Date('2026-10-19T12:00:00')),true);assert.equal(occursOn(e,new Date('2026-10-20T12:00:00')),false);assert.equal(occursOn(e,new Date('2026-11-02T12:00:00')),false);assert.throws(()=>validateEvent({date:'2026-10-12',start:'10:00',end:'09:00'}));});
test('AI rejects missing auth and foreign material before model call',async()=>{
 let calls=[];const mock=async(url)=>{calls.push(url);if(url.endsWith('/user'))return Response.json({id:'A'});return Response.json([{user_id:'B',payload:{pages:[]}}]);};
 const missing=await handleStudy(new Request('https://site.test/api/study',{method:'POST'}),{},mock);assert.equal(missing.status,401);assert.equal(calls.length,0);
 const foreign=await handleStudy(new Request('https://site.test/api/study',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({materialId:'00000000-0000-0000-0000-000000000001'})}),{OPENAI_API_KEY:'fake'},mock);assert.equal(foreign.status,404);assert.equal(calls.length,2);
});
test('AI rejects fabricated citations and invalid answer indices',()=>{const p=[{page:1,text:'Ta długa definicja występuje w materiale źródłowym.'}],item={page:1,quote:p[0].text};const d={sections:[{...item,title:'A',text:'B'}],cards:[{...item,front:'Pytanie',back:'Odpowiedź'}],questions:[{...item,q:'?',options:['A','B','C'],answers:[0],why:'A'}]};assert.ok(validateStudy(structuredClone(d),p));assert.throws(()=>validateStudy({...structuredClone(d),cards:[{...item,front:'x',back:'y',quote:'Tego zdania nie ma w źródle.'}]},p));d.questions[0].answers=[8];assert.throws(()=>validateStudy(d,p));});

test('Premium beta removes per-account and global daily caps but keeps authentication',async()=>{
 const db=new PGlite(),A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;insert into auth.users values('${A}'),('${B}');`);
 await db.exec(await readFile(new URL('../supabase/migrations/004_student_ai_quota.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/007_premium_beta.sql',import.meta.url),'utf8'));
 await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${A}',false);`);
 for(let i=0;i<25;i++)await db.query('select public.student_claim_ai()');
 await db.exec(`select set_config('request.jwt.claim.sub','${B}',false);select public.student_claim_ai();`);
 await assert.rejects(db.query('select * from student_ai_usage'));
 await db.exec("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(db.query('select public.student_claim_ai()'));
 await db.exec('reset role;set role anon;');await assert.rejects(db.query('select public.student_claim_ai()'));await db.exec('reset role;');
 assert.equal((await db.query(`select attempts from student_ai_usage where user_id='${A}'`)).rows[0].attempts,25);
 assert.equal((await db.query(`select attempts from student_ai_usage where user_id='${B}'`)).rows[0].attempts,1);
 }finally{await db.close();}
});
