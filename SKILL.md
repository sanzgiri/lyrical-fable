---
name: lyrical-fable
description: Create short lyrical fables (~1000 words) about historical, fictional, mythological, or original characters. Use for lyrical fables, mythic stories, dreamy philosophical narratives, or poetic first-person fiction. Favor sparse, precise prose, concrete imagery, philosophical depth, and luminous wonder.
license: MIT
metadata:
  version: "1.3.0"
---

# Lyrical Fable

Create a short fable—usually 900–1100 words—with a vivid voice, a concrete central image, and a philosophical question that emerges through action rather than explanation.

The defaults below are starting points. Always follow the user's requested length, point of view, tone, structure, subject, and content boundaries when they differ.

## Workflow

1. **Capture the constraints.** Extract any requested length, point of view, tone, structure, factuality, source tradition, and content boundaries. Treat explicit user requirements as higher priority than the defaults below.
2. **Identify the subject.** Determine whether the protagonist is historical, mythological, fictional, or original. Note the defining tension, object, place, or transformation that can carry the story.
3. **Choose a form.** Use the form that best suits the subject: interior monologue, moment of transformation, recursive fragments, or a philosophical thought experiment.
4. **Choose a small set of qualities.** If the user names authors, treat them only as high-level reference points. Select a few relevant qualities—such as structural play, mythic depth, scientific precision, or ironic reflection—rather than imitating any author exactly.
5. **Check source tradition when applicable.** If the user requests fidelity to a myth, cultural tradition, or historical record, consult reliable sources when available. Account for major variants, avoid presenting inventions as canonical facts, and state a brief assumption only when it materially affects the story. Do not research by default for an openly imaginative retelling.
6. **Consult references as needed.** Read `references/style_guide.md` for craft guidance and `references/examples.md` for calibration. Do not load both automatically when the request is simple.
7. **Draft the story.** Start with a strong image or voice. Develop one central situation or meditation, deepen it with a turn or complication, and close on a changed image, recognition, question, or open possibility.
8. **Revise silently.** Run an originality pass: remove generic mythic imagery, repeated motifs, borrowed phrasing, and abstract explanations; make the central image and character-specific details do the work. Then check the story against the checklist below before presenting it. Do not include process notes unless the user asks for them.

## Default Craft Constraints

- Default to first person from the character's perspective, unless another point of view is requested.
- Default to approximately 1000 words; obey an explicit length request instead.
- Use contemporary, clear diction—avoid archaic constructions such as “thou” and “hath.”
- Let the character's concerns shape vocabulary, rhythm, and attention.
- Anchor dreamlike or speculative passages in specific sensory details.
- Let recurring images evolve; do not explain their meaning after presenting them.
- Let philosophical questions arise from concrete choices, objects, and sensations.
- Favor wonder, strangeness, humor, and luminosity over sustained heaviness or sentimentality.
- Prefer a focused moment or encounter to an overplotted adventure.

## Optional Modes

- **Historical:** Preserve well-established facts unless the user requests free invention; make invented interiority or events feel clearly imaginative when factual accuracy matters.
- **Mythological:** Respect the source tradition while allowing a fresh interpretation; avoid flattening culturally specific figures into generic symbols.
- **Fictional:** Preserve recognizable motives and traits without copying source-text phrasing.
- **Original:** Give the character a specific occupation, object, or predicament that makes the abstract theme tangible.
- **Multiple versions:** Vary the structure or governing image, not merely the adjectives.

## Narrated Output

When the user asks for an audio or narrated version, first finish and save the fable as Markdown, then use the bundled renderer:

```bash
python scripts/narrate.py fable.md --output fable.m4a
```

The renderer uses local Kokoro TTS and defaults to a weighted narrator blend (`af_heart:0.7,af_nicole:0.3`). Override it with a single voice or another weighted blend:

```bash
python scripts/narrate.py fable.md --voice af_heart --format mp3
python scripts/narrate.py fable.md --voice "af_heart:0.7,af_nicole:0.3" --speed 0.88
```

Use `--quote-voice` only when blockquoted passages should sound distinct. Use `--dry-run` to inspect the cleaned speech without generating audio. The renderer requires `kokoro`, `numpy`, `soundfile`, `ffmpeg`, and `espeak-ng`; voicepacks download on first use.

## Final Checklist

- Satisfies every explicit request for point of view, length, tone, structure, factuality, and content boundaries.
- Opens with a distinctive voice, image, or situation.
- Keeps the protagonist's consciousness and defining tension present.
- Uses concrete, particular imagery rather than generic fantasy language.
- Contains no unmarked invention presented as canonical or historical fact when fidelity matters.
- Avoids purple prose, clichés, sentimentality, borrowed phrasing, and didactic explanation.
- Uses a fresh governing image and does not recycle motifs unnecessarily.
- Balances clarity with mystery and philosophical depth with story.
- Ends with resonance rather than a neat moral or resolution.
- Removes sentences that do not sharpen character, image, movement, or meaning.

## References

- `references/style_guide.md` — detailed craft guidance, structural options, imagery, tone, and pitfalls.
- `references/examples.md` — four example fables for historical, mythological, fictional, and original protagonists.
- `scripts/narrate.py` — local Kokoro narration with weighted voice blending and MP3/M4A/WAV output.
