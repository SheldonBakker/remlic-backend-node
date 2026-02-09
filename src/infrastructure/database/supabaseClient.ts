import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env.config.js';

let supabaseAuthClient: SupabaseClient | null = null;

export const getSupabaseAuthClient = (): SupabaseClient => {
  supabaseAuthClient ??= createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  return supabaseAuthClient;
};

export const supabase = getSupabaseAuthClient();
