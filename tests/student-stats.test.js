import {test} from 'node:test';import assert from 'node:assert/strict';
import {studentStats,recordStudyDay,studyDate} from '../src/student-stats.js';
const now=new Date('2026-10-28T12:00:00Z'),subjects=[{id:'s',user_id:'A'},{id:'other',user_id:'B'},{id:'archived',user_id:'A',archived:true}];
const deck={id:'deck',user_id:'A',subject_id:'s',kind:'deck',payload:{cards:[{id:'c',known:true,review:{count:4,lastAt:'2026-10-27T12:00:00Z'}}],studyDays:['2026-10-26','2026-10-27']}};
test('statistics isolate owners and archived subjects, keep zero bars empty',()=>{
 const rows=[deck,{...deck,id:'foreign',user_id:'B'},{...deck,id:'arch',subject_id:'archived'},{id:'task',user_id:'A',subject_id:'s',kind:'task',payload:{status:'done',completions:[{at:now.toISOString()}]}}];
 const a=studentStats(subjects,rows,'A',{progress:{done:['w1-start','w1-start']}},now);
 assert.equal(a.reviews,4);assert.equal(a.doneLessons,1);assert.equal(a.doneTasks,1);assert.equal(a.repeated,1);assert.equal(a.streak,2);assert.equal(a.week.filter(x=>x.active).length,2);
 const b=studentStats(subjects,rows,'B',{},now);assert.equal(b.reviews,0);assert.equal(b.streak,0);
});
test('a day is recorded once on real learning, not generation or metadata edits',()=>{
 assert.equal(recordStudyDay(undefined,deck,now),deck);
 assert.equal(recordStudyDay(deck,{...deck,title:'Changed'},now).payload.studyDays.length,2);
 const reviewed={...deck,payload:{...deck.payload,cards:[{...deck.payload.cards[0],review:{count:5,lastAt:now.toISOString()}}]}};
 const saved=recordStudyDay(deck,reviewed,now);assert.deepEqual(saved.payload.studyDays,['2026-10-26','2026-10-27','2026-10-28']);assert.equal(deck.payload.studyDays.length,2);
 assert.equal(recordStudyDay(saved,{...saved,payload:{...saved.payload,lessonDone:{0:{at:now.toISOString()}}}},now).payload.studyDays.length,3);
 assert.equal(studentStats(subjects,[saved],'A',{},now).streak,3);
 assert.equal(studentStats(subjects,[saved],'A',{},new Date('2026-10-30T12:00:00Z')).streak,0);
});
test('Polish day boundaries and daylight saving do not create gaps',()=>{
 assert.equal(studyDate('2026-10-27T23:30:00Z'),'2026-10-28');
 const d={...deck,payload:{studyDays:['2026-10-24','2026-10-25','2026-10-26']}};
 assert.equal(studentStats(subjects,[d],'A',{},new Date('2026-10-26T12:00:00Z')).streak,3);
 assert.equal(studyDate('invalid'),null);
});
