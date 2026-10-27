import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {FALLBACK_PLAN,MAX_FILE,normalizePlan,fileLimitText} from '../src/student-model.js';

const A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002';
const migration=name=>readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8');
async function setup(extra=[]){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; insert into auth.users values ('${A}'),('${B}');`);
 for(const m of ['002_student.sql','004_student_ai_quota.sql','007_premium_beta.sql','008_plans.sql',...extra])await db.exec(await migration(m));
 return db;
}
const as=(db,id)=>db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`);
const addSubject=(db,title)=>db.query(`insert into public.student_subjects(title) values ('${title}')`);

test('every account is on premium_beta by default: no subject or AI caps, same as migration 007',async()=>{
 const db=await setup();
 try{
  await as(db,A);
  const plan=(await db.query('select * from public.my_plan()')).rows[0];
  assert.equal(plan.plan_key,'premium_beta');assert.equal(plan.limits.subjects,null);assert.equal(plan.limits.ai_per_day,null);
  for(let i=0;i<8;i++)await addSubject(db,`Przedmiot ${i}`);
  for(let i=0;i<6;i++)await db.query('select public.student_claim_ai()');
  await assert.rejects(db.query('select attempts from public.student_ai_usage'),e=>e.code==='42501');
  await db.exec('reset role');
  assert.equal((await db.query(`select attempts from public.student_ai_usage where user_id='${A}'`)).rows[0].attempts,6);
 }finally{await db.close();}
});

test('plans and assignments cannot be changed from the browser; users see only their own assignment',async()=>{
 const db=await setup();
 try{
  await db.exec(`insert into public.account_plans(user_id,plan_key) values ('${A}','free'),('${B}','premium')`);
  await as(db,A);
  assert.deepEqual((await db.query('select user_id,plan_key from public.account_plans')).rows,[{user_id:A,plan_key:'free'}]);
  await assert.rejects(db.query(`insert into public.account_plans(user_id,plan_key) values ('${A}','premium')`),e=>e.code==='42501');
  await assert.rejects(db.query(`update public.account_plans set plan_key='premium'`),e=>e.code==='42501');
  await assert.rejects(db.query(`update public.plans set limits='{}'`),e=>e.code==='42501');
  await assert.rejects(db.query(`delete from public.account_plans`),e=>e.code==='42501');
  assert.equal((await db.query('select plan_key from public.my_plan()')).rows[0].plan_key,'free');
  await db.exec(`reset role; set role anon; select set_config('request.jwt.claim.sub','',false);`);
  await assert.rejects(db.query('select * from public.my_plan()'),e=>e.code==='42501');
 }finally{await db.close();}
});

test('switching to the free plan enforces the subject and daily AI caps in the database',async()=>{
 const db=await setup();
 try{
  await db.exec(`update public.plans set is_default=false where key='premium_beta'; update public.plans set is_default=true where key='free'; insert into public.account_plans(user_id,plan_key) values ('${B}','premium');`);
  await as(db,A);
  assert.equal((await db.query('select plan_key from public.my_plan()')).rows[0].plan_key,'free');
  for(let i=0;i<5;i++)await addSubject(db,`P${i}`);
  await assert.rejects(addSubject(db,'szósty'),e=>e.code==='53400');
  await db.exec('reset role');await db.exec(`update public.student_subjects set archived=true where title='P0'`);await as(db,A);
  await addSubject(db,'po archiwizacji');
  for(let i=0;i<3;i++)await db.query('select public.student_claim_ai()');
  await assert.rejects(db.query('select public.student_claim_ai()'),/Daily limit/);
  await as(db,B);
  for(let i=0;i<8;i++)await addSubject(db,`B${i}`);
  for(let i=0;i<5;i++)await db.query('select public.student_claim_ai()');
 }finally{await db.close();}
});

test('frontend plan helper falls back safely and never exceeds the 20 MB storage cap',()=>{
 assert.equal(normalizePlan(null),FALLBACK_PLAN);assert.equal(normalizePlan({plan_key:'x'}),FALLBACK_PLAN);
 const p=normalizePlan({plan_key:'premium',plan_name:'Premium',limits:{subjects:null,storage_bytes:21474836480,file_bytes:524288000,ai_per_day:null}});
 assert.equal(p.limits.file_bytes,MAX_FILE);assert.equal(p.limits.subjects,null);assert.equal(p.name,'Premium');
 const f=normalizePlan({plan_key:'free',plan_name:'Podstawowy',limits:{subjects:5,file_bytes:'bad',ai_per_day:-1}});
 assert.equal(f.limits.subjects,5);assert.equal(f.limits.file_bytes,MAX_FILE);assert.equal(f.limits.ai_per_day,null);
 assert.equal(fileLimitText(FALLBACK_PLAN),'Plik przekracza 20 MB.');
});

test('beta AI cost protection: 20 per account per day and a server-only global daily cap',async()=>{
 const db=await setup(['010_ai_limits.sql']);
 try{
  await as(db,A);
  assert.equal((await db.query('select limits from public.my_plan()')).rows[0].limits.ai_per_day,20);
  for(let i=0;i<20;i++)await db.query('select public.student_claim_ai()');
  await assert.rejects(db.query('select public.student_claim_ai()'),/Daily limit/);
  await as(db,B);await db.query('select public.student_claim_ai()');
  await assert.rejects(db.query('select * from public.app_settings'),e=>e.code==='42501');
  await assert.rejects(db.query(`update public.app_settings set value='99999'`),e=>e.code==='42501');
  await db.exec(`reset role; update public.app_settings set value='22' where key='ai_global_per_day'; delete from public.student_ai_usage; insert into public.student_ai_usage(user_id,day,attempts) values ('${A}',(now() at time zone 'UTC')::date,21);`);
  await as(db,B);await db.query('select public.student_claim_ai()');
  await assert.rejects(db.query('select public.student_claim_ai()'),/Daily limit/);
 }finally{await db.close();}
});
