import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Lazy initializer for Supabase client.
 * Returns null if Supabase environment variables are not set,
 * allowing the application to run smoothly in a fallback simulator.
 */
export function getSupabase() {
  if (!supabaseClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    } catch (error) {
      console.error('Supabase Initialization Error:', error);
      return null;
    }
  }
  return supabaseClient;
}
