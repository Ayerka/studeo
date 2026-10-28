import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {landingMarkup} from '../src/landing.js';

const dom=new JSDOM(`<body><div id="landing">${landingMarkup()}</div></body>`);
const d=dom.window.document,text=d.body.textContent.replace(/\s+/g,' ');

test('landing leads with the competitive advantages from the business plan',()=>{
 assert.equal(d.querySelectorAll('h1').length,1);
 assert.match(d.querySelector('h1').textContent,/Całe studia/);
 assert.match(d.querySelector('h1').textContent,/pokazuje źródło/);
 for(const id of ['lp-advantages','lp-how','lp-compare','lp-source','lp-privacy','lp-plans','lp-faq'])assert.ok(d.getElementById(id),`missing section ${id}`);
 for(const phrase of ['Zamiast czterech aplikacji','Gotowe od pierwszego dnia','AI z Twoich materiałów','Powtórki we właściwym momencie','Po polsku','Skany też się liczą'])assert.ok(text.toLowerCase().includes(phrase.toLowerCase()),phrase);
 assert.ok(d.querySelector('#lp-top [data-auth=register]'),'primary call to action in the hero');
});

test('comparison compares kinds of tools, is complete and accessible',()=>{
 const rows=[...d.querySelectorAll('#lp-compare tbody tr')];
 assert.equal(rows.length,7);
 for(const r of rows){assert.equal(r.querySelectorAll('td').length,5);assert.ok(r.querySelector('th[scope=row]'));assert.ok(r.querySelector('td.lp-us'));for(const td of r.querySelectorAll('td'))assert.ok(td.dataset.label,'mobile label');}
 assert.equal(d.querySelectorAll('#lp-compare thead th').length,6);
 assert.ok(d.querySelector('#lp-compare caption'));
 assert.match(text,/Konkretne aplikacje różnią się możliwościami/);
 assert.doesNotMatch(d.getElementById('lp-compare').textContent,/Notion|Todoist|Quizlet|Anki|Google|USOS/,'no competitor brands');
});

test('landing makes only claims the product keeps',()=>{
 for(const banned of [/nielimitowan/i,/bez limitu AI/i,/500 MB/,/(?<!nie )gwarantuj/i,/zda(sz|ć) egzamin/i,/najlepsz/i,/\d+\s?%\s+(studentów|użytkowników)/i,/opinie|recenzj/i,/reklam[ay]\s+(w|na)\s+Studeo/i])assert.doesNotMatch(text,banned,String(banned));
 assert.match(text,/100 użyć AI dziennie/);assert.match(text,/20 GB/);assert.match(text,/5 GB/);
 assert.match(text,/Ceny po becie nie zostały jeszcze ustalone/);
 assert.match(text,/przesyłana do OpenAI/);
 assert.match(text,/AI może się pomylić/);
 assert.equal(d.querySelectorAll('#lp-source .lp-tag').length,1);assert.match(d.querySelector('#lp-source .lp-tag').textContent,/PRZYKŁADOWY WIDOK/);
});

test('all in-page links resolve and every auth button is wired by data-auth',()=>{
 const ids=new Set([...d.querySelectorAll('[id]')].map(x=>x.id));
 for(const a of d.querySelectorAll('a[href^="#"]'))assert.ok(ids.has(a.getAttribute('href').slice(1)),a.getAttribute('href'));
 for(const b of d.querySelectorAll('button'))assert.ok(['login','register'].includes(b.dataset.auth),b.textContent);
 assert.equal(d.querySelectorAll('script,iframe,img,link').length,0,'no external or inline resources');
});
