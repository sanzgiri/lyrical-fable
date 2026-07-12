import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getSessionId, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  const session = await getSessionId();
  const supabase = getSupabase();
  if (!supabase) {
    const response = NextResponse.json({ stories: [], configured: false });
    if (session.isNew) setSessionCookie(response, session.id);
    return response;
  }
  const { data, error } = await supabase
    .from("stories")
    .select("id, title, body, controls, audio_path, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: "Could not load stories." }, { status: 500 });
  const response = NextResponse.json({ stories: data, configured: true });
  if (session.isNew) setSessionCookie(response, session.id);
  return response;
}
