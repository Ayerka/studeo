import { createClient, SupabaseClient } from '@supabase/supabase-js';

const configURL = import.meta.env.VITE_SUPABASE_URL;
const configKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isConfigured = Boolean(
  configURL &&
  configKey &&
  !configURL.includes('YOUR_PROJECT') &&
  configURL.startsWith('http')
);

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(configURL, configKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
