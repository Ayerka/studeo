import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {landingMarkup} from '../src/landing.js';
import {mountAccountUsage} from '../src/account-usage.js';
import {LECTURE_MULTI} from '../src/lecture-multi.js';
import {SECURITY_PLUS,pickSecurityQuestions} from '../src/security-plus.js';
import {normalizeProgress,safeAnswers} from '../src/state.js';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const source=(await readFile(new URL('../src/course.js',import.meta.url),'utf8'))+'\n'+(await readFile(new URL('../src/account.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace('import.meta.env.VITE_SUPABASE_URL',"'https://test.supabase.co'").replace('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY',"'public-test-key'");
const tick=()=>new Promise(r=>setTimeout(r,20));
async function setup(){
 const dom=new JSDOM(html,{url:'https://course.example',runScripts:'outside-only',pretendToBeVisual:true});
 let callback,owner='A';const rows={},calls=[];let fail=false;
 const client={auth:{onAuthStateChange(fn){callback=fn;},async signOut(){callback('SIGNED_OUT',null);return {};},async updateUser(){return {};},async resetPasswordForEmail(){return {};},async signInWithPassword(){return {};},async signUp(){return {};}},
 from(){return {select(){return {eq(_key,id){return {async maybeSingle(){return {data:rows[id]||null};}};}};}};},
 async rpc(_name,args){calls.push({owner,...args});if(fail)return {error:{code:'NETWORK'}};if((rows[owner]?.revision||0)!==args.expected_revision)return {error:{code:'40001'}};rows[owner]={payload:structuredClone(args.new_payload),revision:args.expected_revision+1};return {data:rows[owner].revision};}};
 Object.assign(dom.window,{landingMarkup,mountAccountUsage,createClient:()=>client,LECTURE_MULTI,SECURITY_PLUS,pickSecurityQuestions,normalizeProgress,safeAnswers,structuredClone,TextEncoder,scrollTo(){},confirm:()=>true});
 dom.window.eval(source+"\nwindow.testEval=(code)=>eval(code);");
 const login=async id=>{owner=id;callback('SIGNED_IN',{user:{id,email:id+'@example.test',user_metadata:{}}});await tick();};
 await login('A');return {dom,rows,calls,login,fail:()=>{fail=true;},recover:()=>{fail=false;}};
}
test('lessons, quizzes, flashcards persist and another account starts empty',async()=>{
 const s=await setup(),w=s.dom.window,d=w.document;
 try{
 assert.equal(d.querySelectorAll('.lesson-nav').length,34);
 d.querySelector('[data-lesson="w1-start"]').click();d.getElementById('markDone').click();await tick();
 d.querySelector('[data-mini-answer]').click();await tick();
 d.querySelector('[data-mini-check]').click();await tick();
 d.querySelector('[data-page="flash"]').click();d.getElementById('flashKnow').click();await tick();
 assert.deepEqual(s.rows.A.payload.progress.done,['w1-start']);
 assert.equal(s.rows.A.payload.progress.flashKnown.length,1);
 assert.equal(Object.keys(s.rows.A.payload.quiz.answers).length,1);
 await s.login('B');assert.equal(d.getElementById('topStatus').textContent,'0% materiału za Tobą');
 d.querySelector('[data-page="flash"]').click();await tick();assert.equal(s.rows.B?.payload.progress.flashKnown.length??0,0);
 await s.login('A');assert.match(d.getElementById('topStatus').textContent,/3%/);
 }finally{s.dom.window.close();}
});
test('network failure is visible and retry persists the unsaved state',async()=>{
 const s=await setup(),d=s.dom.window.document;
 try{s.fail();d.querySelector('[data-lesson="w1-start"]').click();d.getElementById('markDone').click();await tick();assert.match(d.getElementById('syncBanner').textContent,/Zmiany czekają/);s.recover();d.getElementById('retrySync').click();await tick();assert.equal(s.rows.A.payload.progress.done[0],'w1-start');assert.equal(d.getElementById('syncBanner'),null);}finally{s.dom.window.close();}
});
test('conflicting device writes do not overwrite the newer cloud state',async()=>{
 const s=await setup(),d=s.dom.window.document;
 try{s.rows.A={revision:5,payload:{progress:{done:['w1-cia']}}};d.querySelector('[data-lesson="w1-start"]').click();d.getElementById('markDone').click();await tick();assert.match(d.getElementById('syncBanner').textContent,/innym urządzeniu/);assert.equal(s.rows.A.revision,5);d.getElementById('retrySync').click();await tick();assert.equal(d.getElementById('syncBanner'),null);assert.equal(s.rows.A.payload.progress.done[0],'w1-cia');}finally{s.dom.window.close();}
});
test('an unfinished exam resumes with its selected answer after re-login',async()=>{
 const s=await setup(),d=s.dom.window.document;
 try{d.querySelector('[data-page="exam"]').click();d.getElementById('startExam').click();d.querySelector('[data-exam-answer="1"]').click();await tick();assert.equal(s.rows.A.payload.exam.active,true);await s.login('B');await s.login('A');assert.ok(d.querySelector('[data-exam-answer="1"]').classList.contains('selected'));assert.match(d.querySelector('.exam-counter').textContent,/Pytanie 1/);}finally{s.dom.window.close();}
});
test('unconfigured preview opens course without saving',()=>{
 const dom=new JSDOM(html,{url:'http://localhost:5173',runScripts:'outside-only',pretendToBeVisual:true});
 try{Object.assign(dom.window,{landingMarkup,LECTURE_MULTI,normalizeProgress,safeAnswers,structuredClone,TextEncoder,scrollTo(){}});dom.window.eval(source.replace("'https://test.supabase.co'",'undefined').replace("'public-test-key'",'undefined'));dom.window.document.querySelector('#landing [data-auth=login]').click();dom.window.document.getElementById('previewCourse').click();assert.equal(dom.window.document.getElementById('courseApp').hidden,false);}finally{dom.window.close();}
});
test('Security+ bank has valid unique questions across five domains',()=>{
 assert.equal(SECURITY_PLUS.length,30);
 assert.equal(new Set(SECURITY_PLUS.map(q=>q.id)).size,30);
 assert.equal(new Set(SECURITY_PLUS.map(q=>q.domain)).size,5);
 for(const q of SECURITY_PLUS){assert.equal(q.options.length,4);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4);assert.ok(q.why.length>30);}
 for(const n of [10,20,30]){const picked=pickSecurityQuestions(n);assert.equal(picked.length,n);assert.equal(new Set(picked.map(q=>q.id)).size,n);}
});
test('Security+ 30-question session persists separately and resumes in order',async()=>{
 const s=await setup(),d=s.dom.window.document;
 try{
 d.querySelector('[data-page="exam"]').click();d.getElementById('examScope').value='sec30';d.getElementById('startExam').click();
 d.querySelector('[data-exam-answer="1"]').click();await tick();
 const saved=structuredClone(s.rows.A.payload.exam);
 assert.equal(saved.questions.length,30);assert.ok(saved.questions.every(q=>q.securityId));
 await s.login('B');assert.equal(s.rows.B?.payload.exam?.active??false,false);
 await s.login('A');assert.ok(d.querySelector('[data-exam-answer="1"]').classList.contains('selected'));
 assert.match(d.querySelector('.exam-counter').textContent,/30/);
 assert.deepEqual(s.rows.A.payload.exam.questions,saved.questions);
 }finally{s.dom.window.close();}
});
test('multiple selections toggle, resume, and require the exact correct set',async()=>{
 const s=await setup(),w=s.dom.window,d=w.document;
 try{
 w.testEval("examQs=[LECTURE_MULTI[0]];examIndex=0;examAnswers=[];view='exam-active';render()");
 assert.match(d.querySelector('.quiz-card').textContent,/Zaznacz wszystkie/);
 assert.equal(d.getElementById('examCheck').disabled,true);
 d.querySelector('[data-exam-answer="0"]').click();d.querySelector('[data-exam-answer="1"]').click();
 d.querySelector('[data-exam-answer="1"]').click();assert.equal(d.querySelector('[data-exam-answer="1"]').getAttribute('aria-pressed'),'false');
 d.querySelector('[data-exam-answer="1"]').click();await tick();
 await s.login('B');await s.login('A');
 assert.equal(d.querySelectorAll('.option.selected').length,2);
 assert.equal(w.testEval('isCorrect(examQs[0],examAnswers[0])'),false);
 d.querySelector('[data-exam-answer="2"]').click();
 assert.equal(w.testEval('isCorrect(examQs[0],examAnswers[0])'),true);
 d.querySelector('[data-exam-answer="3"]').click();assert.equal(w.testEval('isCorrect(examQs[0],examAnswers[0])'),false);
 d.querySelector('[data-exam-answer="3"]').click();d.getElementById('examCheck').click();
 assert.match(d.querySelector('.quiz-answer').textContent,/Poprawnie/);
 assert.equal(d.querySelectorAll('.option[disabled]').length,4);
 d.getElementById('examNext').click();await tick();assert.equal(s.rows.A.payload.progress.examBest,100);
 }finally{w.close();}
});
test('older account payload preserves progress, flashcards, history and single answers',async()=>{
 const s=await setup(),w=s.dom.window;
 try{
 const raw={version:2,progress:{done:['w1-cia'],flashKnown:[w.testEval('GLOSSARY[0][0]')],examCount:7,examBest:90,quizScores:{'w1-cia':{total:2,correct:1}}},quiz:{answers:{'w1-cia-0':1},shown:{'w1-cia-0':true}},flashIndex:4,exam:{questions:[{lesson:'w1-cia',index:0}],answers:[{answer:1,shown:true}],index:0,type:'all',active:true},history:[{score:{pct:90},at:'2026-10-01'}]};
 s.rows.A={revision:8,payload:structuredClone(raw)};await s.login('B');await s.login('A');
 const restored=JSON.parse(w.testEval('JSON.stringify(snapshot())'));
 assert.deepEqual(restored,raw);
 assert.equal(s.rows.A.revision,8);
 }finally{w.close();}
});

test('lecture 3 lessons, cards and exam scope persist with old progress',async()=>{
 const s=await setup(),w=s.dom.window,d=w.document;
 try{
  const lessons=w.testEval('LESSONS.filter(l=>l.track===3)');assert.equal(lessons.length,8);
  assert.equal(w.testEval('GLOSSARY.length'),144);
  assert.equal(new Set(w.testEval('LESSONS.map(l=>l.id)')).size,34);
  for(const l of lessons){assert.match(l.slides,/Wykład 3 · strony PDF/);assert.equal(l.quiz.length,3);for(const q of l.quiz){assert.ok(q.answer>=0&&q.answer<q.options.length);assert.ok(q.why);}}
  w.testEval("saved.done=['w1-start','w2-crypto'];goto('lesson','w3-phishing')");d.getElementById('markDone').click();await tick();
  assert.ok(s.rows.A.payload.progress.done.includes('w1-start'));assert.ok(s.rows.A.payload.progress.done.includes('w3-phishing'));
  w.testEval("examType='3';startExam();cloudSave()");await tick();assert.equal(w.testEval('examQs.length'),10);assert.ok(w.testEval("examQs.every(q=>q.lesson.startsWith('w3-'))"));
  await s.login('B');await s.login('A');assert.equal(w.testEval('examType'),'3');assert.equal(w.testEval('examQs.length'),10);
 }finally{s.dom.window.close();}
});

test('lecture 4 content and exam restore without replacing earlier progress',async()=>{
 const s=await setup(),w=s.dom.window,d=w.document;
 try{
  const lessons=w.testEval('LESSONS.filter(l=>l.track===4)');assert.equal(lessons.length,8);
  assert.equal(w.testEval('new Set(GLOSSARY.map(t=>t[0])).size'),144);
  assert.equal(w.testEval('LECTURE_MULTI.filter(q=>q.track===4).length'),8);
  for(const l of lessons){assert.match(l.slides,/Wykład 4 · strony PDF/);assert.equal(l.quiz.length,3);for(const q of l.quiz){assert.ok(q.answer>=0&&q.answer<q.options.length);assert.ok(q.why);}}
  w.testEval("saved.done=['w1-start','w3-phishing'];goto('lesson','w4-malware')");d.getElementById('markDone').click();await tick();
  assert.deepEqual([...s.rows.A.payload.progress.done].sort(),['w1-start','w3-phishing','w4-malware'].sort());
  w.testEval("examType='4';startExam();cloudSave()");await tick();
  assert.equal(w.testEval('examQs.length'),10);assert.ok(w.testEval("examQs.every(q=>q.lesson.startsWith('w4-'))"));
  await s.login('B');assert.equal(w.testEval('saved.done.length'),0);
  await s.login('A');assert.equal(w.testEval('examType'),'4');assert.equal(w.testEval('examQs.length'),10);assert.ok(w.testEval("saved.done.includes('w3-phishing')"));
 }finally{w.close();}
});

test('signed-out welcome page explains plans and routes to registration, login and reset without exposing account data',async()=>{
 const s=await setup(),w=s.dom.window,d=w.document;
 try{
  await w.testEval("authChange('SIGNED_OUT',null)");
  assert.equal(d.getElementById('landing').hidden,false);assert.equal(d.getElementById('account').hidden,true);assert.equal(d.getElementById('courseApp').hidden,true);
  assert.match(d.getElementById('landing').textContent,/100 użyć AI dziennie/);assert.match(d.getElementById('landing').textContent,/Ceny po becie nie zostały jeszcze ustalone/);
  const ids=new Set([...d.querySelectorAll('#landing [id]')].map(x=>x.id));
  for(const a of d.querySelectorAll('#landing a[href^="#"]'))assert.ok(ids.has(a.hash.slice(1)));
  d.querySelector('#landing [data-auth=register]').click();assert.equal(d.getElementById('landing').hidden,true);assert.ok(d.getElementById('displayName'));assert.match(d.getElementById('account').textContent,/Utwórz konto/);
  d.querySelector('#account [data-auth=landing]').click();assert.equal(d.getElementById('landing').hidden,false);
  d.querySelector('#landing [data-auth=login]').click();assert.ok(d.getElementById('email'));d.querySelector('#account [data-auth=reset]').click();assert.equal(d.getElementById('password'),null);assert.match(d.getElementById('account').textContent,/Wyślij link/);
 }finally{w.close();}
});
