import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectPdfPages} from '../src/pdf-pages.js';
import {coursePlan} from '../src/subject-course.js';
import {ocrCandidates} from '../src/ocr-model.js';

test('PDF ranges accept a subset of a large document and preserve original numbers',()=>{
 assert.deepEqual(selectPdfPages('1–50',200),Array.from({length:50},(_,i)=>i+1));
 assert.deepEqual(selectPdfPages('150-152, 2, 151, 10—11',200),[2,10,11,150,151,152]);
 assert.deepEqual(selectPdfPages('',3),[1,2,3]);
 for(const range of ['0','201','50-1','1,,3','1.5','-5','2-','1e2','1-101','1-100,200'])assert.throws(()=>selectPdfPages(range,200));
 assert.throws(()=>selectPdfPages('',200),/200 stron/);
});

test('extraction visits only selected pages; course and OCR do not include excluded pages',async()=>{
 const code=(await readFile(new URL('../src/student-files.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace('export {getDocument};','').replaceAll('export async function','async function');
 const visited=[];let destroyed=0,cleaned=0;
 const getDocument=()=>({promise:Promise.resolve({numPages:200,async getPage(page){visited.push(page);return {async getTextContent(){return {items:[{str:page===150?'':'Materiał ze strony '+page+'. '.repeat(60)}]};},cleanup(){cleaned++;}};}}),async destroy(){destroyed++;}});
 const read=new Function('getDocument','GlobalWorkerOptions','workerURL','selectPdfPages',code+';return readMaterial;')(getDocument,{},'',selectPdfPages);
 const file={name:'wyklad.pdf',arrayBuffer:async()=>new ArrayBuffer(0)};
 const pages=await read(file,'148, 150');
 assert.deepEqual(visited,[148,150]);assert.deepEqual(pages.map(p=>p.page),[148,150]);assert.equal(cleaned,2);assert.equal(destroyed,1);
 const material={id:'source',subject_id:'subject',kind:'material',revision:1,payload:{pages}};
 assert.deepEqual(ocrCandidates(material).map(p=>p.page),[150]);
 assert.ok(coursePlan([material],'subject').pending.every(job=>job.pages.every(p=>[148,150].includes(p.page))));
 await assert.rejects(read(file,'201'),/między 1 a 200/);assert.equal(destroyed,2);assert.deepEqual(visited,[148,150]);
});
