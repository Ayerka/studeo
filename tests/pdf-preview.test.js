import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountPdfPreview} from '../src/pdf-preview.js';
const tick=()=>new Promise(r=>setTimeout(r,10));
test('private preview renders, navigates and releases document on close',async()=>{
 const dom=new JSDOM('<section id="host"></section>'),host=dom.window.document.querySelector('#host');
 dom.window.HTMLCanvasElement.prototype.getContext=()=>({});let destroyed=false;const rendered=[];
 const getDocument=()=>({destroy:async()=>{destroyed=true;},promise:Promise.resolve({numPages:3,getPage:async n=>({getViewport:({scale})=>({width:600*scale,height:800*scale}),render:()=>{rendered.push(n);return {promise:Promise.resolve(),cancel(){}};}})})});
 const close=mountPdfPreview(host,async()=>new Blob(['pdf']),async()=>getDocument);await tick();
 assert.match(host.textContent,/Strona 1 z 3/);host.querySelector('[data-pdf=next]').click();await tick();assert.match(host.textContent,/Strona 2 z 3/);
 const input=host.querySelector('input');input.value=99;input.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await tick();assert.equal(input.value,'3');assert.equal(host.querySelector('[data-pdf=next]').disabled,true);
 close();assert.equal(destroyed,true);assert.equal(host.children.length,0);assert.deepEqual(rendered,[1,2,3]);dom.window.close();
});
test('leaving during private download prevents stale rendering',async()=>{
 const dom=new JSDOM('<section></section>'),host=dom.window.document.querySelector('section');let resolve,loaded=false;
 const close=mountPdfPreview(host,()=>new Promise(r=>resolve=r),async()=>{loaded=true;throw Error();});close();resolve(new Blob(['pdf']));await tick();assert.equal(loaded,false);assert.equal(host.children.length,0);dom.window.close();
});
