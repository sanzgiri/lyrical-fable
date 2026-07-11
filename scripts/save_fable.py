#!/usr/bin/env python3
"""Save a generated fable as dated Markdown with lightweight metadata.

Examples:
    python scripts/save_fable.py --subject Sisyphus < fable.txt
    python scripts/save_fable.py --subject Orpheus --input draft.md \
        --prompt "A recursive retelling about memory"
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "fable"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Archive a generated fable with metadata.")
    parser.add_argument("--subject", required=True, help="myth, character, or subject")
    parser.add_argument("--input", help="fable Markdown/text file; otherwise read stdin")
    parser.add_argument("--prompt", default="", help="prompt that produced the fable")
    parser.add_argument("--source-tradition", default="", help="mythic or historical source tradition")
    parser.add_argument("--output", help="destination path")
    parser.add_argument("--force", action="store_true", help="overwrite an existing destination")
    args = parser.parse_args(argv)

    text = Path(args.input).read_text(encoding="utf-8") if args.input else sys.stdin.read()
    text = text.strip()
    if not text:
        raise SystemExit("no fable text supplied")

    now = datetime.now().astimezone()
    destination = (
        Path(args.output)
        if args.output
        else Path("examples/generated") / f"{now:%Y-%m-%d}-{slugify(args.subject)}.md"
    )
    if destination.exists() and not args.force:
        raise SystemExit(f"already exists: {destination} (use --force to overwrite)")

    title = args.subject + " — Lyrical Fable"
    generated_at = now.isoformat(timespec="seconds")
    metadata = [
        "---",
        f"title: {json.dumps(title, ensure_ascii=False)}",
        f"subject: {json.dumps(args.subject, ensure_ascii=False)}",
        f"generated_at: {json.dumps(generated_at, ensure_ascii=False)}",
    ]
    if args.source_tradition:
        metadata.append(f"source_tradition: {json.dumps(args.source_tradition, ensure_ascii=False)}")
    if args.prompt:
        metadata.append(f"prompt: {json.dumps(args.prompt, ensure_ascii=False)}")
    metadata.extend(["---", "", text, ""])

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text("\n".join(metadata), encoding="utf-8")
    print(destination)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
