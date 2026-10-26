import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../src/',import.meta.url);
const prefix="import {createStudentPortal} from './student.js';\nimport {LECTURE_MULTI} from './lecture-multi.js';\nimport {SECURITY_PLUS,pickSecurityQuestions} from './security-plus.js';\nimport {createClient} from '@supabase/supabase-js';\nimport {normalizeProgress,safeAnswers} from './state.js';\nimport './course.css';\nimport './account.css';\n";
await writeFile(new URL('main.js',root),prefix+await readFile(new URL('course.js',root),'utf8')+'\n'+await readFile(new URL('account.js',root),'utf8'));
