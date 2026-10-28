import {test} from 'node:test';import assert from 'node:assert/strict';
import {handleOcr} from '../worker/study.js';import {proxyAI} from '../worker/proxy.js';
import {applyOcrPage,ocrCandidates} from '../src/ocr-model.js';
const id='00000000-0000-0000-0000-000000000001';
const material={id,user_id:'A',revision:3,kind:'material',payload:{path:'A/scan.pdf',fileName:'scan.pdf',pages:[{page:1,text:''},{page:2,text:'Dobry tekst '.repeat(20)}]}};
const request=(body={materialId:id,page:1,image:'data:image/jpeg;base64,/9j/AAAA'})=>new Request('https://app.test/api/ocr',{method:'POST',headers:{Authorization:'Bearer fake'},body:JSON.stringify(body)});
function mock({owner='A',quota=true,completed=true,pages=material.payload.pages}={}){let aiCalls=0;return {get aiCalls(){return aiCalls},fetch:async(url,opts)=>{
 if(url.endsWith('/user'))return Response.json({id:'A'});
 if(url.includes('student_entries?'))return Response.json([{...material,user_id:owner,payload:{...material.payload,pages}}]);
 if(url.includes('student_claim_ai'))return Response.json({}, {status:quota?200:429});
 if(url.includes('api.openai.com')){aiCalls++;const body=JSON.parse(opts.body);assert.equal(body.store,false);assert.equal(body.input[0].content[1].type,'input_image');return Response.json({status:completed?'completed':'incomplete',output:[{content:[{type:'output_text',text:JSON.stringify({text:'Odczytany tekst źródłowy.',uncertain:false})}]}]});}throw Error('Unexpected request');
 }};}
test('OCR requires owner authentication, quota and inline bounded image',async()=>{
 const m=mock({owner:'B'});assert.equal((await handleOcr(request(),{OPENAI_API_KEY:'fake'},m.fetch)).status,404);assert.equal(m.aiCalls,0);
 const q=mock({quota:false});assert.equal((await handleOcr(request(),{OPENAI_API_KEY:'fake'},q.fetch)).status,429);assert.equal(q.aiCalls,0);
 const bad=mock();assert.equal((await handleOcr(request({materialId:id,page:1,image:'https://example.com/private'}),{},bad.fetch)).status,400);assert.equal(bad.aiCalls,0);
 assert.equal((await handleOcr(new Request('https://app.test',{method:'POST'}),{})).status,401);
});
test('OCR returns revision-bound transcription and rejects incomplete output',async()=>{
 const m=mock(),r=await handleOcr(request(),{OPENAI_API_KEY:'fake'},m.fetch),data=await r.json();assert.equal(r.status,200);assert.equal(data.revision,3);assert.equal(data.page,1);assert.equal(data.materialId,id);
 const out=applyOcrPage(material,1,data);assert.equal(out.payload.pages[1].text,material.payload.pages[1].text);assert.equal(material.payload.pages[0].text,'');assert.equal(out.payload.ocr.pages[1].originalText,'');assert.equal(ocrCandidates(out).length,0);assert.equal(out.payload.path,material.payload.path);
 const m2=mock({completed:false});assert.equal((await handleOcr(request(),{OPENAI_API_KEY:'fake'},m2.fetch)).status,422);
});
test('OCR resume skips processed blank pages and keeps original extracted text',()=>{
 let row=applyOcrPage(material,1,{text:'',uncertain:true});assert.equal(ocrCandidates(row).length,0);assert.equal(row.payload.ocr.pages[1].empty,true);
 row=applyOcrPage(row,1,{text:'Poprawiony tekst',uncertain:false});assert.equal(row.payload.ocr.pages[1].originalText,'');assert.equal(row.payload.pages[1].text,material.payload.pages[1].text);
 assert.throws(()=>applyOcrPage(material,3,{text:'X',uncertain:false}));
});
test('proxy allows OCR image payload without raising normal AI endpoint limits',async()=>{
 let called=0;const req=()=>request({materialId:id,page:1,image:'x'.repeat(20000)}),fetch=async()=>{called++;return Response.json({ok:true});};
 assert.equal((await proxyAI(req(),'ocr',fetch)).status,200);assert.equal(called,1);
 assert.equal((await proxyAI(req(),'study',fetch)).status,413);assert.equal(called,1);
});

test('OCR accepts a selected original page above 100 but rejects excluded pages',async()=>{
 const m=mock({pages:[{page:150,text:''}]});
 assert.equal((await handleOcr(request({materialId:id,page:150,image:'data:image/jpeg;base64,/9j/AAAA'}),{OPENAI_API_KEY:'fake'},m.fetch)).status,200);
 assert.equal((await handleOcr(request({materialId:id,page:149,image:'data:image/jpeg;base64,/9j/AAAA'}),{OPENAI_API_KEY:'fake'},m.fetch)).status,400);
 assert.equal(m.aiCalls,1);
});
