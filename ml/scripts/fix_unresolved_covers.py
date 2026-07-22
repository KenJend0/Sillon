#!/usr/bin/env python3
"""
Fix albums whose cover_url is still a coverartarchive.org redirect URL.

For each such album:
  1. Hit the CoverArt Archive JSON API to get the actual image URL
  2. Download the image
  3. Upload to Supabase Storage
  4. Update cover_url in the DB

Usage:
  python ml/scripts/fix_unresolved_covers.py
  python ml/scripts/fix_unresolved_covers.py --dry-run
"""

from __future__ import annotations

import sys
import time
import warnings
from pathlib import Path
import argparse

import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.supabase_client import get_client

BUCKET = "covers"
HEADERS = {"User-Agent": "Sillon/1.0 (https://sillon.fm)", "Accept": "application/json"}


def fetch_json(url: str) -> dict | None:
    try:
        r = requests.get(url, headers=HEADERS, timeout=15, verify=False)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"    [warn] JSON fetch failed: {e}")
    return None


def resolve_cover_url(release_group_mbid: str) -> str | None:
    """Use CAA JSON API to get the actual front image URL."""
    data = fetch_json(f"https://coverartarchive.org/release-group/{release_group_mbid}")
    if not data:
        return None
    images = data.get("images", [])
    for img in images:
        if img.get("front"):
            return img.get("image")
    if images:
        return images[0].get("image")
    return None


def download_image(url: str) -> tuple[bytes, str] | None:
    try:
        r = requests.get(url, headers=HEADERS, timeout=15, verify=False)
        if r.status_code != 200:
            print(f"    [warn] download failed: HTTP {r.status_code}")
            return None
        content_type = r.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
        return r.content, content_type
    except Exception as e:
        print(f"    [warn] download failed: {e}")
        return None


def ext_for(content_type: str) -> str:
    if "png" in content_type:
        return "png"
    if "webp" in content_type:
        return "webp"
    return "jpg"


def upload_cover(supabase, mbid: str, image_bytes: bytes, content_type: str) -> str | None:
    filename = f"{mbid}.{ext_for(content_type)}"
    try:
        supabase.storage.from_(BUCKET).upload(
            filename,
            image_bytes,
            {"content-type": content_type, "upsert": "true"},
        )
    except Exception as e:
        print(f"    [warn] upload failed: {e}")
        return None
    return supabase.storage.from_(BUCKET).get_public_url(filename)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    supabase = get_client()

    # Tous les albums avec une URL non-Supabase (coverartarchive.org OU archive.org direct)
    res = (
        supabase.table("albums")
        .select("id, title, mbid, cover_url")
        .not_.like("cover_url", "%supabase.co%")
        .not_.is_("cover_url", "null")
        .not_.is_("mbid", "null")
        .execute()
    )
    albums = res.data or []
    print(f"{'[DRY RUN] ' if args.dry_run else ''}{len(albums)} albums à corriger\n")

    ok, failed = 0, 0
    for album in albums:
        print(f"  {album['title']} ({album['mbid']})")
        cover_url = album["cover_url"]

        # Résoudre via JSON API si c'est une URL de redirection coverartarchive.org
        if "coverartarchive.org" in cover_url:
            image_url = resolve_cover_url(album["mbid"])
            if not image_url:
                print("    ✗ impossible de résoudre via JSON API")
                failed += 1
                time.sleep(1)
                continue
            print(f"    → {image_url[:80]}")
        else:
            # URL archive.org directe — télécharger telle quelle
            image_url = cover_url
            print(f"    → (direct) {image_url[:80]}")

        if args.dry_run:
            print("    [dry-run] skip download/upload")
            ok += 1
            continue

        result = download_image(image_url)
        if not result:
            print("    ✗ download échoué")
            failed += 1
            time.sleep(1)
            continue

        image_bytes, content_type = result
        new_url = upload_cover(supabase, album["mbid"], image_bytes, content_type)
        if not new_url:
            print("    ✗ upload échoué")
            failed += 1
            time.sleep(1)
            continue

        supabase.table("albums").update({"cover_url": new_url}).eq("id", album["id"]).execute()
        print(f"    ✓ {new_url}")
        ok += 1
        time.sleep(0.5)

    print(f"\n── Summary ──────────────────────")
    print(f"  Corrigés  : {ok}")
    print(f"  Échecs    : {failed}")


if __name__ == "__main__":
    main()
