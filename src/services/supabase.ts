import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : typeof globalThis !== 'undefined' && (globalThis as any).process?.env
      ? (globalThis as any).process.env
      : {};
const supabaseUrl = env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';




export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
