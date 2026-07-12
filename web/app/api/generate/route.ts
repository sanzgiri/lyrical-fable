import { NextRequest, NextResponse } from "next/server";
import { buildPrompt, fallbackFable, type FableControls } from "@/lib/prompts";
import { getSupabase } from "@/lib/supabase";
import { getSessionId, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

const daily = new Map<string, { date: string; count: number }>();
const DAILY_LIMIT = 10;

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function allowed(ip: string) {
  const date = new Date().toISOString().slice(0, 10);
  const current = daily.get(ip);
  if (!current || current.date !== date) {
    daily.set(ip, { date, count: 1 });
    return true;
  }
  if (current.count >= DAILY_LIMIT) return false;
  current.count += 1;
  return true;
}

function parseModelJson(raw: string) {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const value = JSON.parse(start >= 0 && end >= start ? cleaned.slice(start, end + 1) : cleaned) as { title?: unknown; body?: unknown };
  if (typeof value.title !== "string" || typeof value.body !== "string") {
    throw new Error("model returned an invalid fable shape");
  }
  return { title: value.title.trim(), body: value.body.trim() };
}

async function generateWithOllama(controls: FableControls) {
  const baseUrl = process.env.OLLAMA_BASE_URL;
  if (!baseUrl) return null;
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || "qwen3.6:35b-a3b",
      messages: [{ role: "user", content: buildPrompt(controls) }],
      temperature: 0.9,
      max_tokens: 6000,
    }),
  });
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Ollama returned no text");
  return parseModelJson(raw);
}

async function generateWithGemini(controls: FableControls) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(controls) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 6000,
          temperature: 0.9,
        },
      }),
    },
  );
  if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}`);
  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("");
  if (!raw) throw new Error("Gemini returned no text");
  return parseModelJson(raw);
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!allowed(ip)) {
    return NextResponse.json({ error: "Daily generation limit reached. Try again tomorrow." }, { status: 429 });
  }

  let controls: FableControls;
  try {
    controls = (await request.json()) as FableControls;
    if (!controls.subject?.trim()) throw new Error("subject is required");
  } catch {
    return NextResponse.json({ error: "Please provide a subject and valid controls." }, { status: 400 });
  }

  const session = await getSessionId();
  let story: { title: string; body: string };
  let source = "gemini";
  try {
    const provider = process.env.GENERATION_PROVIDER || "gemini";
    const generated = provider === "ollama"
      ? await generateWithOllama(controls)
      : await generateWithGemini(controls);
    story = generated || fallbackFable(controls);
    if (!generated) source = "demo-fallback";
    else source = provider;
  } catch (error) {
    console.error("generation failed; using fallback", error);
    story = fallbackFable(controls);
    source = "fallback";
  }

  const supabase = getSupabase();
  let id: string | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from("stories")
      .insert({ session_id: session.id, title: story.title, body: story.body, controls })
      .select("id, title, body, controls, created_at")
      .single();
    if (error) {
      console.error("story persistence failed", error);
    } else {
      id = data.id;
    }
  }

  const response = NextResponse.json({ id, ...story, controls, source });
  if (session.isNew) setSessionCookie(response, session.id);
  return response;
}
