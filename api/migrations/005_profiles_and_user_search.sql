-- 1) username unique (slug court)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username TEXT UNIQUE CHECK (username ~ '^[a-zA-Z0-9_\\.\\-]{2,32}$');

-- 2) indexes utiles pour recherche
CREATE INDEX IF NOT EXISTS idx_users_display_name_trgm ON users USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_username_trgm     ON users USING gin (username gin_trgm_ops);

-- 3) vue des compteurs social (followers/following)
CREATE OR REPLACE VIEW user_social_counts AS
SELECT
    u.id,
    (SELECT count(*) FROM follows f WHERE f.followee_id = u.id)  AS followers_count,
    (SELECT count(*) FROM follows f WHERE f.follower_id = u.id)  AS following_count
FROM users u;
