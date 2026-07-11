#!/usr/bin/env python3
"""Generate square cover art with the optional local Flux endpoint.

The default endpoint is the user's LAN-hosted mlx-openai-server. No API key
is used and the image stays on the local network.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

MODEL = "black-forest-labs/FLUX.1-schnell"


def generate_cover_art(prompt: str, output: Path, host: str = "shalini.local", port: int = 8000) -> Path:
    base_url = f"http://{host}:{port}/v1"
    try:
        with urlopen(f"{base_url}/models", timeout=5) as response:
            if response.status != 200:
                raise RuntimeError(f"image server health check returned HTTP {response.status}")
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(
            f"Flux server unavailable at {base_url}; start the local image server or omit --cover-art"
        ) from exc

    payload = json.dumps({"model": MODEL, "prompt": prompt, "n": 1}).encode("utf-8")
    request = Request(
        f"{base_url}/images/generations",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=300) as response:
            data = json.load(response)
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(f"Flux image generation failed: {exc}") from exc

    try:
        encoded = data["data"][0]["b64_json"]
        image = base64.b64decode(encoded, validate=True)
    except (KeyError, IndexError, ValueError) as exc:
        raise RuntimeError("Flux returned no valid base64 image") from exc
    if not image.startswith(b"\x89PNG"):
        raise RuntimeError("Flux response was not a PNG")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(image)
    return output


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate fable cover art with local Flux.")
    parser.add_argument("prompt", help="image prompt")
    parser.add_argument("-o", "--output", default="cover.png")
    parser.add_argument("--host", default=os.environ.get("LOCAL_MODELS_HOST", "shalini.local"))
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args(argv)
    try:
        print(generate_cover_art(args.prompt, Path(args.output), args.host, args.port))
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from exc
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
