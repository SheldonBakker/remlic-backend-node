import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env.config.js';

let supabaseAuthClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

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

export const getSupabaseAdminClient = (): SupabaseClient => {
  supabaseAdminClient ??= createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
        },
      },
    },
  );
  return supabaseAdminClient;
};

export const supabase = getSupabaseAuthClient();

export const supabaseAdmin = getSupabaseAdminClient();
