import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const url = env?.VITE_SUPABASE_URL?.trim();
const anonKey = env?.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
