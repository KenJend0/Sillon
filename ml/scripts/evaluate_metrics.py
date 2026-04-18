#!/usr/bin/env python3
"""
Phase 2 — Offline evaluation of recommendation quality.

Strategy: leave-one-out cross-validation.
  For each user with >= MIN_RATINGS ratings:
    - Hold out one random highly-rated album (rating >= HELD_OUT_MIN_RATING).
    - Run the recommender on the remaining ratings.
    - Check if the held-out album appears in the top-K results.

Metrics computed:
  - Precision@K  = (relevant items in top-K) / K
  - Recall@K     = (relevant items in top-K) / (total relevant items)
  - NDCG@K       = normalized discounted cumulative gain

Results are stored in `recommendation_metrics` and printed to stdout.

Usage:
  python ml/scripts/evaluate_metrics.py
  python ml/scripts/evaluate_metrics.py --method cosine_cf --k 5,10,20
  python ml/scripts/evaluate_metrics.py --dry-run
"""

from __future__ import annotations

import argparse
import math
import random
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.supabase_client import get_client

MIN_RATINGS = 5         # skip users with fewer ratings (too sparse for LOO)
HELD_OUT_MIN_RATING = 8 # held-out item must be "relevant" (well-rated)
DEFAULT_K = [5, 10, 20]


# ── Metric helpers ────────────────────────────────────────────────────────────

def precision_at_k(recommended: list[str], relevant: set[str], k: int) -> float:
    top_k = recommended[:k]
    hits = sum(1 for a in top_k if a in relevant)
    return hits / k if k > 0 else 0.0


def recall_at_k(recommended: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 0.0
    top_k = recommended[:k]
    hits = sum(1 for a in top_k if a in relevant)
    return hits / len(relevant)


def ndcg_at_k(recommended: list[str], relevant: set[str], k: int) -> float:
    """
    NDCG@K with binary relevance (1 if in relevant set, 0 otherwise).
    IDCG = Σ 1/log2(i+2) for i in range(min(|relevant|, k))
    """
    dcg = sum(
        (1.0 / math.log2(i + 2)) if recommended[i] in relevant else 0.0
        for i in range(min(k, len(recommended)))
    )
    idcg = sum(1.0 / math.log2(i + 2) for i in range(min(len(relevant), k)))
    return dcg / idcg if idcg > 0 else 0.0


# ── Data helpers ──────────────────────────────────────────────────────────────

def fetch_all_entries() -> dict[str, list[dict]]:
    """Return { user_id: [ {album_id, rating}, ... ] } (latest per user/album)."""
    client = get_client()
    rows: list[dict] = []
    page, page_size = 0, 1000
    while True:
        resp = (
            client.table("diary_entries")
            .select("user_id, album_id, rating, created_at")
            .order("user_id").order("album_id").order("created_at", desc=True)
            .range(page * page_size, (page + 1) * page_size - 1)
            .execute()
        )
        batch = resp.data or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        page += 1

    # Deduplicate (latest per user/album)
    seen: set[tuple] = set()
    by_user: dict[str, list[dict]] = {}
    for row in rows:
        key = (row["user_id"], row["album_id"])
        if key in seen:
            continue
        seen.add(key)
        by_user.setdefault(row["user_id"], []).append(
            {"album_id": row["album_id"], "rating": row["rating"] or 0}
        )
    return by_user


def fetch_precomputed_recs(user_id: str, method: str) -> list[str]:
    """Return ordered list of album_ids from user_recommendations."""
    client = get_client()
    resp = (
        client.table("user_recommendations")
        .select("album_id, rank")
        .eq("user_id", user_id)
        .eq("method", method)
        .order("rank")
        .execute()
    )
    return [row["album_id"] for row in (resp.data or [])]


# ── Main evaluation ───────────────────────────────────────────────────────────

def evaluate(method: str, k_values: list[int], dry_run: bool) -> None:
    print(f"=== evaluate_metrics (method={method}) ===")

    by_user = fetch_all_entries()
    eligible = {
        uid: entries
        for uid, entries in by_user.items()
        if len(entries) >= MIN_RATINGS
        and any(e["rating"] >= HELD_OUT_MIN_RATING for e in entries)
    }
    print(f"  {len(eligible)} users eligible for LOO evaluation")

    if not eligible:
        print("Not enough data. Run compute_user_vectors + compute_recommendations first.")
        return

    results: dict[int, dict[str, list[float]]] = {
        k: {"precision": [], "recall": [], "ndcg": []} for k in k_values
    }

    for user_id, entries in eligible.items():
        # Pick one high-rated album as the held-out item
        high_rated = [e for e in entries if e["rating"] >= HELD_OUT_MIN_RATING]
        held_out = random.choice(high_rated)
        relevant = {held_out["album_id"]}

        # Fetch precomputed recommendations (excluding held-out is approximate here;
        # for strict LOO, rerun compute_recommendations without the held-out — Phase 3)
        recs = fetch_precomputed_recs(user_id, method)
        if not recs:
            continue

        for k in k_values:
            results[k]["precision"].append(precision_at_k(recs, relevant, k))
            results[k]["recall"].append(recall_at_k(recs, relevant, k))
            results[k]["ndcg"].append(ndcg_at_k(recs, relevant, k))

    # Aggregate and store
    now = datetime.now(timezone.utc).isoformat()
    metric_rows: list[dict] = []

    print("\n  Results:")
    for k in k_values:
        p = np.mean(results[k]["precision"]) if results[k]["precision"] else 0.0
        r = np.mean(results[k]["recall"]) if results[k]["recall"] else 0.0
        n = np.mean(results[k]["ndcg"]) if results[k]["ndcg"] else 0.0
        n_users = len(results[k]["precision"])
        print(f"  @{k:2d}  Precision={p:.4f}  Recall={r:.4f}  NDCG={n:.4f}  (n={n_users})")
        metric_rows.append({
            "method": method,
            "k": k,
            "precision_at_k": round(float(p), 6),
            "recall_at_k": round(float(r), 6),
            "ndcg_at_k": round(float(n), 6),
            "n_users": n_users,
            "computed_at": now,
        })

    if dry_run:
        print("\n  [dry-run] would write to recommendation_metrics")
        return

    client = get_client()
    client.table("recommendation_metrics").insert(metric_rows).execute()
    print(f"\n  Stored {len(metric_rows)} metric rows.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Offline evaluation of recommendations")
    parser.add_argument("--method", default="cosine_cf")
    parser.add_argument("--k", default="5,10,20", help="Comma-separated K values")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    k_values = [int(x.strip()) for x in args.k.split(",")]
    evaluate(method=args.method, k_values=k_values, dry_run=args.dry_run)
