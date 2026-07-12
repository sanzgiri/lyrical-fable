import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getOwnedStory } from "@/lib/story";

export const runtime = "nodejs";

function renderPdf(title: string, body: string) {
  return new Promise<Buffer>((resolve) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 72 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.font("Times-Bold").fontSize(24).fillColor("#222222").text(title, { align: "center" });
    doc.moveDown(1.5);
    doc.font("Times-Roman").fontSize(12).fillColor("#333333");
    for (const paragraph of body.split(/\n\s*\n/).filter(Boolean)) {
      doc.text(paragraph.trim(), { align: "left", lineGap: 5 });
      doc.moveDown(0.8);
    }
    doc.end();
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { story } = await getOwnedStory(id);
  if (!story) return NextResponse.json({ error: "Story not found." }, { status: 404 });
  const pdf = await renderPdf(story.title, story.body);
  const filename = `${story.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
