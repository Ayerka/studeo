import { defineConfig, loadEnv } from 'vite';
import { createCsp } from './worker/headers.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const csp = createCsp(env.VITE_SUPABASE_URL);

  return {
    plugins: [
      {
        name: 'supabase-csp',
        transformIndexHtml(html) {
          return html.replace(
            /(<meta http-equiv="Content-Security-Policy" content=")[^"]*(" \/>)/,
            `$1${csp}$2`,
          );
        },
      },
    ],
  };
});