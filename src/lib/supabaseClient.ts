import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn("Supabase env vars missing: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

export const getSupabaseClient = () => client;

// Direct export for convenience
export const supabase = client;


