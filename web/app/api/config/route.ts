import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    localNarration: process.env.NARRATION_PROVIDER === "kokoro",
  });
}
