import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateStudy,handleStudy} from '../worker/study.js';
const deck=(quote,page=1)=>({sections:[{title:'Lekcja',text:'Treść',quote,page}],cards:[{front:'Pytanie',back:'Odpowiedź',quote,page}],questions:[{q:'Pytanie?',options:['A','B','C'],answers:[0],why:'Wyjaśnienie',quote,page}]});
test('PDF typography does not invalidate a verbatim citation',()=>{
 const source='„Komuni\u00adkacja”\u00a0oznacza\n wymianę informacji.';
 assert.ok(validateStudy(deck('"Komunikacja" oznacza wymianę informacji.'.normalize('NFD')),[{page:1,text:source}]));
});
test('changed words, numbers, accents and pages remain rejected',()=>{
 const pages=[{page:1,text:'Komunikacja nie oznacza 20 wiadomości bez treści.'}];
 for(const quote of ['Komunikacja oznacza 20 wiadomości bez treści.','Komunikacja nie oznacza 30 wiadomości bez treści.','Komunikacja nie oznacza 20 wiadomosci bez tresci.'])assert.throws(()=>validateStudy(deck(quote),pages),{code:'SOURCE_CITATION_INVALID'});
 assert.throws(()=>validateStudy(deck(pages[0].text,2),pages),{code:'SOURCE_CITATION_INVALID'});
});
test('invalid citation returns retryable 422 and never saves a deck',async()=>{
 let saved=false;
 const mock=async(url,options)=>{
  if(url.endsWith('/user'))return Response.json({id:'A'});
  if(url.includes('student_entries?'))return Response.json([{id:'00000000-0000-0000-0000-000000000001',user_id:'A',subject_id:'S',title:'Materiał',payload:{pages:[{page:1,text:'Komunikacja oznacza wymianę informacji. '.repeat(5)}]}}]);
  if(url.includes('student_claim_ai'))return Response.json(true);
  if(url.includes('api.openai.com'))return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(deck('Ten cytat nie występuje w materiale.'))}]}]});
  saved=true;throw Error('Unexpected save');
 };
 const res=await handleStudy(new Request('https://example.test/api/study',{method:'POST',headers:{Authorization:'Bearer fake'},body:JSON.stringify({materialId:'00000000-0000-0000-0000-000000000001'})}),{OPENAI_API_KEY:'fake'},mock);
 assert.equal(res.status,422);assert.equal((await res.json()).code,'SOURCE_CITATION_INVALID');assert.equal(saved,false);
});
