-- ============================================================
-- Migration: moderation — user_blocks + content_reports
-- Apply in Supabase SQL Editor
-- ============================================================

-- ── 1. user_blocks ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can manage only their own blocks
CREATE POLICY "users_manage_own_blocks"
  ON user_blocks FOR ALL
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- ── 2. content_reports ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_reports (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type    TEXT        NOT NULL CHECK (content_type IN ('diary_entry', 'diary_comment')),
  content_id      UUID        NOT NULL,
  reason          TEXT        NOT NULL DEFAULT 'inappropriate',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One report per (user, content) — prevents spam
  UNIQUE (reporter_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_created ON content_reports (created_at DESC);

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
CREATE POLICY "users_insert_own_reports"
  ON content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can read their own reports (service role reads all for admin)
CREATE POLICY "users_read_own_reports"
  ON content_reports FOR SELECT
  USING (auth.uid() = reporter_id);
