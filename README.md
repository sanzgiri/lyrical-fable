# Lyrical Fable Skill

An [Agent Skill](https://agentskills.io/) for creating short lyrical fables with sparse prose, philosophical depth, concrete imagery, and luminous wonder. It works with pi and other Agent Skills-compatible harnesses.

## Installation

### pi

```bash
git clone https://github.com/sanzgiri/lyrical-fable.git ~/.pi/agent/skills/lyrical-fable
```

For a single session:

```bash
pi --skill /path/to/lyrical-fable/SKILL.md
```

For other Agent Skills-compatible tools, place the repository directory in the tool's skills directory. The entry point is `SKILL.md`.

## Usage

Try:

- “Write a lyrical fable about Ada Lovelace.”
- “Create a dreamy philosophical narrative about Sisyphus.”
- “Write a mythic story about a cartographer who maps dreams.”
- “Give me three structurally different versions, each under 700 words.”

The skill defaults to a roughly 1000-word story, first-person narration, contemporary diction, concrete imagery, and an open, resonant ending. User-specified length, point of view, tone, and structure take precedence.

## Narrated Output

The bundled renderer creates local audio with Kokoro TTS and a weighted blended narrator voice:

```bash
brew install ffmpeg espeak-ng
python -m venv .venv && .venv/bin/pip install kokoro numpy soundfile
.venv/bin/python scripts/narrate.py fable.md --output fable.m4a
```

Choose a single voice or blend voicepacks by weight:

```bash
.venv/bin/python scripts/narrate.py fable.md --voice af_heart --format mp3
.venv/bin/python scripts/narrate.py fable.md --voice "af_heart:0.7,af_nicole:0.3"
```

Use `--dry-run` to inspect cleaned speech without rendering. Kokoro voicepacks download on first use.

## Contents

- `SKILL.md` — core workflow and quality checklist
- `references/style_guide.md` — detailed craft guidance
- `references/examples.md` — four calibration examples
- `scripts/narrate.py` — local Kokoro narration with weighted voice blending
- `LICENSE` — MIT license

## Version

1.3.0
