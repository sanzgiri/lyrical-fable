import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  client ??= createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

export const audioBucket = () => process.env.SUPABASE_STORAGE_BUCKET || "story-audio";
