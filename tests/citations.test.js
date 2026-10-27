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

test('source references hydrate original quotes and pages without model transcription',async()=>{
 const {generateStudy,sourceFragments,resolveReferences}=await import('../worker/study.js');
 const pages=[{page:12,text:'Dziennik obserwacji medialnej – omówienie zadania domowego. '.repeat(30)}];
 const fragments=sourceFragments(pages);
 assert.equal(fragments.map(f=>f.text).join(''),pages[0].text);
 for(const f of fragments){assert.ok(f.text.length<=1000);assert.equal(f.page,12);}
 assert.throws(()=>resolveReferences({sections:[{sourceRef:'made-up'}],cards:[],questions:[]},fragments),{code:'SOURCE_CITATION_INVALID'});
 const result=await generateStudy(pages,'fake',async(url,opts)=>{
  const body=JSON.parse(opts.body),input=JSON.parse(body.input),schema=body.text.format.schema;
  assert.deepEqual(schema.properties.cards.items.properties.sourceRef.enum,input.source_fragments.map(f=>f.ref));
  assert.equal(schema.properties.cards.items.properties.quote,undefined);
  const data=deck('unused');for(const item of [...data.sections,...data.cards,...data.questions]){delete item.page;delete item.quote;item.sourceRef=input.source_fragments[1].ref;}
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(data)}]}]});
 });
 assert.equal(result.sections[0].quote,fragments[1].text);assert.equal(result.sections[0].page,12);assert.equal(result.sections[0].sourceRef,undefined);
});
