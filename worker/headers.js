// Security headers applied by the Worker to every response (Workers do not process public/_headers).
// Keep the CSP in sync with the <meta> CSP in index.html: tests/security.test.js enforces it.
// Security headers applied by the Worker to every response (Workers do not process public/_headers).
// Keep the CSP in sync with the Vite-transformed <meta> CSP in index.html.
function connectionSources(supabaseUrl){
 try{
  const url=new URL(supabaseUrl);
  const isSupabase=url.hostname.endsWith('.supabase.co')||url.hostname.endsWith('.supabase.in');
  const isLocal=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if((url.protocol!=='https:'&&!isLocal)||(url.protocol==='https:'&&!isSupabase))return '';
  const socketProtocol=url.protocol==='https:'?'wss:':'ws:';
  return `${url.origin} ${socketProtocol}//${url.host}`;
 }catch{return '';}
}
export function createCsp(supabaseUrl,includeFrameAncestors=false){
 const sources=connectionSources(supabaseUrl);
 return `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'${sources?' '+sources:''}; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'${includeFrameAncestors?"; frame-ancestors 'none'":''}`;
}
export const CSP_BASE=createCsp();
export function createSecurityHeaders(supabaseUrl){
 return {
 'Content-Security-Policy':createCsp(supabaseUrl,true),
 'Strict-Transport-Security':'max-age=31536000; includeSubDomains',
 'X-Frame-Options':'DENY',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
 'Permissions-Policy':'camera=(), geolocation=(), microphone=(self)',
 'Cross-Origin-Opener-Policy':'same-origin'
 };
}
export const SECURITY_HEADERS=createSecurityHeaders();
