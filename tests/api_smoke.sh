#!/usr/bin/env bash
set -euo pipefail

API=${API:-http://localhost:4000}

echo "1) /health"
curl -sf "$API/health" | jq '.status' >/dev/null && echo "  OK"

echo "2) /dbcheck"
curl -sf "$API/dbcheck" | jq '.ok' >/dev/null && echo "  OK"

# IGOR (Tyler, The Creator) – release MBID de ton test
MBID=${MBID:-4603cee3-ece6-435c-b0b7-7d9eb1842d36}

echo "3) /catalog/import?mbid=$MBID (idempotent)"
OUT=$(curl -sf "$API/catalog/import?mbid=$MBID")
echo "  Response: $OUT"
ALBUM_ID=$(echo "$OUT" | jq -r '.albumId')
TRACKS=$(echo "$OUT" | jq -r '.tracks')

[ "$TRACKS" -ge 1 ] && echo "  Tracks OK ($TRACKS)" || { echo "  Tracks KO"; exit 1; }

echo "4) /albums/:id"
curl -sf "$API/albums/$ALBUM_ID" | jq '.album.title,.tracks|length' >/dev/null && echo "  OK"

echo "All API smoke tests passed."
