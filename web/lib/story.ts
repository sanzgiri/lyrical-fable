import { getSessionId } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

export async function getOwnedStory(id: string) {
  const supabase = getSupabase();
  if (!supabase) return { supabase: null, story: null };
  const session = await getSessionId();
  const { data, error } = await supabase
    .from("stories")
    .select("id, title, body, controls, audio_path, created_at, session_id")
    .eq("id", id)
    .eq("session_id", session.id)
    .single();
  if (error) return { supabase, story: null };
  return { supabase, story: data };
}
