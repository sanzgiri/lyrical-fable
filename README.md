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

## Saving Generated Fables

Generated stories appear in chat unless you explicitly save them. Archive a fable with dated metadata under `examples/generated/`:

```bash
python scripts/save_fable.py \
  --subject Sisyphus \
  --prompt "A recursive fable about memory" \
  --source-tradition "Greek mythology" \
  < fable.md
```

Use `--input draft.md` instead of stdin, `--output path/to/story.md` for a custom destination, and `--force` to overwrite an existing file. Saved files include the subject, generation timestamp, prompt, and optional source tradition.

## Using a Local Model

The skill is model-agnostic and uses pi's active model. This setup includes local Ollama models on `shalini.local`:

```bash
pi --model shalini/qwen3.6:35b-a3b \
  "Write a lyrical fable about Sisyphus."

pi --model shalini/qwen3-coder:30b \
  "Write a lyrical fable about Ada Lovelace."
```

In an interactive session, switch with `/model`. The local models must be configured in `~/.pi/agent/models.json` and the Ollama server must be reachable at `shalini.local:11434`.

The default story length is 900–1100 words. There is no skill-level maximum; the selected model's context window and output-token limit determine the practical ceiling. With the configured 32K-context local models, 1,000–3,000 words is comfortable. For longer stories, generate titled installments and combine them afterward for better coherence.

## Narrated Output

The bundled renderer converts a Markdown fable into local audio using Kokoro TTS. It supports narration presets, single voices, weighted blends, natural paragraph pauses, optional quote voices, cleaned-script sidecars, loudness normalization, and optional Flux cover art.

### Setup

macOS prerequisites:

```bash
brew install ffmpeg espeak-ng
python -m venv .venv
.venv/bin/pip install kokoro numpy soundfile
```

Kokoro voicepacks download automatically on first use.

### Narration presets

Available presets are `mythic`, `intimate`, `meditative`, and `dramatic`:

```bash
.venv/bin/python scripts/narrate.py fable.md --list-presets
.venv/bin/python scripts/narrate.py fable.md --preset mythic --output fable.m4a
```

### Voices and cleaned scripts

The default narrator is a blended voice. Use a single voice or define another weighted blend:

```bash
.venv/bin/python scripts/narrate.py fable.md \
  --voice af_heart --format mp3

.venv/bin/python scripts/narrate.py fable.md \
  --voice "af_heart:0.7,af_nicole:0.3" \
  --speed 0.88 \
  --output fable.m4a
```

A cleaned `fable.narration.txt` file is saved beside the audio by default. Customize it with `--script-output` or disable it with `--no-script`:

```bash
.venv/bin/python scripts/narrate.py fable.md \
  --script-output audio/fable-spoken.txt
```

Give blockquoted passages a distinct voice:

```bash
.venv/bin/python scripts/narrate.py fable.md \
  --quote-voice am_michael \
  --output fable.m4a
```

Inspect cleaned speech without rendering:

```bash
.venv/bin/python scripts/narrate.py fable.md --dry-run
```

### Optional cover art

With the local Flux server available at `shalini.local:8000`, generate a square PNG and embed it into M4A or MP3 metadata:

```bash
.venv/bin/python scripts/narrate.py fable.md \
  --preset mythic \
  --cover-art \
  --cover-prompt "A luminous stone beneath an impossible moon; no text" \
  --output fable.m4a
```

The PNG is saved beside the audio. Set `LOCAL_MODELS_HOST` if the image server uses another LAN hostname. Cover-art generation is optional and does not affect ordinary narration.

Supported output formats are `m4a` (default), `mp3`, and `wav`. Useful options include:

- `--preset NAME` — narration style and voice defaults
- `--voice NAME[:WEIGHT],...` — narrator voice or weighted blend
- `--quote-voice NAME[:WEIGHT],...` — optional blockquote voice
- `--speed 0.88` — narration speed
- `--target-lufs -16` — loudness target for MP3/M4A
- `--script-output PATH` / `--no-script` — control the cleaned-text sidecar
- `--cover-art` / `--cover-output PATH` — generate optional cover art
- `--keep-wav` — preserve the intermediate WAV
- `--dry-run` — print speech text without rendering

## Contents

- `SKILL.md` — workflow, model selection, saving, narration, and quality checklist
- `references/style_guide.md` — detailed craft guidance
- `references/examples.md` — four calibration examples
- `scripts/save_fable.py` — archive generated fables with dated metadata
- `scripts/narrate.py` — Kokoro narration with presets, voice blending, and sidecars
- `scripts/cover_art.py` — optional local Flux cover-art generation
- `LICENSE` — MIT license

## Version

1.4.0
