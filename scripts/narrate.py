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


def encode(wav_path: Path, output: Path, fmt: str, target_lufs: float) -> None:
    if fmt == "wav":
        shutil.move(str(wav_path), str(output))
        return
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is required for mp3/m4a output; use --format wav instead")
    codec = ["-codec:a", "libmp3lame", "-qscale:a", "2"] if fmt == "mp3" else ["-c:a", "aac", "-b:a", "128k"]
    run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_path),
        "-af", f"loudnorm=I={target_lufs}:TP=-2:LRA=11",
        *codec, str(output),
    ])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Narrate a lyrical fable with local Kokoro TTS.")
    parser.add_argument("input", help="Markdown or plain-text fable")
    parser.add_argument("-o", "--output", help="output path; defaults to <input>.<format>")
    parser.add_argument("--format", choices=("m4a", "mp3", "wav"), default="m4a")
    parser.add_argument("--voice", default="af_heart:0.7,af_nicole:0.3", help="Kokoro voice or weighted blend")
    parser.add_argument("--quote-voice", help="optional voice/blend for Markdown blockquotes")
    parser.add_argument("--speed", type=float, default=0.88, help="Kokoro speech speed")
    parser.add_argument("--quote-speed", type=float, default=0.84)
    parser.add_argument("--lang", default="a", help="Kokoro language code (default: American English)")
    parser.add_argument("--target-lufs", type=float, default=-16.0, help="loudness target for compressed output")
    parser.add_argument("--dry-run", action="store_true", help="print cleaned speech without rendering")
    parser.add_argument("--keep-wav", action="store_true", help="keep the intermediate WAV beside the output")
    args = parser.parse_args(argv)

    input_path = Path(args.input)
    if not input_path.is_file():
        raise SystemExit(f"no such file: {input_path}")
    blocks = parse_markdown(input_path.read_text(encoding="utf-8"))
    if not blocks:
        raise SystemExit("no narratable text found")
    if args.dry_run:
        print("\n\n".join(block.text for block in blocks))
        return 0

    try:
        import numpy as np
        import soundfile as sf
        from kokoro import KPipeline
    except ImportError as exc:
        raise SystemExit("narration requires kokoro, numpy, and soundfile; install them in a virtualenv") from exc

    if shutil.which("espeak-ng") is None:
        raise SystemExit("espeak-ng is required by Kokoro; install it with: brew install espeak-ng")

    output = Path(args.output) if args.output else input_path.with_suffix("." + args.format)
    output.parent.mkdir(parents=True, exist_ok=True)
    pipeline = KPipeline(lang_code=args.lang)
    primary = load_blended_voice(pipeline, args.voice)
    quote = load_blended_voice(pipeline, args.quote_voice) if args.quote_voice else None

    audio_parts = []
    for block in blocks:
        voice = quote if block.quote and quote is not None else primary
        speed = args.quote_speed if block.quote and quote is not None else args.speed
        audio_parts.append(render_text(pipeline, block.text, voice, speed))
        audio_parts.append(silence(0.65 if block.quote else 0.4))
    audio = np.concatenate(audio_parts)

    temp_dir = Path(tempfile.mkdtemp(prefix="lyrical-fable."))
    wav_path = temp_dir / "narration.wav"
    try:
        sf.write(str(wav_path), np.clip(audio, -1.0, 1.0), SAMPLE_RATE)
        encode(wav_path, output, args.format, args.target_lufs)
        if args.keep_wav and args.format != "wav":
            shutil.copy2(wav_path, output.with_suffix(".wav"))
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

    print(f"[done] {output}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
