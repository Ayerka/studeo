import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {SECURITY_HEADERS,CSP_BASE} from '../worker/headers.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('CSP in the Worker headers, public/_headers and index.html agree and stay strict',async()=>{
 const html=await readFile(path.join(root,'index.html'),'utf8');
 const meta=html.match(/Content-Security-Policy" content="([^"]*)"/)[1];
 assert.equal(meta,CSP_BASE,'index.html meta CSP must equal worker/headers.js base CSP');
 const file=await readFile(path.join(root,'public/_headers'),'utf8');
 const fileCsp=file.match(/Content-Security-Policy: (.*)/)[1];
 assert.equal(fileCsp,SECURITY_HEADERS['Content-Security-Policy']);
 assert.equal(file.match(/Permissions-Policy: (.*)/)[1],SECURITY_HEADERS['Permissions-Policy']);
 const csp=SECURITY_HEADERS['Content-Security-Policy'];
 assert.ok(csp.includes("frame-ancestors 'none'")&&csp.includes("object-src 'none'")&&csp.includes("script-src 'self';"));
 assert.ok(!csp.includes('*'),'no wildcard origins in CSP');
 assert.ok(!/unsafe-eval/.test(csp)&&!/script-src[^;]*unsafe-inline/.test(csp));
 assert.match(SECURITY_HEADERS['Permissions-Policy'],/microphone=\(self\)/,'voice notes need the microphone');
});

test('built Worker adds security headers to every response and does not serve _headers',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'studeo-worker-'));
 await cp(path.join(root,'worker'),path.join(dir,'worker'),{recursive:true});
 await cp(path.join(root,'.openai'),path.join(dir,'.openai'),{recursive:true});
 await mkdir(path.join(dir,'dist/client/assets'),{recursive:true});
 await writeFile(path.join(dir,'package.json'),'{"type":"module"}');
 await writeFile(path.join(dir,'dist/client/index.html'),'<!doctype html><title>x</title>');
 await writeFile(path.join(dir,'dist/client/_headers'),'/*\n  X-Test: 1\n');
 await writeFile(path.join(dir,'dist/client/assets/a.js'),'console.log(1)');
 execFileSync(process.execPath,[path.join(root,'scripts/build-worker.mjs')],{cwd:dir,stdio:'pipe'});
 const worker=(await import(pathToFileURL(path.join(dir,'dist/server/index.js')).href)).default;
 const calls=[['/'],['/assets/a.js'],['/_headers'],['/missing'],['/api/unknown'],['/api/study',{method:'POST'}]];
 for(const [p,init] of calls){
  const res=await worker.fetch(new Request('https://studeo.test'+p,init),{});
  for(const [k,v] of Object.entries(SECURITY_HEADERS))assert.equal(res.headers.get(k),v,`${p} missing ${k}`);
 }
 assert.equal((await worker.fetch(new Request('https://studeo.test/_headers'),{})).status,404);
 assert.equal((await worker.fetch(new Request('https://studeo.test/'),{})).status,200);
 assert.equal((await worker.fetch(new Request('https://studeo.test/api/study',{method:'POST'}),{})).status,401);
});
