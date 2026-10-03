import { createClient } from "@supabase/supabase-js";
import { supabaseConfig, type supabase } from "@/services/supabase";

// Public result requests must not depend on a remembered app session or its refresh.
let publicClient: typeof supabase | undefined;
export function getPublicSupabase() {
  publicClient ??= createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "kletterliga-public-results",
    },
  });
  return publicClient;
}
