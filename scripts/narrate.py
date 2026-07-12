#!/usr/bin/env python3
"""Render a lyrical fable to audio with local Kokoro TTS.

The default narrator is a weighted blend of two Kokoro voicepacks. Use a
single voice or another blend with --voice, for example:

    python scripts/narrate.py fable.md --output fable.m4a
    python scripts/narrate.py fable.md --voice 'af_heart:0.7,af_nicole:0.3'
    python scripts/narrate.py fable.md --voice af_heart --format mp3

Requires Python packages `kokoro`, `numpy`, and `soundfile`, plus ffmpeg and
espeak-ng for local Kokoro rendering and compressed output.
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

SAMPLE_RATE = 24_000

PRESETS = {
    "mythic": {
        "voice": "af_heart:0.6,am_fenrir:0.4",
        "speed": 0.86,
        "quote_speed": 0.82,
        "target_lufs": -16.0,
    },
    "intimate": {
        "voice": "af_nicole:0.65,af_heart:0.35",
        "speed": 0.82,
        "quote_speed": 0.78,
        "target_lufs": -18.0,
    },
    "meditative": {
        "voice": "af_heart:0.7,am_onyx:0.3",
        "speed": 0.76,
        "quote_speed": 0.72,
        "target_lufs": -18.0,
    },
    "dramatic": {
        "voice": "am_fenrir:0.6,af_kore:0.4",
        "speed": 0.96,
        "quote_speed": 0.92,
        "target_lufs": -16.0,
    },
}


@dataclass
class Block:
    text: str
    quote: bool = False


def clean_inline(text: str) -> str:
    """Remove Markdown syntax while keeping prose natural for speech."""
    text = re.sub(r"!\[([^]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\[([^]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"\*\*\*(.+?)\*\*\*", r"\1", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"(?<![A-Za-z0-9_])_{1,3}(.+?)_{1,3}(?![A-Za-z0-9_])", r"\1", text)
    text = re.sub(r"~~(.+?)~~", r"\1", text)
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def parse_markdown(markdown: str) -> list[Block]:
    """Convert a fable Markdown file into paragraph-sized speech blocks."""
    markdown = re.sub(r"\A---\n.*?\n---\n", "", markdown, flags=re.S)
    markdown = re.sub(r"^\s*```.*?^\s*```\s*$", "", markdown, flags=re.M | re.S)

    blocks: list[Block] = []
    normal: list[str] = []
    quote: list[str] = []

    def flush(target: list[str], is_quote: bool = False) -> None:
        if target:
            text = clean_inline(" ".join(target))
            if text:
                blocks.append(Block(text, is_quote))
            target.clear()

    for line in markdown.replace("\r\n", "\n").split("\n"):
        if not line.strip():
            flush(normal)
            flush(quote, True)
            continue
        if re.match(r"^\s*([-*_])(?:\s*\1){2,}\s*$", line):
            flush(normal)
            flush(quote, True)
            continue
        heading = re.match(r"^\s*#{1,6}\s+(.*?)\s*#*\s*$", line)
        if heading:
            flush(normal)
            flush(quote, True)
            title = clean_inline(heading.group(1))
            if title:
                blocks.append(Block(title.rstrip(".!?") + "."))
            continue
        if re.match(r"^\s{0,3}>", line):
            flush(normal)
            quote.append(re.sub(r"^\s{0,3}>\s?", "", line))
            continue
        if re.match(r"^\s*(?:[-*+]\s+|\d+[.)]\s+)", line):
            line = re.sub(r"^\s*(?:[-*+]\s+|\d+[.)]\s+)", "", line)
        if quote:
            flush(quote, True)
        normal.append(line.strip())

    flush(normal)
    flush(quote, True)
    return blocks


def parse_voice_spec(spec: str) -> list[tuple[str, float]]:
    """Parse 'voice' or 'voice:weight,other:weight' and normalize weights."""
    voices: list[tuple[str, float]] = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if ":" in part:
            name, raw_weight = part.split(":", 1)
            try:
                weight = float(raw_weight)
            except ValueError as exc:
                raise ValueError(f"invalid voice weight: {raw_weight}") from exc
        else:
            name, weight = part, 1.0
        if not name.strip() or weight <= 0:
            raise ValueError("voice names and weights must be non-empty and positive")
        voices.append((name.strip(), weight))
    if not voices:
        raise ValueError("at least one voice is required")
    total = sum(weight for _, weight in voices)
    return [(name, weight / total) for name, weight in voices]


def load_blended_voice(pipeline, spec: str):
    """Load one Kokoro voicepack or a weighted tensor blend."""
    parts = parse_voice_spec(spec)
    if len(parts) == 1:
        return pipeline.load_voice(parts[0][0])
    blended = None
    for name, weight in parts:
        voice = pipeline.load_voice(name)
        blended = voice * weight if blended is None else blended + voice * weight
    return blended


def render_text(pipeline, text: str, voice, speed: float):
    import numpy as np

    pieces = []
    for _, _, audio in pipeline(text, voice=voice, speed=speed):
        if hasattr(audio, "detach"):
            audio = audio.detach().cpu().numpy()
        pieces.append(np.asarray(audio, dtype=np.float32))
    return np.concatenate(pieces) if pieces else np.zeros(0, dtype=np.float32)


def silence(seconds: float):
    import numpy as np

    return np.zeros(int(SAMPLE_RATE * seconds), dtype=np.float32)


def run(command: list[str]) -> None:
    process = subprocess.run(command, capture_output=True, text=True)
    if process.returncode:
        sys.stderr.write(process.stdout)
        sys.stderr.write(process.stderr)
        raise SystemExit(f"command failed: {' '.join(command[:3])}")


def encode(wav_path: Path, output: Path, fmt: str, target_lufs: float, normalize: bool = True) -> None:
    if fmt == "wav":
        shutil.move(str(wav_path), str(output))
        return
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is required for mp3/m4a output; use --format wav instead")
    codec = ["-codec:a", "libmp3lame", "-qscale:a", "2"] if fmt == "mp3" else ["-c:a", "aac", "-b:a", "128k"]
    command = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_path)]
    if normalize:
        command.extend(["-af", f"loudnorm=I={target_lufs}:TP=-2:LRA=11"])
    run([*command, *codec, str(output)])


def apply_hos(input_wav: Path, output_wav: Path, preset: str, target_lufs: float,
              hos_python: str, hos_script: str) -> None:
    """Apply the local Hearts of Space ambience once, including loudness normalization."""
    if not Path(hos_python).is_file() or not Path(hos_script).is_file():
        raise SystemExit("HOS is not configured; set HOSIFY_PYTHON and HOSIFY_SCRIPT or omit --hos")
    run([
        hos_python, hos_script, str(input_wav), str(output_wav), "--preset", preset,
        "--normalize", "--lufs", str(target_lufs),
    ])


def embed_cover(audio_path: Path, cover_path: Path) -> None:
    """Attach PNG cover art to an M4A or MP3 without re-encoding audio."""
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is required to embed cover art")
    temporary = audio_path.with_name(audio_path.stem + ".cover" + audio_path.suffix)
    if audio_path.suffix.lower() == ".m4a":
        command = [
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(audio_path),
            "-i", str(cover_path), "-map", "0:a", "-map", "1:v", "-c:a", "copy",
            "-c:v", "mjpeg", "-disposition:v", "attached_pic", str(temporary),
        ]
    elif audio_path.suffix.lower() == ".mp3":
        command = [
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(audio_path),
            "-i", str(cover_path), "-map", "0:a", "-map", "1:v", "-c:a", "copy",
            "-c:v", "mjpeg", "-id3v2_version", "3", "-metadata:s:v", "title=Cover",
            "-metadata:s:v", "comment=Cover", str(temporary),
        ]
    else:
        return
    try:
        run(command)
        temporary.replace(audio_path)
    finally:
        temporary.unlink(missing_ok=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Narrate a lyrical fable with local Kokoro TTS.")
    parser.add_argument("input", nargs="?", help="Markdown or plain-text fable")
    parser.add_argument("-o", "--output", help="output path; defaults to <input>.<format>")
    parser.add_argument("--format", choices=("m4a", "mp3", "wav"), default="m4a")
    parser.add_argument("--preset", choices=tuple(PRESETS), default="mythic", help="narration style preset")
    parser.add_argument("--list-presets", action="store_true", help="list narration presets and exit")
    parser.add_argument("--voice", help="Kokoro voice or weighted blend; overrides the preset")
    parser.add_argument("--quote-voice", help="optional voice/blend for Markdown blockquotes")
    parser.add_argument("--speed", type=float, help="Kokoro speech speed; overrides the preset")
    parser.add_argument("--quote-speed", type=float, help="quote speed; overrides the preset")
    parser.add_argument("--lang", default="a", help="Kokoro language code (default: American English)")
    parser.add_argument("--target-lufs", type=float, help="loudness target; overrides the preset")
    parser.add_argument("--script-output", help="path for the cleaned narration script")
    parser.add_argument("--no-script", action="store_true", help="do not save the cleaned narration script")
    parser.add_argument("--cover-art", action="store_true", help="generate and attach local Flux cover art")
    parser.add_argument("--cover-output", help="cover PNG path; defaults beside the audio")
    parser.add_argument("--cover-prompt", help="prompt for cover-art generation")
    parser.add_argument("--cover-host", default=os.environ.get("LOCAL_MODELS_HOST", "shalini.local"))
    parser.add_argument("--cover-port", type=int, default=8000)
    parser.add_argument("--hos", action="store_true", help="apply local Hearts of Space ambience after narration")
    parser.add_argument("--hos-preset", default="hos_smooth", help="hosify preset (default: hos_smooth)")
    parser.add_argument("--hos-python", default=os.environ.get("HOSIFY_PYTHON", "/Users/sanzgiri/projects/hosify/venv/bin/python"), help="Python executable for hosify")
    parser.add_argument("--hos-script", default=os.environ.get("HOSIFY_SCRIPT", "/Users/sanzgiri/projects/hosify/hos_simple.py"), help="path to hosify's hos_simple.py")
    parser.add_argument("--dry-run", action="store_true", help="print cleaned speech without rendering")
    parser.add_argument("--keep-wav", action="store_true", help="keep the intermediate WAV beside the output")
    args = parser.parse_args(argv)

    if args.list_presets:
        for name, preset in PRESETS.items():
            print(f"{name:11} voice={preset['voice']} speed={preset['speed']}")
        return 0
    if not args.input:
        parser.error("input is required unless --list-presets is used")

    preset = PRESETS[args.preset]
    voice_spec = args.voice or preset["voice"]
    speed = args.speed if args.speed is not None else preset["speed"]
    quote_speed = args.quote_speed if args.quote_speed is not None else preset["quote_speed"]
    target_lufs = args.target_lufs if args.target_lufs is not None else preset["target_lufs"]

    input_path = Path(args.input)
    if not input_path.is_file():
        raise SystemExit(f"no such file: {input_path}")
    blocks = parse_markdown(input_path.read_text(encoding="utf-8"))
    if not blocks:
        raise SystemExit("no narratable text found")
    if args.dry_run:
        print("\n\n".join(block.text for block in blocks))
        return 0

    output = Path(args.output) if args.output else input_path.with_suffix("." + args.format)
    output.parent.mkdir(parents=True, exist_ok=True)
    if not args.no_script:
        script_path = Path(args.script_output) if args.script_output else output.with_suffix(".narration.txt")
        script_path.parent.mkdir(parents=True, exist_ok=True)
        script_path.write_text("\n\n".join(block.text for block in blocks) + "\n", encoding="utf-8")
        print(f"[script] {script_path}", file=sys.stderr)

    try:
        import numpy as np
        import soundfile as sf
        from kokoro import KPipeline
    except ImportError as exc:
        raise SystemExit("narration requires kokoro, numpy, and soundfile; install them in a virtualenv") from exc

    if shutil.which("espeak-ng") is None:
        raise SystemExit("espeak-ng is required by Kokoro; install it with: brew install espeak-ng")

    pipeline = KPipeline(lang_code=args.lang)
    primary = load_blended_voice(pipeline, voice_spec)
    quote = load_blended_voice(pipeline, args.quote_voice) if args.quote_voice else None

    audio_parts = []
    for block in blocks:
        voice = quote if block.quote and quote is not None else primary
        block_speed = quote_speed if block.quote and quote is not None else speed
        audio_parts.append(render_text(pipeline, block.text, voice, block_speed))
        audio_parts.append(silence(0.65 if block.quote else 0.4))
    audio = np.concatenate(audio_parts)

    temp_dir = Path(tempfile.mkdtemp(prefix="lyrical-fable."))
    wav_path = temp_dir / "narration.wav"
    try:
        sf.write(str(wav_path), np.clip(audio, -1.0, 1.0), SAMPLE_RATE)
        rendered_wav = wav_path
        if args.hos:
            rendered_wav = temp_dir / "narration-hos.wav"
            apply_hos(wav_path, rendered_wav, args.hos_preset, target_lufs, args.hos_python, args.hos_script)
        encode(rendered_wav, output, args.format, target_lufs, normalize=not args.hos)
        if args.keep_wav and args.format != "wav":
            shutil.copy2(rendered_wav, output.with_suffix(".wav"))
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

    if args.cover_art:
        try:
            from cover_art import generate_cover_art
        except ImportError as exc:
            raise SystemExit("could not load scripts/cover_art.py") from exc
        cover_path = Path(args.cover_output) if args.cover_output else output.with_suffix(".png")
        title = blocks[0].text.rstrip(".!?")
        prompt = args.cover_prompt or (
            f"Square literary cover art for a mythic fable titled '{title}'. "
            "Symbolic, luminous, dreamlike, painterly, no words, no letters, no typography."
        )
        try:
            generate_cover_art(prompt, cover_path, args.cover_host, args.cover_port)
            embed_cover(output, cover_path)
            print(f"[cover] {cover_path}", file=sys.stderr)
        except RuntimeError as exc:
            raise SystemExit(str(exc)) from exc

    print(f"[done] {output}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
