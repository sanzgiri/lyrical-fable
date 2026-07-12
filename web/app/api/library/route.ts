import { NextResponse } from "next/server";
import { listLocalStories, localLibraryPath } from "@/lib/local-library";

export const runtime = "nodejs";

export async function GET() {
  const stories = await listLocalStories();
  return NextResponse.json({ stories, enabled: process.env.LOCAL_LIBRARY_ENABLED === "true", path: localLibraryPath() });
}
