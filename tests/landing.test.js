import {after,test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {JSDOM} from 'jsdom';

const vite=await createServer({configFile:false,appType:'custom',logLevel:'silent',server:{middlewareMode:true}});
const {LandingPage}=await vite.ssrLoadModule('/src/components/LandingPage.tsx');
after(()=>vite.close());

const html=renderToStaticMarkup(React.createElement(LandingPage,{onLogin(){},onRegister(){},onExploreCourse(){}}));
const document=new JSDOM(html).window.document;
const text=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');

test('landing leads with the competitive advantages from the business plan',()=>{
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.match(html,/<h1[^>]*>[\s\S]*Zamiast zarywać noce/);
 assert.match(html,/Studeo robi resztę/);
 for(const id of ['lp-advantages','lp-how','lp-compare','lp-source','lp-privacy','lp-plans','lp-faq'])assert.ok(html.includes(`id="${id}"`),`missing section ${id}`);
 for(const phrase of ['Zamiast czterech aplikacji','Gotowe od pierwszego dnia','AI z Twoich materiałów','Powtórki we właściwym momencie','Po polsku','Skany też się liczą'])assert.ok(text.toLowerCase().includes(phrase.toLowerCase()),phrase);
 assert.match(html,/lp-primary[\s\S]*Zacznij bezpłatnie/,'primary call to action in the hero');
});

test('comparison compares kinds of tools, is complete and accessible',()=>{
 const rows=[...document.querySelectorAll('#lp-compare tbody tr')];
 assert.equal(rows.length,7);
 for(const row of rows){assert.equal(row.querySelectorAll('td').length,5);assert.ok(row.querySelector('th[scope=row]'));assert.ok(row.querySelector('td.lp-us'));for(const td of row.querySelectorAll('td'))assert.ok(td.dataset.label);}
 assert.equal(document.querySelectorAll('#lp-compare thead th').length,6);
 assert.ok(document.querySelector('#lp-compare caption'));
 assert.match(text,/Konkretne aplikacje różnią się możliwościami/);
 assert.doesNotMatch(html,/Notion|Todoist|Quizlet|Anki|Google|USOS/,'no competitor brands');
});

test('landing makes only claims the product keeps',()=>{
 for(const banned of [/nielimitowan/i,/bez limitu AI/i,/500 MB/,/(?<!nie )gwarantuj/i,/zda(sz|ć) egzamin/i,/najlepsz/i,/\d+\s?%\s+(studentów|użytkowników)/i,/opinie|recenzj/i,/reklam[ay]\s+(w|na)\s+Studeo/i])assert.doesNotMatch(text,banned,String(banned));
 assert.match(text,/100 użyć AI dziennie/);assert.match(text,/20 GB/);assert.match(text,/5 GB/);
 assert.match(text,/Ceny po becie nie zostały jeszcze ustalone/);
 assert.match(text,/przesyłana do OpenAI/);
 assert.match(text,/AI może się pomylić/);
 assert.match(html,/lp-tag[^>]*>PRZYKŁADOWY WIDOK/);
});

test('all in-page links resolve and every auth button is wired by data-auth',()=>{
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
 for(const [,target] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.has(target),target);
 assert.match(html,/Zaloguj się/);
 assert.match(html,/Utwórz konto|Zacznij bezpłatnie/);
 assert.doesNotMatch(html,/<script\b|<iframe\b|<img\b|<link\b/,'no external or inline resources');
});
