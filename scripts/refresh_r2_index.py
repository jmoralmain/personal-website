#!/usr/bin/env python3
"""
Regenerate r2-indexes/<Folder>/index.json from the contents of the R2 bucket.

This is what makes the portfolio "dynamic": you upload a photo to a folder in
R2 and — once this script runs (via the GitHub Action) — a tile for it appears
on the globe. You never edit an index file by hand.

It lists every top-level "folder" (common prefix) in the bucket, then writes one
index.json per folder listing the image files inside it. Any title/caption you
HAVE written by hand in an existing index.json is preserved for files that still
exist — so manual captions survive a refresh.

Also generates a tiny "preview" field per image: a 24x18 blur-up thumbnail
(cover-cropped to 4:3, JPEG, base64 data URI) embedded directly in the index
so the site can paint a preview before the full photo loads. Previews are
computed once and preserved across refreshes just like hand-written titles.

Environment variables (set as GitHub Actions secrets):
  R2_ACCESS_KEY_ID      — R2 S3 API access key id
  R2_SECRET_ACCESS_KEY  — R2 S3 API secret
  R2_ENDPOINT           — e.g. https://<account>.r2.cloudflarestorage.com
                          (falls back to building it from R2_ACCOUNT_ID)
  R2_ACCOUNT_ID         — used only if R2_ENDPOINT is not set
  R2_BUCKET             — bucket name (default: personal-portfolio)
"""

import base64
import json
import os
import sys
from io import BytesIO
from pathlib import Path

import boto3
from PIL import Image

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
INDEX_ROOT = Path(__file__).resolve().parent.parent / "r2-indexes"

PREVIEW_SIZE = (48, 36)   # 4:3, matches how tiles are displayed
PREVIEW_QUALITY = 60
# Bump when PREVIEW_SIZE/QUALITY (or the format) changes: entries whose stored
# "preview_v" differs are regenerated on the next run instead of preserved.
# v1 (24×18 q45, unversioned) upscaled too blocky on real tiles.
PREVIEW_VERSION = 2


def get_client():
    endpoint = os.environ.get("R2_ENDPOINT")
    if not endpoint:
        account = os.environ.get("R2_ACCOUNT_ID")
        if not account:
            sys.exit("ERROR: set R2_ENDPOINT or R2_ACCOUNT_ID")
        endpoint = f"https://{account}.r2.cloudflarestorage.com"

    key = os.environ.get("R2_ACCESS_KEY_ID")
    secret = os.environ.get("R2_SECRET_ACCESS_KEY")
    if not key or not secret:
        sys.exit("ERROR: set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY")

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=key,
        aws_secret_access_key=secret,
        region_name="auto",
    )


def list_folders(client, bucket):
    """Top-level prefixes, e.g. 'Climbing/', returned without the trailing slash."""
    resp = client.list_objects_v2(Bucket=bucket, Delimiter="/")
    return [p["Prefix"].rstrip("/") for p in resp.get("CommonPrefixes", [])]


def list_images(client, bucket, folder):
    """Image filenames (not full keys) directly inside a folder."""
    files = []
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=f"{folder}/", Delimiter="/"):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            name = key[len(folder) + 1:]
            if not name:  # the folder placeholder object itself
                continue
            if Path(name).suffix.lower() in IMAGE_EXTS:
                files.append(name)
    return sorted(files)


def make_preview(image_bytes):
    """Cover-crop image bytes to 4:3, shrink to a tiny JPEG, return a data URI.

    Pure function — no network, no env vars — so it's importable and testable
    on its own. Raises on any Pillow failure; callers decide how to handle it.
    """
    img = Image.open(BytesIO(image_bytes))
    img.load()
    if img.mode != "RGB":
        img = img.convert("RGB")

    w, h = img.size
    target_ratio = PREVIEW_SIZE[0] / PREVIEW_SIZE[1]
    src_ratio = w / h
    if src_ratio > target_ratio:
        new_w = round(h * target_ratio)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
    else:
        new_h = round(w / target_ratio)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))

    resample = getattr(Image, "Resampling", Image).LANCZOS
    img = img.resize(PREVIEW_SIZE, resample)

    buf = BytesIO()
    img.save(buf, format="JPEG", quality=PREVIEW_QUALITY, optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def fetch_preview(client, bucket, folder, filename):
    """Download one image from R2 and build its preview data URI.

    Never raises — a single unreadable/corrupt/unsupported image must not
    fail the whole run. Logs a warning to stderr and returns None instead.
    """
    try:
        obj = client.get_object(Bucket=bucket, Key=f"{folder}/{filename}")
        image_bytes = obj["Body"].read()
        return make_preview(image_bytes)
    except Exception as exc:  # noqa: BLE001 - deliberately broad, see docstring
        print(f"  WARNING: preview failed for {folder}/{filename}: {exc}", file=sys.stderr)
        return None


def load_existing(folder):
    """Map filename -> existing entry, to preserve hand-written titles/captions."""
    path = INDEX_ROOT / folder / "index.json"
    if not path.exists():
        return {}
    try:
        entries = json.loads(path.read_text())
        return {e["file"]: e for e in entries if isinstance(e, dict) and "file" in e}
    except (json.JSONDecodeError, KeyError):
        return {}


def write_index(client, bucket, folder, files, existing):
    # Fields a human may have added by hand — preserved across refreshes.
    keep_fields = ("title", "caption", "body", "icon", "lat", "lon")
    out = []
    for f in files:
        prev = existing.get(f, {})
        entry = {"file": f}
        for field in keep_fields:
            if field in prev and prev[field] not in (None, ""):
                entry[field] = prev[field]
        # Auto-generated, preserved the same way — only computed once per
        # file so a refresh doesn't re-download the whole bucket every hour.
        # A PREVIEW_VERSION mismatch (format change) forces a regenerate.
        if prev.get("preview") and prev.get("preview_v") == PREVIEW_VERSION:
            entry["preview"]   = prev["preview"]
            entry["preview_v"] = prev["preview_v"]
        else:
            preview = fetch_preview(client, bucket, folder, f)
            if preview:
                entry["preview"]   = preview
                entry["preview_v"] = PREVIEW_VERSION
        out.append(entry)

    folder_dir = INDEX_ROOT / folder
    folder_dir.mkdir(parents=True, exist_ok=True)
    path = folder_dir / "index.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    return len(out)


def main():
    bucket = os.environ.get("R2_BUCKET") or "personal-portfolio"
    client = get_client()

    folders = list_folders(client, bucket)
    if not folders:
        print(f"No folders found in bucket '{bucket}'.")
        return

    total = 0
    for folder in folders:
        files = list_images(client, bucket, folder)
        existing = load_existing(folder)
        n = write_index(client, bucket, folder, files, existing)
        total += n
        print(f"  {folder}: {n} image(s)")

    print(f"Wrote indexes for {len(folders)} folder(s), {total} image(s) total.")


if __name__ == "__main__":
    main()
