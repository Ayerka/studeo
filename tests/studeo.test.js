import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewCard,dueCards,parseManualCards,completeTask} from '../src/student-model.js';

test('review dates survive serializing, exclude future cards and preserve old content',()=>{
 const now=new Date('2026-10-26T10:00:00Z');
 const card={id:'old-id',front:'Pytanie',back:'Odpowiedź',quote:'Źródło',known:true};
 const good=reviewCard(card,'good',now);assert.equal(good.review.dueAt,'2026-10-29T10:00:00.000Z');assert.equal(good.id,card.id);assert.equal(good.quote,card.quote);
 const deck={id:'deck',kind:'deck',payload:{cards:[JSON.parse(JSON.stringify(good)),card]}};
 assert.deepEqual(dueCards([deck],now).map(x=>x.index),[1]);
 assert.equal(dueCards([{...deck,archived:true}],now).length,0);
 assert.equal(dueCards([deck],new Date(good.review.dueAt)).length,2);
 const again=reviewCard(good,'again',now);assert.equal(again.review.dueAt,'2026-10-26T10:10:00.000Z');assert.equal(again.known,false);assert.equal(again.review.count,2);
 assert.equal(reviewCard(good,'easy',now).review.intervalDays,8);
 assert.throws(()=>reviewCard(card,'invalid',now));
});
test('manual decks reject malformed rows and keep punctuation in answers',()=>{
 const cards=parseManualCards('CIA? | Poufność, integralność, dostępność\nSymbol? | a | b');
 assert.equal(cards.length,2);assert.notEqual(cards[0].id,cards[1].id);assert.equal(cards[1].back,'a | b');
 for(const input of ['', 'Bez separatora', 'Pytanie |', '| Odpowiedź',Array(101).fill('A | B').join('\n')])assert.throws(()=>parseManualCards(input));
});
test('recurring tasks advance one occurrence and retain documentation and files',()=>{
 const p={repeat:'weekly',due:'2026-10-26',status:'doing',workNotes:'Własna praca',attachments:[{path:'owner/file'}]},now=new Date('2026-10-26T10:00:00Z');
 const done=completeTask(p,now);assert.equal(done.due,'2026-11-02');assert.equal(done.status,'todo');assert.equal(done.workNotes,p.workNotes);assert.deepEqual(done.attachments,p.attachments);assert.deepEqual(done.completions,[{due:'2026-10-26',at:now.toISOString()}]);assert.equal(p.due,'2026-10-26');
 assert.equal(completeTask({...p,repeat:'none'},now).status,'done');assert.throws(()=>completeTask({...p,due:''},now));
});
