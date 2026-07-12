export type FableControls = {
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

const lengths: Record<FableControls["length"], string> = {
  short: "500–700 words",
  standard: "900–1,100 words",
  long: "1,400–1,800 words",
  epic: "2,500–3,000 words",
};

const styleMap: Record<string, string> = {
  "spare-mythic": "spare mythic interiority, precise images, fragmentary beauty",
  "playful-labyrinth": "structural play, recursive frames, philosophical puzzles, lightness",
  "speculative-wonder": "clear speculative premises, temporal imagination, emotional consequence",
  "magical-exuberance": "magical realism, verbal energy, cultural richness, vivid metaphor",
  "philosophical-irony": "conversational philosophical reflection, irony, lightness and weight",
  custom: "the user's custom stylistic direction",
};

export function buildPrompt(controls: FableControls) {
  const fidelity = {
    free: "Treat the source freely as imaginative material.",
    aware: "Respect major source-tradition details while making the interpretation original.",
    research: "Prioritize source-tradition accuracy; do not present invented details as canonical facts.",
  }[controls.fidelity];

  return `Write an original lyrical fable.

Subject: ${controls.subject}
Length: ${lengths[controls.length]}
Point of view: ${controls.pov === "first" ? "first person" : "third person"}
Style qualities: ${styleMap[controls.style] || controls.style}
Tone: ${controls.tone}
Narrative form: ${controls.form}
Theme or governing image: ${controls.theme || "choose one concrete image that carries the theme"}
Ending: ${controls.ending}
Source treatment: ${fidelity}
Additional direction: ${controls.custom || "none"}

Use contemporary, precise diction. Let philosophy emerge through concrete action and sensory detail. Avoid generic fantasy language, purple prose, and direct imitation of any living or contemporary author. Return JSON with exactly two string fields: "title" and "body". The body must contain only the fable, with paragraphs separated by blank lines.`;
}

export function fallbackFable(controls: FableControls) {
  const title = `The ${controls.subject} and the Unfinished Door`;
  const body = `I began with a door because every story about ${controls.subject} eventually becomes a story about entering or refusing to enter.\n\nThe door stood in a place no map admitted. Its wood was pale and warm beneath my palm, as if someone on the other side had just let go. I had been told what waited beyond it, but every person who told me used a different name.\n\nSo I listened instead. Behind the door came the sound of water moving through stone, and beneath that, the small persistent music of a life continuing without witnesses. I understood then that the threshold was not asking me to be brave. It was asking me to become particular.\n\nI opened it. The world beyond was not an answer. It was a room containing another door, and on that door was the shape of my own hand.\n\nI smiled—not because I had solved anything, but because the mystery had finally acquired a handle.`;
  return { title, body };
}
