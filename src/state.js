export function normalizeProgress(raw, lessons, glossary) {
 if(!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Nieprawidłowy plik postępów.');
 const ids=new Set(lessons.map(x=>x.id)), terms=new Set(glossary.map(x=>x[0]));
 const integer=(n,max=100000)=>Number.isInteger(n)&&n>=0?Math.min(n,max):0;
 const quizScores={};
 for(const id of ids){const x=raw.quizScores?.[id];if(x)quizScores[id]={total:integer(x.total),correct:Math.min(integer(x.correct),integer(x.total))};}
 return {done:[...new Set((Array.isArray(raw.done)?raw.done:[]).filter(x=>ids.has(x)))],flashKnown:[...new Set((Array.isArray(raw.flashKnown)?raw.flashKnown:[]).filter(x=>terms.has(x)))],examBest:integer(raw.examBest,100),examCount:integer(raw.examCount),quizScores};
}
export function safeAnswers(raw, lessons){
 const answers={},shown={};
 for(const l of lessons) l.quiz.forEach((q,i)=>{const key=`${l.id}-${i}`,a=raw?.answers?.[key];if(Number.isInteger(a)&&a>=0&&a<q.options.length){answers[key]=a;shown[key]=raw?.shown?.[key]===true;}});
 return {answers,shown};
}
