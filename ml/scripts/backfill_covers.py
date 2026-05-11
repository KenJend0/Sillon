#!/usr/bin/env python3
"""
Backfill album covers: download from archive.org and upload to Supabase Storage.

For each album whose cover_url points to an external host (archive.org, coverartarchive.org, etc.):
  1. Download the image bytes
  2. Upload to the `covers` Supabase Storage bucket using the album mbid as filename
  3. Update cover_url in the albums table to the Supabase CDN URL

Albums already pointing to Supabase Storage are skipped (idempotent).
Albums with no cover_url or no mbid are skipped.

Usage:
  python ml/scripts/backfill_covers.py
  python ml/scripts/backfill_covers.py --dry-run          # preview only, no writes
  python ml/scripts/backfill_covers.py --limit 50         # process at most N albums
  python ml/scripts/backfill_covers.py --batch-size 20    # DB fetch page size
"""

from __future__ import annotations

import argparse
import mimetypes
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.supabase_client import get_client

BUCKET = "covers"
USER_AGENT = "Waveform/1.0 (https://waveform.app)"
SUPABASE_STORAGE_MARKER = "supabase.co/storage"
DOWNLOAD_TIMEOUT_S = 10
SLEEP_BETWEEN_S = 0.1   # stay polite to archive.org


def is_already_in_supabase(url: str) -> bool:
    return SUPABASE_STORAGE_MARKER in url


def download_image(url: str, retries: int = 3) -> tuple[bytes, str] | None:
    """Return (image_bytes, content_type) or None after retries exhausted."""
    req = Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(1, retries + 1):
        try:
            with urlopen(req, timeout=DOWNLOAD_TIMEOUT_S) as resp:
                if resp.status != 200:
                    return None
                content_type = resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
                return resp.read(), content_type
        except HTTPError as e:
            if e.code in (500, 502, 503, 504) and attempt < retries:
                wait = attempt * 2
                print(f"    [warn] HTTP {e.code}, retry {attempt}/{retries - 1} in {wait}s...")
                time.sleep(wait)
            else:
                print(f"    [warn] download failed: {e}")
                return None
        except (URLError, Exception) as e:
            print(f"    [warn] download error: {e}")
            return None
    return None


def ext_for(content_type: str) -> str:
    if "png" in content_type:
        return "png"
    if "webp" in content_type:
        return "webp"
    return "jpg"


def upload_cover(supabase, mbid: str, image_bytes: bytes, content_type: str) -> str | None:
    """Upload to Supabase Storage and return the public URL, or None on failure."""
    filename = f"{mbid}.{ext_for(content_type)}"
    try:
        supabase.storage.from_(BUCKET).upload(
            filename,
            image_bytes,
            {"content-type": content_type, "upsert": "true"},
        )
    except Exception as e:
        # supabase-py raises on non-2xx; "already exists" with upsert=true shouldn't happen
        print(f"    [warn] storage upload failed: {e}")
        return None

    res = supabase.storage.from_(BUCKET).get_public_url(filename)
    # supabase-py returns the URL directly as a string
    return res if isinstance(res, str) else None


def fetch_albums(supabase, page: int, batch_size: int) -> list[dict]:
    """Fetch one page of albums that need cover migration."""
    offset = page * batch_size
    res = (
        supabase.table("albums")
        .select("id, mbid, cover_url")
        .not_.is_("cover_url", "null")
        .not_.is_("mbid", "null")
        .range(offset, offset + batch_size - 1)
        .execute()
    )
    return res.data or []


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill album covers to Supabase Storage")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no writes")
    parser.add_argument("--limit", type=int, default=0, help="Max albums to process (0 = all)")
    parser.add_argument("--batch-size", type=int, default=50, help="DB fetch page size")
    args = parser.parse_args()

    supabase = get_client()

    stats = {"skipped_already_stored": 0, "ok": 0, "failed_download": 0, "failed_upload": 0, "no_mbid": 0}
    total_processed = 0
    page = 0

    print(f"{'[DRY RUN] ' if args.dry_run else ''}Starting cover backfill...")

    while True:
        albums = fetch_albums(supabase, page, args.batch_size)
        if not albums:
            break

        for album in albums:
            if args.limit and total_processed >= args.limit:
                break

            album_id = album["id"]
            mbid = album.get("mbid")
            cover_url = album.get("cover_url", "")

            if not mbid:
                stats["no_mbid"] += 1
                continue

            if is_already_in_supabase(cover_url):
                stats["skipped_already_stored"] += 1
                continue

            total_processed += 1
            print(f"  [{total_processed}] {album_id} — {cover_url[:80]}...")

            if args.dry_run:
                print("    [dry-run] would download + upload")
                stats["ok"] += 1
                continue

            result = download_image(cover_url)
            if result is None:
                print("    ✗ download failed")
                stats["failed_download"] += 1
                time.sleep(SLEEP_BETWEEN_S)
                continue

            image_bytes, content_type = result
            new_url = upload_cover(supabase, mbid, image_bytes, content_type)
            if new_url is None:
                print("    ✗ upload failed")
                stats["failed_upload"] += 1
                time.sleep(SLEEP_BETWEEN_S)
                continue

            # Update cover_url in DB
            supabase.table("albums").update({"cover_url": new_url}).eq("id", album_id).execute()
            print(f"    ✓ {new_url}")
            stats["ok"] += 1
            time.sleep(SLEEP_BETWEEN_S)

        page += 1
        if args.limit and total_processed >= args.limit:
            break

    print("\n── Summary ──────────────────────────────")
    print(f"  Migrated successfully : {stats['ok']}")
    print(f"  Already in Supabase  : {stats['skipped_already_stored']}")
    print(f"  Download failures    : {stats['failed_download']}")
    print(f"  Upload failures      : {stats['failed_upload']}")
    print(f"  Skipped (no mbid)    : {stats['no_mbid']}")


if __name__ == "__main__":
    main()
