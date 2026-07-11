# Lyrical Fable Skill

An [Agent Skill](https://agentskills.io/) for writing and narrating short mythic fables. It combines a contemporary voice with timeless settings, sparse precise prose, concrete sensory imagery, philosophical questions, and luminous wonder.

The skill works with historical, mythological, fictional, and original characters. Named writers may be supplied as high-level reference points; the skill combines broad techniques rather than reproducing any author's exact voice.

## Installation

### pi

Install globally:

```bash
git clone https://github.com/sanzgiri/lyrical-fable.git ~/.pi/agent/skills/lyrical-fable
```

Or load for one session:

```bash
pi --skill /path/to/lyrical-fable/SKILL.md
```

For other Agent Skills-compatible tools, place the repository directory in the tool's skills directory. The entry point is `SKILL.md`.

## Writing Usage

Ask pi for a fable directly:

```text
Write a lyrical fable about Sisyphus. Keep it under 1,000 words, use first person, and center the story on the moment he realizes the stone has a memory.
```

Other prompts:

- “Write a mythic fable about Scheherazade using a recursive structure.”
- “Create a philosophical story about Ada Lovelace and an imagined machine.”
- “Write three versions of Orpheus's descent, each with a different governing image.”
- “Retell this myth with fidelity to its source tradition, clearly separating invention from canon.”

Defaults are approximately 1,000 words, first-person narration, contemporary diction, concrete imagery, and an open resonant ending. Explicit requests for length, point of view, tone, structure, factuality, or content boundaries take precedence.

## Narrated Output

The bundled renderer converts a Markdown fable into local audio using Kokoro TTS. It supports single voices and weighted blends, inserts natural paragraph pauses, optionally assigns a separate voice to blockquotes, and loudness-normalizes compressed output.

### Setup

macOS prerequisites:

```bash
brew install ffmpeg espeak-ng
python -m venv .venv
.venv/bin/pip install kokoro numpy soundfile
```

Kokoro voicepacks download automatically on first use.

### Render audio

```bash
.venv/bin/python scripts/narrate.py fable.md --output fable.m4a
```

The default narrator is a blended voice:

```text
af_heart:0.7,af_nicole:0.3
```

Use a single voice or define another weighted blend:

```bash
.venv/bin/python scripts/narrate.py fable.md \
  --voice af_heart --format mp3

.venv/bin/python scripts/narrate.py fable.md \
  --voice "af_heart:0.7,af_nicole:0.3" \
  --speed 0.88 \
  --output fable.m4a
```

Give blockquoted passages a distinct voice:

```bash
.venv/bin/python scripts/narrate.py fable.md \
  --quote-voice am_michael \
  --output fable.m4a
```

Inspect the cleaned speech without generating audio:

```bash
.venv/bin/python scripts/narrate.py fable.md --dry-run
```

Supported output formats are `m4a` (default), `mp3`, and `wav`. Useful options include:

- `--voice NAME[:WEIGHT],...` — narrator voice or weighted blend
- `--quote-voice NAME[:WEIGHT],...` — optional blockquote voice
- `--speed 0.88` — narration speed
- `--target-lufs -16` — loudness target for MP3/M4A
- `--keep-wav` — preserve the intermediate WAV
- `--dry-run` — print speech text without rendering

## Contents

- `SKILL.md` — workflow, writing constraints, narration instructions, and quality checklist
- `references/style_guide.md` — detailed craft guidance
- `references/examples.md` — four calibration examples
- `scripts/narrate.py` — Kokoro narration with weighted voice blending
- `LICENSE` — MIT license

## Version

1.3.0
