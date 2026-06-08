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

Environment variables (set as GitHub Actions secrets):
  R2_ACCESS_KEY_ID      — R2 S3 API access key id
  R2_SECRET_ACCESS_KEY  — R2 S3 API secret
  R2_ENDPOINT           — e.g. https://<account>.r2.cloudflarestorage.com
                          (falls back to building it from R2_ACCOUNT_ID)
  R2_ACCOUNT_ID         — used only if R2_ENDPOINT is not set
  R2_BUCKET             — bucket name (default: personal-portfolio)
"""

import json
import os
import sys
from pathlib import Path

import boto3

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
INDEX_ROOT = Path(__file__).resolve().parent.parent / "r2-indexes"


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


def write_index(folder, files, existing):
    # Fields a human may have added by hand — preserved across refreshes.
    keep_fields = ("title", "caption", "body", "icon", "lat", "lon")
    out = []
    for f in files:
        prev = existing.get(f, {})
        entry = {"file": f}
        for field in keep_fields:
            if field in prev and prev[field] not in (None, ""):
                entry[field] = prev[field]
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
        n = write_index(folder, files, existing)
        total += n
        print(f"  {folder}: {n} image(s)")

    print(f"Wrote indexes for {len(folders)} folder(s), {total} image(s) total.")


if __name__ == "__main__":
    main()
