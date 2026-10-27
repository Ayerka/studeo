// Security headers applied by the Worker to every response (Workers do not process public/_headers).
// Keep the CSP in sync with the <meta> CSP in index.html: tests/security.test.js enforces it.
const SUPABASE_ORIGIN='https://kioqgerkpbgntlbavtro.supabase.co';
export const CSP_BASE=`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ${SUPABASE_ORIGIN} wss://kioqgerkpbgntlbavtro.supabase.co; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'`;
export const SECURITY_HEADERS={
 'Content-Security-Policy':CSP_BASE+"; frame-ancestors 'none'",
 'Strict-Transport-Security':'max-age=31536000; includeSubDomains',
 'X-Frame-Options':'DENY',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
 'Permissions-Policy':'camera=(), geolocation=(), microphone=(self)',
 'Cross-Origin-Opener-Policy':'same-origin'
};
