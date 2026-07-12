import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "About Lyrical Fable Studio and its creator, Ashutosh Sanzgiri.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="about-page">
      <div className="about-card">
        <span className="eyebrow">About</span>
        <h1>Lyrical Fable Studio</h1>
        <p>Lyrical Fable Studio is a small writing environment for retelling myths, exploring impossible premises, and giving abstract questions a concrete image to inhabit.</p>
        <p>The local studio pairs Ollama generation with blended Kokoro narration and optional Hearts of Space ambience. The public site shares examples and tools for shaping a fable.</p>
        <hr />
        <p className="creator-line">Created by <a href="https://github.com/sanzgiri" target="_blank" rel="noreferrer">Ashutosh Sanzgiri</a>.</p>
        <Link className="action" href="/">Return to the studio</Link>
      </div>
    </main>
  );
}
