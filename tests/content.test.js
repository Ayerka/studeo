import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import { LESSONS, GLOSSARY } from '../src/data/courseData.ts';
const expected={"LESSONS": "2c748c035e745222e9a680bdc4d904fb6b396997401f6d7713619e3b15784b79", "GLOSSARY": "714fe8ba20dfd89332cfc425513f9a76b618d4dc32506d63bab0b27381170557"};
test('React lesson and glossary source content retains its reviewed fingerprint',()=>{
 for(const [key,data] of Object.entries({LESSONS,GLOSSARY})){
  assert.equal(createHash('sha256').update(JSON.stringify(data)).digest('hex'),expected[key]);
 }
});
