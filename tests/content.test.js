import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const expected={"LESSONS": "e78e42fea1f304c8ca2003f5c364c579a61eee53e5b13260c302450689d25cff", "GLOSSARY": "e486322360d6365a64982807f48a54ac5c0ed9608968ac7e6960dd9c7b2d60a1"};
test('all lesson and glossary content is byte-identical to supplied HTML',async()=>{
 const source=await readFile(new URL('../src/course.js',import.meta.url),'utf8');
 for(const [key,hash] of Object.entries(expected)){
 const line=source.split('\n').find(l=>l.startsWith('const '+key+' = '));
 const data=line.slice(('const '+key+' = ').length,-1);
 assert.equal(createHash('sha256').update(data).digest('hex'),hash);
 }
});
