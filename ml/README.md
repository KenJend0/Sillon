# Waveform — ML Pipeline

Batch recommendation system for Waveform. Runs daily via GitHub Actions, stores precomputed results in Supabase. Next.js reads results directly — no live ML service.

---

## Architecture

```
GitHub Actions (cron 03:00 UTC)
  │
  ├─ compute_user_vectors.py
  │    Fetch diary_entries → build user-item matrix → mean-center
  │    → cosine similarity → store in user_taste_vectors + user_similarity
  │
  ├─ compute_recommendations.py
  │    Load neighbours from user_similarity → weighted CF score
  │    → store in user_recommendations (method='cosine_cf')
  │
  └─ evaluate_metrics.py  (schedule only)
       Leave-one-out CV → Precision@K, Recall@K, NDCG@K
       → store in recommendation_metrics
```

**Supabase tables written by this pipeline:**

| Table | Description |
|---|---|
| `user_taste_vectors` | Mean-centered rating vector per user |
| `user_similarity` | Top-50 cosine-similar pairs per user |
| `user_recommendations` | Ranked album recs per user |
| `recommendation_metrics` | Offline evaluation results |

---

## Signals used

| Signal | Source | Weight |
|---|---|---|
| Explicit ratings (0–10) | `diary_entries.rating` | Primary |
| Mean-centering bias correction | per-user mean | Corrects harsh/lenient raters |
| Social graph (follows) | `follows` | Phase 2 — social boosting |
| Genre tags | `album_genres` | Phase 2 — content-based |
| Re-listen count | `diary_entries` | Phase 2 |

---

## Algorithms by phase

### Phase 0 (current) — Cosine user-based CF
1. Build matrix R[user][album] = rating, NaN if unseen
2. Mean-center: R'[u][i] = R[u][i] − mean(R[u, :])  — removes rating scale bias
3. Cosine similarity: sim(u,v) = R'_u · R'_v / (‖R'_u‖ · ‖R'_v‖)
4. Recommendation score: score(u, album) = Σ sim(u,v)·R[v,album] / Σ sim(u,v)

### Phase 1 — Hybrid CF + Content-based (genre vectors)
- Content score = cosine(user_genre_profile, album_genre_vector)
- Final score = 0.7 × CF_score + 0.3 × content_score

### Phase 2 — Matrix Factorization (SVD / ALS)
- `scipy.sparse.linalg.svds` for explicit ratings
- `implicit` ALS for implicit signals (saves, re-listens)
- Latent factors stored in pgvector

---

## Setup

```bash
cd ml
pip install -r requirements.txt
cp .env.example .env   # fill in Supabase credentials
```

Run the SQL migration first:
```
supabase_migration_ml_tables.sql  (via Supabase SQL editor)
```

---

## Usage

```bash
# Phase 0: compute vectors + similarity
python ml/scripts/compute_user_vectors.py --dry-run   # stats only
python ml/scripts/compute_user_vectors.py              # writes to DB

# Phase 1: compute recommendations
python ml/scripts/compute_recommendations.py --dry-run
python ml/scripts/compute_recommendations.py

# Phase 2: evaluate quality
python ml/scripts/evaluate_metrics.py --method cosine_cf --k 5,10,20
```

---

## GitHub Actions secrets required

Add these in **Settings → Secrets → Actions**:

| Secret | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | service_role key (bypasses RLS) |

---

## Evaluation results

Stored in `recommendation_metrics`. Query via Supabase or `/api/admin/ml-metrics`.

| Metric | Definition |
|---|---|
| Precision@K | Fraction of top-K recs that are relevant |
| Recall@K | Fraction of relevant items found in top-K |
| NDCG@K | Ranking quality — rewards relevant items ranked higher |
