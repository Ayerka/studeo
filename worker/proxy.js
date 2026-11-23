export async function proxyAI(request,route,config,requestFetch=fetch){
 const json=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return json('Użyj POST.',405);
 const auth=request.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return json('Zaloguj się.',401);
 if(!config?.url||!config?.publishableKey)return json('Usługa Supabase nie została skonfigurowana.',503);
 const reader=request.body?.getReader();let chunks=[],size=0;if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>(route==='ocr'?3000000:12000)){await reader.cancel();return json('Za duże żądanie.',413);}chunks.push(value);}
 const body=new Uint8Array(size);let offset=0;for(const c of chunks){body.set(c,offset);offset+=c.length;}
 try{const response=await requestFetch(config.url.replace(/\/+$/,'')+'/functions/v1/student-ai/'+route,{method:'POST',headers:{Authorization:auth,apikey:config.publishableKey,'Content-Type':'application/json'},body,signal:AbortSignal.timeout(120000)});return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}catch{return json('Usługa AI nie odpowiedziała. Spróbuj później.',502);}
}
