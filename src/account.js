import {landingMarkup} from './landing.js';
import './landing.css';
import {mountAccountUsage} from './account-usage.js';
const configURL=import.meta.env.VITE_SUPABASE_URL;
const configKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const configured=!!(configURL&&configKey&&!configURL.includes('YOUR_PROJECT'));
const client=configured?createClient(configURL,configKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
let user=null,revision=0,lastSnapshot='',dirty=false,saving=false,conflict=false,ready=false,generation=0,authMode='login',recovering=false;
const app=$('courseApp'),account=$('account');
const landing=document.createElement('div');landing.id='landing';landing.hidden=true;landing.innerHTML=landingMarkup();document.body.prepend(landing);
const studentPortal=typeof createStudentPortal==='function'&&client?createStudentPortal(client,{exportCourse:()=>snapshot(),openCourse:()=>{app.hidden=false;account.hidden=true;render();},openProfile:()=>showAccount('profile'),logout:async()=>{await cloudSave();if(dirty)throw Error('Najpierw zapisz oczekujące zmiany kursu.');const {error}=await client.auth.signOut();if(error)throw error;clearAccount();showAccount();}}):null;
function snapshot(){return {version:2,progress:saved,quiz:{answers:quizAnswers,shown:quizShown},flashIndex,exam:{questions:examQs.map(q=>q.id?(q.id.startsWith('lecture-multi-')?{lectureId:q.id}:{securityId:q.id}):{lesson:q.lesson,index:LESSONS.find(l=>l.id===q.lesson)?.quiz.findIndex(x=>x.q===q.q)}),answers:examAnswers,index:examIndex,type:examType,active:view==='exam-active'},history:examHistory};}
let examHistory=[];
function restore(raw={}){
 saved=normalizeProgress(raw.progress||{},LESSONS,GLOSSARY);
 const q=safeAnswers(raw.quiz,LESSONS);quizAnswers=q.answers;quizShown=q.shown;
 flashIndex=Number.isInteger(raw.flashIndex)?Math.max(0,Math.min(raw.flashIndex,GLOSSARY.length-1)):0;flashReveal=false;
 examQs=[];examAnswers=[];examIndex=0;examType='all';
 const ex=raw.exam;
 if(ex&&Array.isArray(ex.questions)&&ex.questions.length<=30){
  examQs=ex.questions.map(r=>{if(r.lectureId)return LECTURE_MULTI.find(q=>q.id===r.lectureId)||null;if(r.securityId)return SECURITY_PLUS.find(q=>q.id===r.securityId)||null;const l=LESSONS.find(x=>x.id===r.lesson),q=l?.quiz[r.index];return q?{...q,lesson:l.id,lessonTitle:l.title}:null;}).filter(Boolean);
  examAnswers=examQs.map((q,i)=>{const a=ex.answers?.[i];if(q.answers&&Array.isArray(a?.answer)&&a.answer.every(n=>Number.isInteger(n)&&n>=0&&n<q.options.length))return {answer:[...new Set(a.answer)],shown:a.shown===true};return Number.isInteger(a?.answer)&&a.answer>=0&&a.answer<q.options.length?{answer:a.answer,shown:a.shown===true}:null;});
  examIndex=Number.isInteger(ex.index)?Math.max(0,Math.min(ex.index,examQs.length-1)):0;
  examType=['all','1','2','3','4','sec10','sec20','sec30'].includes(ex.type)?ex.type:'all';
  if(ex.active&&examQs.length)view='exam-active';
 }
 examHistory=Array.isArray(raw.history)?raw.history.slice(-100):[];
 query='';$('globalSearch').value='';lessonId=null;window.latestScore=null;
}
function status(text){$('syncStatus').textContent=text;}
function message(text){const el=$('accountMessage');if(el)el.textContent=text;}
function showAccount(mode='landing',note=''){
 authMode=mode;app.hidden=true;account.hidden=mode==='landing';landing.hidden=mode!=='landing';studentPortal?.hide();
 if(mode==='landing'){window.scrollTo(0,0);return;}
 const profile=mode==='profile', reset=mode==='reset',change=mode==='change',register=mode==='register';
 account.innerHTML=`${!profile?'<button class="ghost-btn" data-auth="landing">← O Studeo</button>':''}<div class="brand">✦ STUDEO · BETA</div><h1>${profile?'Twoja przestrzeń nauki':reset?'Odzyskaj dostęp':change?'Ustaw nowe hasło':register?'Zacznij swoją naukę':'Dobrze Cię widzieć.'}</h1><p>${profile?'Twoje postępy są przypisane do Twojego konta.': 'Twoje studia w jednym miejscu: przedmioty, notatki, zadania i powtórki. Bezpłatne Premium w becie dla każdego, bez karty płatniczej.'}</p>
 ${!configured?'<p class="message">Podgląd projektu. Logowanie będzie dostępne po podłączeniu bazy Supabase.</p><button class="primary-btn" id="previewCourse">Obejrzyj kurs</button>':`<form id="accountForm">
 ${profile?`<p>Zalogowana jako: <strong>${h(user?.email)}</strong></p>`:''}
 ${register||profile?`<label for="displayName">Jak mamy Cię nazywać?</label><input id="displayName" name="name" autocomplete="nickname" maxlength="60" value="${h(profile?user?.user_metadata?.display_name||'':'')}" />`:''}
 ${!profile&&!change?'<label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="254" />':''}
 ${!profile&&!reset?`<label for="password">Hasło${register||change?' (minimum 12 znaków)':''}</label><input id="password" name="password" type="password" autocomplete="${register||change?'new-password':'current-password'}" required minlength="${register||change?12:1}" maxlength="128" />`:''}
 <button class="primary-btn" type="submit">${profile?'Zapisz imię':reset?'Wyślij link':change?'Zapisz nowe hasło':register?'Utwórz konto':'Zaloguj się'}</button></form>
 ${profile?'<button class="ghost-btn" id="backCourse">Wróć do nauki</button><button class="ghost-btn" id="logout">Wyloguj się</button><button class="ghost-btn" id="passwordReset">Zmień hasło przez e-mail</button><hr><section id="accountUsage"></section><hr><h2>Przenieś stare postępy</h2><p>W starej aplikacji kliknij „Eksportuj postępy”, a tutaj wybierz pobrany plik JSON. Import zastąpi postępy na tym koncie po potwierdzeniu.</p><label for="importFile">Plik z postępami</label><input id="importFile" type="file" accept="application/json,.json"><button class="ghost-btn" id="downloadAccount">Pobierz kopię danych</button>':!change?`<button class="ghost-btn" data-auth="${register||reset?'login':'register'}">${register||reset?'Mam konto — zaloguj się':'Utwórz konto'}</button>${!reset?'<button class="ghost-btn" data-auth="reset">Nie pamiętam hasła</button>':''}`:'<button class="ghost-btn" id="logout">Wyloguj się</button>'}`}
 <p id="accountMessage" class="message" role="status">${h(note)}</p><small>Hasła obsługuje Supabase Auth. Aplikacja nie zapisuje haseł lokalnie.</small>`;
 account.querySelector('input')?.focus();
 if(profile&&client){const owner=user?.id,gen=generation;mountAccountUsage(account.querySelector('#accountUsage'),client,()=>user?.id===owner&&generation===gen&&authMode==='profile');}
}
function banner(text){
 let b=$('syncBanner');if(!b){b=document.createElement('div');b.id='syncBanner';b.className='sync-banner';b.setAttribute('role','alert');document.body.append(b);}
 b.innerHTML=`<div>${h(text)}</div><button class="ghost-btn" id="retrySync">${conflict?'Wczytaj zapis z chmury':'Ponów zapis'}</button><button class="ghost-btn" id="backupUnsaved">Pobierz kopię moich zmian</button>`;
}
async function cloudSave(){
 if(!user||!ready||conflict)return;
 const current=JSON.stringify(snapshot());if(current===lastSnapshot&&!dirty)return;
 dirty=true;status('Zapisywanie…');if(saving)return;
 saving=true;const epoch=generation,owner=user.id,body=JSON.parse(current);
 try{
 const {data,error}=await client.rpc('save_learning_state',{expected_revision:revision,new_payload:body});
 if(epoch!==generation||owner!==user?.id)return;
 if(error)throw error;
 revision=Number(data);lastSnapshot=current;dirty=JSON.stringify(snapshot())!==current;status(dirty?'Zapisywanie…':'✓ Zapisano na Twoim koncie');$('syncBanner')?.remove();
 }catch(e){if(epoch!==generation)return;dirty=true;conflict=e.code==='40001';status(conflict?'Zmiany na innym urządzeniu':'Nie zapisano — sprawdź połączenie');banner(conflict?'Na innym urządzeniu zapisano nowsze postępy. Pobierz kopię swoich zmian przed wczytaniem chmury.':'Zmiany czekają w tej karcie. Pozostaw ją otwartą i ponów zapis po odzyskaniu połączenia.');}
 finally{if(epoch===generation){saving=false;if(dirty&&!conflict&&lastSnapshot===current)queueMicrotask(cloudSave);}}
}
async function loadCloud(){
 if(!user)return;const epoch=generation,id=user.id;
 const {data,error}=await client.from('learning_state').select('payload,revision').eq('user_id',id).maybeSingle();
 if(epoch!==generation||id!==user?.id)return;
 if(error)throw error;
 view='home';restore(data?.payload||{});revision=Number(data?.revision||0);lastSnapshot=JSON.stringify(snapshot());dirty=false;conflict=false;ready=true;render();status('✓ Zsynchronizowano z kontem');$('syncBanner')?.remove();
}
function clearAccount(){studentPortal?.clear();generation++;ready=false;user=null;dirty=false;saving=false;conflict=false;revision=0;view='home';restore();lastSnapshot='';$('content').replaceChildren();$('syncBanner')?.remove();window.speechSynthesis?.cancel();}
async function authChange(event,session){
 if(event==='PASSWORD_RECOVERY'){recovering=true;user=session?.user;showAccount('change');return;}
 if(!session){recovering=false;clearAccount();showAccount();return;}
 if(user?.id===session.user.id&&ready){user=session.user;return;}
 clearAccount();user=session.user;
 if(recovering){showAccount('change');return;}
 showAccount('login','Wczytuję Twoje postępy…');
 try{await loadCloud();if(user&&ready){account.hidden=true;app.hidden=!!studentPortal;if(studentPortal)await studentPortal.login(user);if(new URLSearchParams(location.search).get('welcome')==='1')showAccount('landing');}}catch{showAccount('login','Nie udało się pobrać postępów. Sprawdź połączenie i konfigurację bazy, następnie odśwież stronę.');}
}
async function submitAccount(e){
 e.preventDefault();const form=e.target,button=form.querySelector('button');button.disabled=true;message('Chwileczkę…');
 const fd=new FormData(form),email=String(fd.get('email')||''),password=String(fd.get('password')||'');
 try{
 let result;
 if(authMode==='login')result=await client.auth.signInWithPassword({email,password});
 if(authMode==='register')result=await client.auth.signUp({email,password,options:{data:{display_name:String(fd.get('name')||'')},emailRedirectTo:location.origin}});
 if(authMode==='reset')result=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/?recovery=1'});
 if(authMode==='profile')result=await client.auth.updateUser({data:{display_name:String(fd.get('name')||'')}});
 if(authMode==='change')result=await client.auth.updateUser({password});
 if(result?.error)throw result.error;
 if(authMode==='register')message('Sprawdź pocztę — jeśli rejestracja wymaga potwierdzenia, znajdziesz tam link aktywacyjny.');
 if(authMode==='reset')message('Jeśli konto istnieje, otrzymasz wiadomość z linkiem. Sprawdź też spam.');
 if(authMode==='profile')message('Imię zapisane.');
 if(authMode==='change'){recovering=false;history.replaceState({},'',location.pathname);await client.auth.signOut();showAccount('login','Hasło zmienione. Zaloguj się ponownie.');}
 }catch(e){message(e.status===429?'Zbyt wiele prób. Poczekaj chwilę.':'Nie udało się wykonać operacji. Sprawdź dane, potwierdzenie adresu e-mail i połączenie.');}
 finally{form.querySelector('[name=password]')&&(form.querySelector('[name=password]').value='');button.disabled=false;}
}
function downloadSnapshot(){const blob=new Blob([JSON.stringify({app:'Cyber od zera',version:2,state:snapshot()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cyber-kopia-konta.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
document.addEventListener('submit',e=>{if(e.target.id==='accountForm')submitAccount(e);});
document.addEventListener('click',async e=>{
 const t=e.target.closest('button');if(!t)return;
 if(t.dataset.auth){if(['login','register'].includes(t.dataset.auth)&&user&&ready){landing.hidden=true;account.hidden=true;app.hidden=!!studentPortal;studentPortal?.show();history.replaceState({},'',location.pathname);return;}if(t.dataset.auth!=='landing')history.replaceState({},'',location.pathname);showAccount(t.dataset.auth);window.scrollTo(0,0);return;}
 if(t.id==='previewCourse'){account.hidden=true;app.hidden=false;render();status('Podgląd — postępy nie są zapisywane');return;}
 if(t.id==='profileButton'){showAccount(configured?'profile':'login');return;}
 if(t.id==='backCourse'){account.hidden=true;app.hidden=!!studentPortal;if(studentPortal&&user)await studentPortal.login(user);return;}
 if(t.id==='studentHome'){await cloudSave();if(dirty)return;app.hidden=true;studentPortal?.show();return;}
 if(t.id==='logout'){
  await cloudSave();if(dirty&&!confirm('Masz niezapisane zmiany. Wylogować się i je odrzucić?'))return;
  const {error}=await client.auth.signOut();if(error){message('Nie udało się wylogować. Spróbuj ponownie.');return;}
  clearAccount();showAccount();return;
 }
 if(t.id==='passwordReset'){const {error}=await client.auth.resetPasswordForEmail(user.email,{redirectTo:location.origin+'/?recovery=1'});message(error?'Nie udało się wysłać wiadomości.':'Wysłano link zmiany hasła.');return;}
 if(t.id==='downloadAccount'||t.id==='backupUnsaved'){downloadSnapshot();return;}
 if(t.id==='retrySync'){
  if(conflict){if(!confirm('Wczytać chmurę i odrzucić niezapisane zmiany z tej karty? Najpierw możesz pobrać kopię.'))return;try{await loadCloud();}catch{banner('Nie udało się pobrać zapisu. Spróbuj ponownie.');}}
  else await cloudSave();return;
 }
 if(e.composedPath().includes(app)){
  if(t.id==='examNext'&&view==='exam-done'){examHistory.push({at:new Date().toISOString(),score:window.latestScore,questions:snapshot().exam.questions,answers:structuredClone(examAnswers)});examHistory=examHistory.slice(-100);}
  queueMicrotask(cloudSave);
 }
});
document.addEventListener('change',async e=>{
 if(e.target.id!=='importFile'||!user||!ready)return;
 const file=e.target.files[0];if(!file)return;
 try{
 if(file.size>524288)throw Error('Plik jest za duży (maksymalnie 512 KB).');
 const data=JSON.parse(await file.text());if(data.app!=='Cyber od zera')throw Error('To nie jest eksport Cyber od zera.');
 const progress=normalizeProgress(data.state?.progress||data.progress,LESSONS,GLOSSARY);
 if(!confirm(`Zastąpić postępy konta ${user.email}? Import zawiera ${progress.done.length} ukończonych lekcji.`))return;
 view='home';restore(data.state?{...data.state,progress}:{progress});render();await cloudSave();message(dirty?'Import czeka na zapis. Sprawdź komunikat synchronizacji.':'Postępy przeniesione.');
 }catch(err){message(err.message);}finally{e.target.value='';}
});
// Capture keyboard-driven review too. Save complete answers, not only score totals.
document.addEventListener('keydown',()=>queueMicrotask(cloudSave));
window.addEventListener('beforeunload',e=>{if(dirty||saving){e.preventDefault();e.returnValue='';}});
window.addEventListener('online',()=>cloudSave());
async function syncClean(){
 if(!user||!ready||saving||dirty||conflict||!account.hidden||document.hidden)return;
 const epoch=generation,before=JSON.stringify(snapshot());
 const {data,error}=await client.from('learning_state').select('payload,revision').eq('user_id',user.id).maybeSingle();
 if(error||epoch!==generation||dirty||saving||JSON.stringify(snapshot())!==before)return;
 if(data&&Number(data.revision)!==revision){view='home';restore(data.payload);revision=Number(data.revision);lastSnapshot=JSON.stringify(snapshot());render();status('✓ Pobrano zmiany z drugiego urządzenia');}
}
window.addEventListener('focus',()=>syncClean());setInterval(()=>syncClean(),15000);
showAccount();
if(client){
 recovering=new URLSearchParams(location.search).get('recovery')==='1';
 client.auth.onAuthStateChange((event,session)=>{setTimeout(()=>authChange(event,session),0);});
}
