// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxy = env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY
    ? {
        '/api/study': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: () => '/functions/v1/student-ai/study',
          headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY },
        },
      }
    : undefined;

  return {
    plugins: [
      tailwindcss(),
      react(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: { proxy },
  };
});