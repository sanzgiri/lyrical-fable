import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const presets = new Set(["mythic", "intimate", "meditative", "dramatic"]);

function run(command: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `Kokoro exited with status ${code}`));
    });
  });
}

export async function POST(request: Request) {
  if (process.env.NARRATION_PROVIDER !== "kokoro") {
    return NextResponse.json(
      { error: "Narration is available only in the local studio. The hosted version provides sample recordings." },
      { status: 501 },
    );
  }

  let data: { title?: string; body?: string; preset?: string; hos?: boolean };
  try {
    data = await request.json();
    if (!data.title?.trim() || !data.body?.trim()) throw new Error("missing fable");
  } catch {
    return NextResponse.json({ error: "A title and fable body are required." }, { status: 400 });
  }

  const python = process.env.KOKORO_PYTHON;
  if (!python) {
    return NextResponse.json(
      { error: "Set KOKORO_PYTHON to a Python environment with Kokoro installed." },
      { status: 503 },
    );
  }

  const root = path.resolve(process.cwd(), "..");
  const script = path.join(root, "scripts", "narrate.py");
  const workDir = await mkdtemp(path.join(tmpdir(), "lyrical-fable-kokoro-"));
  const source = path.join(workDir, "fable.md");
  const output = path.join(workDir, "fable.mp3");
  const preset = presets.has(data.preset || "") ? data.preset! : "mythic";

  try {
    await writeFile(source, `# ${data.title.trim()}\n\n${data.body.trim()}\n`, "utf8");
    const args = [script, source, "--output", output, "--format", "mp3", "--preset", preset, "--no-script"];
    if (data.hos) args.push("--hos");
    await run(python, args, root);
    const audio = await readFile(output);
    const filename = `${data.title.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "fable"}.mp3`;
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("local Kokoro narration failed", error);
    return NextResponse.json({ error: "Local Kokoro narration failed. Check KOKORO_PYTHON and the server log." }, { status: 502 });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
