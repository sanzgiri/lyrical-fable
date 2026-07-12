import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export type LocalStory = {
  id: string;
  title: string;
  body: string;
  controls: Record<string, unknown>;
  created_at: string;
  storage: "local";
};

function enabled() {
  return process.env.LOCAL_LIBRARY_ENABLED === "true";
}

function libraryDirectory() {
  return process.env.LOCAL_LIBRARY_DIR || path.join(homedir(), "LyricalFableLibrary");
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "fable";
}

function parseStory(id: string, source: string): LocalStory | null {
  const match = source.match(/^---\n([\s\S]*?)\n---\n+#\s+(.+?)\n\n([\s\S]*)$/);
  if (!match) return null;
  const [, metadata, heading, body] = match;
  const values = Object.fromEntries(
    metadata.split("\n").flatMap((line) => {
      const separator = line.indexOf(": ");
      if (separator < 0) return [];
      const key = line.slice(0, separator);
      try { return [[key, JSON.parse(line.slice(separator + 2))]]; } catch { return []; }
    }),
  );
  if (typeof values.title !== "string" || typeof values.created_at !== "string") return null;
  return {
    id,
    title: typeof heading === "string" ? heading : values.title,
    body: body.trim(),
    controls: typeof values.controls === "object" && values.controls ? values.controls as Record<string, unknown> : {},
    created_at: values.created_at,
    storage: "local",
  };
}

export async function saveLocalStory(title: string, body: string, controls: Record<string, unknown>): Promise<LocalStory | null> {
  if (!enabled()) return null;
  const created_at = new Date().toISOString();
  const id = `${created_at.replace(/[:.]/g, "-")}-${slugify(title)}.md`;
  const story: LocalStory = { id, title, body, controls, created_at, storage: "local" };
  const content = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `created_at: ${JSON.stringify(created_at)}`,
    `controls: ${JSON.stringify(controls)}`,
    "---",
    "",
    `# ${title}`,
    "",
    body.trim(),
    "",
  ].join("\n");
  await mkdir(libraryDirectory(), { recursive: true });
  await writeFile(path.join(libraryDirectory(), id), content, "utf8");
  return story;
}

export async function listLocalStories(): Promise<LocalStory[]> {
  if (!enabled()) return [];
  try {
    const files = (await readdir(libraryDirectory())).filter((name) => name.endsWith(".md")).sort().reverse();
    const stories = await Promise.all(files.slice(0, 50).map(async (id) => parseStory(id, await readFile(path.join(libraryDirectory(), id), "utf8"))));
    return stories.filter((story): story is LocalStory => story !== null);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export function localLibraryPath() {
  return libraryDirectory();
}
