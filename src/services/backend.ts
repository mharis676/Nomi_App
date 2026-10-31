import { createClient } from '@supabase/supabase-js';
export const isLocal = import.meta.env.VITE_DATA_MODE !== 'server';
export const isDemo = import.meta.env.VITE_DATA_MODE === 'demo';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = !isLocal && url && key ? createClient(url, key, { auth: { storage: window.sessionStorage, storageKey: 'carry-auth-session' } }) : null;
