import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProgress,safeAnswers} from '../src/state.js';
const lessons=[{id:'a',quiz:[{options:['x','y']}]}],glossary=[['term','text']];
test('import filters unknown IDs, duplicates and impossible scores',()=>{
 assert.deepEqual(normalizeProgress({done:['a','a','unknown'],flashKnown:['term','evil'],examBest:900,quizScores:{a:{total:2,correct:9}}},lessons,glossary),{done:['a'],flashKnown:['term'],examBest:100,examCount:0,quizScores:{a:{total:2,correct:2}}});
});
test('invalid imported answers cannot enter course state',()=>{assert.deepEqual(safeAnswers({answers:{'a-0':999},shown:{'a-0':true}},lessons),{answers:{},shown:{}});});
test('null imports rejected',()=>assert.throws(()=>normalizeProgress(null,lessons,glossary)));
