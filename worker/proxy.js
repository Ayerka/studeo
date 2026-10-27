export async function proxyAI(request,route,requestFetch=fetch){
 const json=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return json('Użyj POST.',405);
 const auth=request.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return json('Zaloguj się.',401);
 const reader=request.body?.getReader();let chunks=[],size=0;if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>(route==='ocr'?3000000:12000)){await reader.cancel();return json('Za duże żądanie.',413);}chunks.push(value);}
 const body=new Uint8Array(size);let offset=0;for(const c of chunks){body.set(c,offset);offset+=c.length;}
 try{const response=await requestFetch('https://kioqgerkpbgntlbavtro.supabase.co/functions/v1/student-ai/'+route,{method:'POST',headers:{Authorization:auth,apikey:'sb_publishable_nQNZs5zYdlqFyje_0yzUAQ_7Rot6RVN','Content-Type':'application/json'},body,signal:AbortSignal.timeout(120000)});return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}catch{return json('Usługa AI nie odpowiedziała. Spróbuj później.',502);}
}
