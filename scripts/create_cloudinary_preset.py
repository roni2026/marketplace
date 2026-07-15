#!/usr/bin/env python3
"""
Create the unsigned upload preset `bazarbd_unsigned` for cloud iok4ild8
using the Cloudinary Admin API — no dashboard UI needed.

Required env:
  CLOUDINARY_CLOUD_NAME=iok4ild8
  CLOUDINARY_API_KEY=477828215824789
  CLOUDINARY_API_SECRET=<your secret — never commit>

Usage:
  python3 scripts/create_cloudinary_preset.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from base64 import b64encode

CLOUD = os.environ.get("CLOUDINARY_CLOUD_NAME", "iok4ild8").strip()
API_KEY = os.environ.get("CLOUDINARY_API_KEY", "477828215824789").strip()
API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "").strip()
PRESET = os.environ.get("CLOUDINARY_UPLOAD_PRESET", "bazarbd_unsigned").strip()
FOLDER = os.environ.get("CLOUDINARY_FOLDER", "bazarbd").strip()


def auth_header() -> str:
    token = b64encode(f"{API_KEY}:{API_SECRET}".encode()).decode()
    return f"Basic {token}"


def request(method: str, url: str, body: dict | None = None) -> tuple[int, dict]:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": auth_header(),
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            raw = res.read().decode()
            return res.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"error": {"message": raw}}
        return e.code, payload


def main() -> int:
    if not API_SECRET:
        print("ERROR: set CLOUDINARY_API_SECRET in the environment.")
        print("Do not put the secret in VITE_* vars.")
        return 1

    base = f"https://api.cloudinary.com/v1_1/{CLOUD}/upload_presets"
    print(f"Cloud: {CLOUD}")
    print(f"Preset: {PRESET}")

    # List existing
    status, listing = request("GET", base)
    if status >= 400:
        print("Failed to list presets:", listing)
        return 1

    presets = listing.get("presets") or listing.get("upload_presets") or []
    names = [p.get("name") for p in presets if isinstance(p, dict)]
    print("Existing presets:", names or "(none)")

    payload = {
        "name": PRESET,
        "unsigned": True,
        "folder": FOLDER,
        "use_filename": True,
        "unique_filename": True,
        "overwrite": False,
    }

    if PRESET in names:
        print(f"Preset '{PRESET}' already exists — updating to unsigned…")
        status, result = request("PUT", f"{base}/{PRESET}", payload)
    else:
        print(f"Creating unsigned preset '{PRESET}'…")
        status, result = request("POST", base, payload)

    print("HTTP", status)
    print(json.dumps(result, indent=2)[:2000])
    if status >= 400:
        return 1

    print("\nSUCCESS. Set on Render:")
    print(f"  VITE_CLOUDINARY_CLOUD_NAME={CLOUD}")
    print(f"  VITE_CLOUDINARY_API_KEY={API_KEY}")
    print(f"  VITE_CLOUDINARY_UPLOAD_PRESET={PRESET}")
    print("Redeploy after setting env vars.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
