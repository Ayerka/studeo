const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const gb=n=>(Number(n||0)/1e9).toLocaleString('pl-PL',{minimumFractionDigits:3,maximumFractionDigits:3})+' GB';
export function fileReferences(entries,path){return entries.filter(e=>e.payload?.path===path||e.payload?.attachments?.some(a=>a.path===path));}
export function mountAccountUsage(host,client,isCurrent){
 let current=null,working=false;
 const live=()=>host.isConnected&&isCurrent();
 async function load(){
  host.textContent='Wczytuję plan i pliki…';
  try{
   const [usage,rows]=await Promise.all([client.rpc('student_account_usage'),client.from('student_entries').select('id,title,subject_id,payload,archived')]);
   if(!live())return;if(usage.error)throw usage.error;if(rows.error)throw rows.error;
   current=usage.data;const p=current.plan,l=p.limits,files=current.files||[];
   host.innerHTML=`<h2>Mój plan: ${esc(p.plan_name)}</h2><p>${p.plan_key==='free'?'Konto Basic.':'Masz Premium. W becie korzystasz bez opłat.'} Zakup subskrypcji będzie dostępny później.</p><h3>Miejsce na pliki</h3><p><strong>${gb(current.storage_bytes)} / ${gb(l.storage_bytes)}</strong> · ${files.length} plików</p><progress aria-label="Wykorzystanie miejsca" max="${l.storage_bytes}" value="${Math.min(current.storage_bytes,l.storage_bytes)}" style="width:100%"></progress><p>Archiwum także zajmuje miejsce. Przekroczenie limitu blokuje nowe pliki, ale nie usuwa istniejących. Maksymalnie 20 MB na plik; podczas przesyłania rezerwujemy 20 MB.</p>${current.reserved_bytes?`<p>Rezerwacje przesyłania: ${gb(current.reserved_bytes)}. Jeśli przerwane przesyłanie nie znika po odświeżeniu, zgłoś je administratorowi.</p>`:''}<h3>AI dzisiaj</h3><p><strong>${current.ai_used} / ${l.ai_per_day}</strong> użyć · odnowienie ${esc(new Date(current.ai_resets_at).toLocaleString('pl-PL'))}.</p><p>Jedno opracowanie, odpowiedź asystenta lub strona OCR to jedno użycie. Próby rozpoczęte przez AI też zużywają limit. Obowiązuje również wspólny limit dostępności usługi.</p><button type="button" data-usage-action="refresh">Odśwież zużycie</button><h3>Przesłane pliki</h3><p>Usunięcie pliku jest trwałe i zwalnia miejsce. Tekst źródłowy, notatki, utworzone lekcje i wyniki pozostają na koncie. Najpierw możesz pobrać kopię.</p>${files.map((f,i)=>{const refs=fileReferences(rows.data||[],f.path),first=refs[0],attachment=first?.payload?.attachments?.find(a=>a.path===f.path),name=attachment?.name||first?.payload?.fileName||f.path.split('/').pop();return `<article class="account-file"><strong>${esc(name)}</strong><p>${gb(f.size)} · ${esc(new Date(f.created_at).toLocaleDateString('pl-PL'))}</p><p>${refs.length?refs.map(r=>esc(r.title)+(r.archived?' (archiwum)':'')).join(', '):'Plik bez powiązanego wpisu'}</p><button type="button" data-usage-action="download" data-file-index="${i}">Pobierz</button> <button type="button" data-usage-action="delete" data-file-index="${i}">Usuń plik</button></article>`;}).join('')||'<p>Nie przesłano jeszcze plików.</p>'}<p role="status" class="usage-status"></p>`;
  }catch(e){if(live())host.innerHTML='<p role="alert">Nie udało się odczytać planu i plików. Odśwież profil; nie pokazujemy niepotwierdzonego zużycia.</p><button type="button" data-usage-action="refresh">Spróbuj ponownie</button>';}
 }
 host.addEventListener('click',async e=>{
  const b=e.target.closest('[data-usage-action]');if(!b||working||!live())return;
  const action=b.dataset.usageAction,f=current?.files?.[Number(b.dataset.fileIndex)];
  if(action==='delete'&&!confirm(`Trwale usunąć plik „${f?.path.split('/').pop()}”? Nie będzie można go pobrać ani oglądać. Zapisany tekst i kurs pozostaną. Pobierz kopię przed usunięciem.`))return;
  working=true;b.disabled=true;
  try{
   if(action==='refresh'){await load();return;}
   if(!f)throw Error('Nie znaleziono pliku.');
   if(action==='download'){
    const {data,error}=await client.storage.from('student-private').download(f.path);if(!live())return;if(error)throw error;
    const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=f.path.split('/').pop();a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
   }
   if(action==='delete'){
    const {error}=await client.storage.from('student-private').remove([f.path]);if(!live())return;if(error)throw error;
    const detached=await client.rpc('student_detach_file',{object_path:f.path});if(!live())return;
    await load();if(live())host.querySelector('.usage-status').textContent=detached.error?'Plik usunięty. Nie udało się odłączyć go od wpisu; odśwież dane przedmiotu.':'Plik usunięty. Miejsce zostało zwolnione; tekst i kurs zachowane.';
   }
  }catch(e){if(live()){const status=host.querySelector('.usage-status');if(status)status.textContent='Nie udało się wykonać operacji. Odśwież dane i spróbuj ponownie.';}}
  finally{working=false;if(b.isConnected)b.disabled=false;}
 });
 load();
}
