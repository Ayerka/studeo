import {test} from 'node:test';import assert from 'node:assert/strict';
import {coursePlan,splitCoursePages,courseSnapshotId,courseQuestions} from '../src/subject-course.js';
const source={id:'source',user_id:'a',subject_id:'subject',kind:'material',revision:1,payload:{pages:[{page:1,text:'Bezpieczeństwo informacji obejmuje ochronę poufności, integralności i dostępności. '.repeat(5)}]}};
function completed(src=source){const job=coursePlan([src],'subject').pending[0];return [{id:'snapshot',subject_id:'subject',kind:'material',payload:{pages:job.pages,courseSnapshot:{version:1,key:job.key}}},{id:'deck',subject_id:'subject',kind:'deck',payload:{sourceId:'snapshot',sections:[{title:'Lekcja',text:'Objaśnienie'}],lessonDone:{0:{at:'2026-10-26'}},questions:[{id:'q1',q:'Pytanie',answers:[0],options:['A','B','C']}]}}];}
test('course plan reuses unchanged work, versions changed sources and preserves old lessons',()=>{
 const done=completed(),rows=[source,...done];const plan=coursePlan(rows,'subject');assert.equal(plan.current.length,1);assert.equal(plan.pending.length,0);assert.equal(plan.jobs.length,1);
 const changed=coursePlan([{...source,revision:2,payload:{pages:[{page:1,text:'Zmienione źródło '.repeat(20)}]}},...done],'subject');assert.equal(changed.pending.length,1);assert.equal(changed.old.length,1);assert.ok(changed.old[0].payload.lessonDone[0]);
 assert.equal(coursePlan([{...source,archived:true},...done],'subject').current.length,0);assert.equal(coursePlan(rows,'other-subject').jobs.length,0);
 assert.equal(coursePlan([{...source,kind:'note',payload:{ai:true,text:'AI '.repeat(100)}}],'subject').jobs.length,0);
 const notes={...source,id:'note',kind:'note',payload:{text:'Moje własne notatki '.repeat(10)}};assert.equal(coursePlan([notes],'subject').jobs.length,1);
 assert.equal(coursePlan([{...source,payload:{pages:[]}}],'subject').skipped.length,1);
});
test('chunking preserves source text and page numbers without ambiguous repeated pages',()=>{
 const pages=[{page:2,text:'długie słowo '.repeat(4000)},{page:3,text:'druga strona '.repeat(2000)}];const chunks=splitCoursePages(pages);assert.ok(chunks.length>1);
 for(const chunk of chunks){assert.equal(new Set(chunk.map(p=>p.page)).size,chunk.length);const size=chunk.reduce((n,p)=>n+p.text.length,0);assert.ok(size>=100&&size<=50000);}
 for(const p of pages){const rebuilt=chunks.flat().filter(x=>x.page===p.page).map(x=>x.text).join(' ').replace(/\s+/g,' ').trim();assert.equal(rebuilt,p.text.trim());}
});
test('snapshot identity is deterministic and separated by account, subject and version',async()=>{
 const a=await courseSnapshotId('a','subject','source:1:1');assert.equal(a,await courseSnapshotId('a','subject','source:1:1'));assert.notEqual(a,await courseSnapshotId('b','subject','source:1:1'));assert.notEqual(a,await courseSnapshotId('a','other','source:1:1'));assert.notEqual(a,await courseSnapshotId('a','subject','source:2:1'));
});
test('course exam copies only current module questions and retains attribution',()=>{
 const [snapshot,deck]=completed();snapshot.payload.courseSnapshot.sourceTitle='Wykład';const plan=coursePlan([source,snapshot,deck],'subject');const questions=courseQuestions(plan,20,()=>0);assert.equal(questions.length,1);assert.equal(questions[0].sourceTitle,'Wykład');assert.equal(questions[0].moduleId,'deck');assert.throws(()=>courseQuestions(plan,100));
 const changed=coursePlan([{...source,revision:2},snapshot,deck],'subject');assert.equal(courseQuestions(changed,10).length,0);
});
