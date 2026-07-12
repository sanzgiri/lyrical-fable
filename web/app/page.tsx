"use client";

import { FormEvent, useEffect, useState } from "react";

type Controls = {
  subject: string;
  fidelity: "free" | "aware" | "research";
  length: "short" | "standard" | "long" | "epic";
  pov: "first" | "third";
  style: string;
  tone: string;
  form: string;
  theme: string;
  ending: string;
  custom: string;
};

type Story = { id: string | null; title: string; body: string; controls: Controls; created_at?: string; source?: string; storage?: "local" | "cloud" | null; audio_path?: string | null };

const initial: Controls = {
  subject: "",
  fidelity: "aware",
  length: "standard",
  pov: "first",
  style: "spare-mythic",
  tone: "luminous",
  form: "linear-moment",
  theme: "",
  ending: "transformed-image",
  custom: "",
};

const styles = [
  ["spare-mythic", "Spare mythic — Mason · Calasso"],
  ["playful-labyrinth", "Playful labyrinth — Calvino · Borges"],
  ["speculative-wonder", "Speculative wonder — Lightman · Chiang"],
  ["magical-exuberance", "Magical exuberance — Rushdie"],
  ["philosophical-irony", "Philosophical irony — Kundera"],
  ["custom", "Custom blend or direction"],
];

const samples = [
  { title: "The Stone Remembers", note: "Mythic blend · Hearts of Space", text: "A Sisyphus excerpt about a stone that holds every hand in memory.", audio: "/samples/sisyphus.mp3" },
  { title: "Ada’s Engine", note: "Intimate blend · dry narration", text: "An Ada Lovelace excerpt about a machine becoming a verb.", audio: "/samples/ada-lovelace.mp3" },
];

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="chip">{children}</span>;
}

export default function Home() {
  const [controls, setControls] = useState(initial);
  const [story, setStory] = useState<Story | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [localNarration, setLocalNarration] = useState(false);
  const [localLibrary, setLocalLibrary] = useState(false);
  const [libraryPath, setLibraryPath] = useState("");
  const [narrationPreset, setNarrationPreset] = useState("mythic");
  const [hos, setHos] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stories")
      .then((response) => response.json())
      .then((data) => setStories(data.stories || []))
      .catch(() => undefined);
    fetch("/api/config")
      .then((response) => response.json())
      .then((data) => {
        setLocalNarration(Boolean(data.localNarration));
        setLocalLibrary(Boolean(data.localLibrary));
        if (data.localLibrary) {
          fetch("/api/library")
            .then((response) => response.json())
            .then((library) => { setStories(library.stories || []); setLibraryPath(library.path || ""); })
            .catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }, []);

  function update<K extends keyof Controls>(key: K, value: Controls[K]) {
    setControls((current) => ({ ...current, [key]: value }));
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!controls.subject.trim()) {
      setError("Give the fable a character or subject first.");
      return;
    }
    setLoading(true);
    setError("");
    setAudioUrl(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(controls),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed.");
      setStory(data);
      setStories((current) => [data, ...current.filter((item) => item.id !== data.id)].slice(0, 20));
      if (data.source !== "gemini") setError("Demo fallback used. Add GEMINI_API_KEY for live generation.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function narrate() {
    if (!story) return;
    if (!localNarration) {
      setError("Narration is available in the local studio only. The hosted version offers sample recordings.");
      return;
    }
    setNarrating(true);
    setError("");
    try {
      const response = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: story.title, body: story.body, preset: narrationPreset, hos }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Narration failed.");
      }
      setAudioUrl(URL.createObjectURL(await response.blob()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Narration failed.");
    } finally {
      setNarrating(false);
    }
  }

  function chooseStory(selected: Story) {
    setStory(selected);
    setControls(selected.controls || initial);
    setAudioUrl(selected.audio_path ? `/api/stories/${selected.id}/audio` : null);
    setError("");
  }

  return (
    <main>
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">✦</div>
            <div><h1>Lyrical Fable Studio</h1><p>myth, memory, and impossible doors</p></div>
          </div>
          <span className="eyebrow">write · listen · keep</span>
        </header>

        <section className="hero">
          <span className="eyebrow">a small machine for wonder</span>
          <h2>Give a myth a new shadow.</h2>
          <p>Shape a character, choose the atmosphere, and make a fable that carries one precise image from its first sentence to its last.</p>
        </section>

        <section className="layout">
          <form className="panel controls" onSubmit={generate}>
            <div className="panel-title"><h3>Shape the fable</h3><span>the essentials</span></div>
            <div className="field"><label htmlFor="subject">Character or subject</label><input id="subject" value={controls.subject} onChange={(event) => update("subject", event.target.value)} placeholder="Sisyphus, Orpheus, a cartographer of dreams…" /></div>
            <div className="grid-two">
              <div className="field"><label htmlFor="length">Length</label><select id="length" value={controls.length} onChange={(event) => update("length", event.target.value as Controls["length"])}><option value="short">500–700 words</option><option value="standard">900–1,100 words</option><option value="long">1,400–1,800 words</option><option value="epic">2,500–3,000 words</option></select></div>
              <div className="field"><label htmlFor="pov">Point of view</label><select id="pov" value={controls.pov} onChange={(event) => update("pov", event.target.value as Controls["pov"])}><option value="first">First person</option><option value="third">Third person</option></select></div>
            </div>
            <div className="field"><label htmlFor="style">Style preset</label><select id="style" value={controls.style} onChange={(event) => update("style", event.target.value)}>{styles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><div className="helper">Reference authors indicate broad qualities, not imitation of an author’s exact voice.</div></div>
            <div className="grid-two">
              <div className="field"><label htmlFor="tone">Tone</label><select id="tone" value={controls.tone} onChange={(event) => update("tone", event.target.value)}><option value="luminous">Luminous</option><option value="meditative">Meditative</option><option value="playful">Playful</option><option value="dark">Dark</option><option value="sensual, non-graphic">Sensual, non-graphic</option></select></div>
              <div className="field"><label htmlFor="form">Narrative form</label><select id="form" value={controls.form} onChange={(event) => update("form", event.target.value)}><option value="linear-moment">Linear moment</option><option value="transformation">Transformation</option><option value="recursive">Recursive fragments</option><option value="thought-experiment">Thought experiment</option></select></div>
            </div>
            <div className="field"><label htmlFor="fidelity">Myth / source fidelity</label><select id="fidelity" value={controls.fidelity} onChange={(event) => update("fidelity", event.target.value as Controls["fidelity"])}><option value="free">Free retelling</option><option value="aware">Tradition-aware</option><option value="research">Research-required</option></select></div>
            <div className="field"><label htmlFor="theme">Theme or central image <span className="helper">(optional)</span></label><input id="theme" value={controls.theme} onChange={(event) => update("theme", event.target.value)} placeholder="memory, or a stone that remembers every hand" /></div>
            <details className="advanced"><summary>Advanced direction</summary><div className="field"><label htmlFor="ending">Ending</label><select id="ending" value={controls.ending} onChange={(event) => update("ending", event.target.value)}><option value="transformed-image">Transformed image</option><option value="open-question">Open question</option><option value="recognition">Moment of recognition</option><option value="recursive-loop">Recursive loop</option></select></div><div className="field"><label htmlFor="custom">Custom instructions</label><textarea id="custom" value={controls.custom} onChange={(event) => update("custom", event.target.value)} placeholder="A detail, setting, or constraint to carry through…" /></div></details>
            <button className="primary" disabled={loading} type="submit">{loading ? "Listening to the stone…" : "Generate fable"}</button>
            {error && <div className="error">{error}</div>}
          </form>

          {story ? <article className="panel reader"><div className="story"><h3>{story.title}</h3><div className="story-meta"><Chip>{story.controls?.style || "fable"}</Chip><Chip>{story.controls?.length || "standard"}</Chip><Chip>{story.controls?.pov === "third" ? "third person" : "first person"}</Chip></div><div className="story-body">{story.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{localNarration ? <><div className="audio-controls"><label>Blended narrator<select value={narrationPreset} onChange={(event) => setNarrationPreset(event.target.value)}><option value="mythic">Mythic — heart + Fenrir</option><option value="intimate">Intimate — Nicole + heart</option><option value="meditative">Meditative — heart + Onyx</option><option value="dramatic">Dramatic — Fenrir + Kore</option></select></label><label className="hos-toggle"><input type="checkbox" checked={hos} onChange={(event) => setHos(event.target.checked)} /> Hearts of Space ambience</label></div><div className="actions"><button className="action accent" onClick={narrate} disabled={narrating}>{narrating ? "Rendering Kokoro…" : audioUrl ? "Regenerate audio" : "Narrate locally"}</button>{story.id && <a className="action" href={`/api/stories/${story.id}/pdf`}>Download PDF</a>}{audioUrl && <a className="action" href={audioUrl} download={`${story.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.mp3`}>Download MP3</a>}{story.source && story.source !== "gemini" && <span className="notice">Local model</span>}</div></> : <p className="notice">Narration is available in the local studio. The hosted version has sample recordings below.</p>}{audioUrl && <audio className="audio" controls src={audioUrl}>Your browser does not support audio playback.</audio>}</div></article> : <article className="panel reader empty"><div><div className="empty-mark">☽</div><h3>Your fable will appear here.</h3><p>Choose a subject and let one image become a world.</p></div></article>}
        </section>

        <section className="library" id="samples"><h3>Listen to examples</h3><p className="notice">The hosted studio offers these sample narrations. Full-fable narration, blended voices, and optional Hearts of Space ambience run locally.</p><div className="library-grid">{samples.map((sample) => <article className="story-card" key={sample.title}><strong>{sample.title}</strong><small>{sample.note}</small><p>{sample.text}</p><audio className="sample-audio" controls preload="none" src={sample.audio}>Your browser does not support audio playback.</audio></article>)}</div></section>
        {localLibrary && <section className="library"><h3>Local Fables</h3>{stories.length ? <div className="library-grid">{stories.map((item) => <button className="story-card" key={item.id || item.title} onClick={() => chooseStory(item)}><strong>{item.title}</strong><small>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "This session"}</small></button>)}</div> : <p className="notice">New fables are saved outside this repository in {libraryPath || "your local library folder"}.</p>}</section>}
        <footer className="footer"><span>Lyrical Fable Studio · Created by <a href="https://github.com/sanzgiri" target="_blank" rel="noreferrer">Ashutosh Sanzgiri</a></span><a href="/about">About the studio</a></footer>
      </div>
    </main>
  );
}
