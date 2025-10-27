-- 1) FOLLOWS (user -> user)
CREATE TABLE IF NOT EXISTS follows (
                                       follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followee_id),
    CONSTRAINT chk_follow_self CHECK (follower_id <> followee_id)
    );
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id);

-- 2) LIKES (user -> diary_entry)
CREATE TABLE IF NOT EXISTS diary_likes (
                                           user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_id UUID NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, entry_id)
    );
CREATE INDEX IF NOT EXISTS idx_diary_likes_entry ON diary_likes(entry_id);

-- 3) COMMENTS (user -> diary_entry)
CREATE TABLE IF NOT EXISTS diary_comments (
                                              id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id  UUID NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body      TEXT NOT NULL CHECK (length(trim(body)) > 0),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_diary_comments_entry ON diary_comments(entry_id);
CREATE INDEX IF NOT EXISTS idx_diary_comments_user ON diary_comments(user_id);

-- 4) COMPTEURS DÉRIVÉS (faciles à lire, optionnels)
ALTER TABLE diary_entries
    ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;

-- 5) TRIGGERS pour garder les compteurs à jour
CREATE OR REPLACE FUNCTION inc_likes_count() RETURNS TRIGGER AS $$
BEGIN
UPDATE diary_entries SET likes_count = likes_count + 1 WHERE id = NEW.entry_id;
RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION dec_likes_count() RETURNS TRIGGER AS $$
BEGIN
UPDATE diary_entries SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.entry_id;
RETURN OLD;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_likes_inc ON diary_likes;
CREATE TRIGGER trg_likes_inc AFTER INSERT ON diary_likes
    FOR EACH ROW EXECUTE FUNCTION inc_likes_count();

DROP TRIGGER IF EXISTS trg_likes_dec ON diary_likes;
CREATE TRIGGER trg_likes_dec AFTER DELETE ON diary_likes
    FOR EACH ROW EXECUTE FUNCTION dec_likes_count();

-- comments_count
CREATE OR REPLACE FUNCTION inc_comments_count() RETURNS TRIGGER AS $$
BEGIN
UPDATE diary_entries SET comments_count = comments_count + 1 WHERE id = NEW.entry_id;
RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION dec_comments_count() RETURNS TRIGGER AS $$
BEGIN
UPDATE diary_entries SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.entry_id;
RETURN OLD;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comments_inc ON diary_comments;
CREATE TRIGGER trg_comments_inc AFTER INSERT ON diary_comments
    FOR EACH ROW EXECUTE FUNCTION inc_comments_count();

DROP TRIGGER IF EXISTS trg_comments_dec ON diary_comments;
CREATE TRIGGER trg_comments_dec AFTER DELETE ON diary_comments
    FOR EACH ROW EXECUTE FUNCTION dec_comments_count();
