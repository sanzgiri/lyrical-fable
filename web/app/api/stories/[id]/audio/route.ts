import { NextRequest, NextResponse } from "next/server";
import { audioBucket } from "@/lib/supabase";
import { getOwnedStory } from "@/lib/story";

export const runtime = "nodejs";

const narrationPresets = {
  mythic: { voice: "fable", speed: 0.9 },
  intimate: { voice: "nova", speed: 0.82 },
  meditative: { voice: "shimmer", speed: 0.76 },
  dramatic: { voice: "onyx", speed: 1.0 },
} as const;

async function speechChunk(input: string, voice: string, speed: number) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "tts-1",
      voice,
      speed,
      input,
      response_format: "mp3",
    }),
  });
  if (!response.ok) throw new Error(`TTS returned HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function chunks(text: string, max = 3800) {
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  const output: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > max) {
      output.push(current);
      current = "";
    }
    if (paragraph.length > max) {
      for (let i = 0; i < paragraph.length; i += max) output.push(paragraph.slice(i, i + max));
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) output.push(current);
  return output;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, story } = await getOwnedStory(id);
  if (!supabase || !story) return NextResponse.json({ error: "Story not found." }, { status: 404 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Narration is not configured. Add OPENAI_API_KEY." }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({})) as { preset?: keyof typeof narrationPresets; speed?: number };
    const preset = narrationPresets[body.preset || "mythic"] || narrationPresets.mythic;
    const voice = process.env.OPENAI_TTS_VOICE || preset.voice;
    const speed = Math.min(1.4, Math.max(0.6, Number(body.speed) || preset.speed));
    const audio = Buffer.concat(await Promise.all(chunks(`${story.title}.\n\n${story.body}`).map((chunk) => speechChunk(chunk, voice, speed))));
    const path = `${story.session_id}/${story.id}.mp3`;
    const { error: uploadError } = await supabase.storage.from(audioBucket()).upload(path, audio, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    if (uploadError) throw uploadError;
    const { error: updateError } = await supabase.from("stories").update({ audio_path: path }).eq("id", id);
    if (updateError) throw updateError;
    return NextResponse.json({ audioUrl: `/api/stories/${id}/audio` });
  } catch (error) {
    console.error("audio generation failed", error);
    return NextResponse.json({ error: "Could not generate audio." }, { status: 502 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, story } = await getOwnedStory(id);
  if (!supabase || !story?.audio_path) return NextResponse.json({ error: "Audio not found." }, { status: 404 });
  const { data, error } = await supabase.storage.from(audioBucket()).download(story.audio_path);
  if (error || !data) return NextResponse.json({ error: "Audio not found." }, { status: 404 });
  const disposition = request.nextUrl.searchParams.has("download") ? "attachment" : "inline";
  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `${disposition}; filename="${story.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.mp3"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
