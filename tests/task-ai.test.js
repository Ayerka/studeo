import {test} from 'node:test';import assert from 'node:assert/strict';
import {handleTaskHelp} from '../worker/study.js';
const id='00000000-0000-0000-0000-000000000001';
const request=()=>new Request('https://site.test/api/task-help',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({taskId:id,question:'Pomóż zaplanować zadanie.'})});
test('task AI requires identity, rejects other owners and missing server key without model costs',async()=>{
 assert.equal((await handleTaskHelp(new Request('https://site.test',{method:'POST'}),{})).status,401);
 let modelCalls=0;const fake=owner=>async url=>{if(url.includes('openai.com'))modelCalls++;if(url.endsWith('/user'))return Response.json({id:'A'});return Response.json([{id,user_id:owner,payload:{description:'Opis'}}]);};
 assert.equal((await handleTaskHelp(request(),{OPENAI_API_KEY:'test'},fake('B'))).status,404);
 assert.equal((await handleTaskHelp(request(),{},fake('A'))).status,503);assert.equal(modelCalls,0);
});
test('task AI uses saved text, saves separate private note and never overwrites task',async()=>{
 const calls=[];const fake=async(url,opts)=>{calls.push({url,opts});if(url.endsWith('/user'))return Response.json({id:'A'});if(url.includes('?id='))return Response.json([{id,user_id:'A',subject_id:'S',title:'Zadanie',revision:3,payload:{description:'Polecenie',workNotes:'Moje obserwacje',attachments:[{path:'A/file'}]}}]);if(url.includes('/rpc/'))return Response.json(null);if(url.includes('openai.com'))return Response.json({status:'completed',output:[{content:[{type:'output_text',text:'Sprawdź pierwszy krok.'}]}]});return Response.json([{id:'note'}]);};
 const r=await handleTaskHelp(request(),{OPENAI_API_KEY:'test'},fake);assert.equal(r.status,200);assert.equal((await r.json()).saved,true);
 const model=JSON.parse(calls.find(c=>c.url.includes('openai.com')).opts.body);assert.equal(model.store,false);assert.match(model.input,/Moje obserwacje/);assert.ok(!model.input.includes('A/file'));
 const save=JSON.parse(calls.at(-1).opts.body);assert.equal(save.kind,'note');assert.equal(save.user_id,'A');assert.equal(save.payload.taskId,id);assert.equal(save.payload.taskRevision,3);assert.equal(calls.filter(c=>c.opts.method==='PATCH').length,0);
});
