import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
test('real Postgres RLS isolates two accounts and rejects stale writes',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');`);
 await db.exec(await readFile(new URL('../supabase/migrations/001_accounts.sql',import.meta.url),'utf8'));
 const A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002';
 await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${A}',false);`);
 assert.equal((await db.query(`select public.save_learning_state(0,'{"progress":{"done":["a"]}}') as rev`)).rows[0].rev,1);
 await assert.rejects(db.query(`select public.save_learning_state(0,'{}')`),e=>e.code==='40001');
 await db.exec(`select set_config('request.jwt.claim.sub','${B}',false);`);
 assert.equal((await db.query('select * from public.learning_state')).rows.length,0);
 await assert.rejects(db.query(`insert into public.learning_state(user_id) values ('${A}')`),e=>e.code==='42501');
 assert.equal((await db.query(`update public.learning_state set payload='{}' where user_id='${A}' returning *`)).rows.length,0);
 await db.query(`select public.save_learning_state(0,'{"owner":"B"}')`);
 await assert.rejects(db.query(`update public.learning_state set user_id='${A}' where user_id='${B}'`),e=>e.code==='42501');
 await assert.rejects(db.query(`delete from public.learning_state`),e=>e.code==='42501');
 await db.exec(`reset role; set role anon; select set_config('request.jwt.claim.sub','',false);`);
 await assert.rejects(db.query('select * from public.learning_state'),e=>e.code==='42501');
 await assert.rejects(db.query(`select public.save_learning_state(0,'{}')`),e=>e.code==='42501');
 await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${A}',false);`);
 assert.deepEqual((await db.query('select payload from public.learning_state')).rows[0].payload,{progress:{done:['a']}});
 }finally{await db.close();}
});
