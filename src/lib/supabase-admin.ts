import { createClient } from '@supabase/supabase-js';
import type { Client } from './supabase';
import type { Database } from './types';

/** Cliente service_role. Omite RLS: usar únicamente en código de servidor (endpoints/middleware), nunca importarlo desde islas de React. */
export function createAdminSupabase(url: string, serviceKey: string): Client {
  if (typeof window !== 'undefined') throw new Error('supabase-admin cannot be used in the browser');
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
