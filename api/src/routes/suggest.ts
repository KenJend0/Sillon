import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';

const router = Router();

const Query = z.object({
    q: z.string().trim().min(1, 'q is required'),
    // 👇 commentaire mis à jour pour inclure user
    types: z.string().optional(), // "artist,album,track,user"
    limit: z.coerce.number().int().min(1).max(30).optional(), // total suggestions
});

router.get('/', async (req, res) => {
    const parsed = Query.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const q = parsed.data.q;
    const limitTotal = parsed.data.limit ?? 10;

    // ✅ autoriser aussi "user"
    const allowed = new Set(['artist', 'album', 'track', 'user']);
    const types = (parsed.data.types?.split(',').map(s => s.trim()) ?? ['artist','album','track','user'])
        .filter(t => allowed.has(t)) as Array<'artist'|'album'|'track'|'user'>;
    if (types.length === 0) types.push('artist','album','track','user');

    // répartition simple par type (ex: 10 totaux -> 3/3/4)
    const perType = Math.max(1, Math.ceil(limitTotal / types.length));
    const short = q.length < 3;

    try {
        const suggestions: Array<any> = [];

        /* ============ ARTISTS ============ */
        if (types.includes('artist')) {
            const { rows } = await pool.query(
                short
                    ? `
                            SELECT id, name AS label, NULL::text AS sublabel, NULL::text AS cover_url,
                                    1.0::float AS score
                            FROM artists
                            WHERE name ILIKE $1 || '%'
                            ORDER BY length(name) ASC
                                LIMIT $2
                    `
                    : `
                            SELECT id, name AS label, NULL::text AS sublabel, NULL::text AS cover_url,
                                    GREATEST(similarity(name, $1), CASE WHEN name ILIKE '%' || $1 || '%' THEN 0.4 ELSE 0 END) AS score
                            FROM artists
                            WHERE similarity(name, $1) > 0.2 OR name ILIKE '%' || $1 || '%'
                            ORDER BY score DESC, length(name) ASC
                                LIMIT $2
                    `,
                [q, perType]
            );
            for (const r of rows) {
                suggestions.push({ type: 'artist', id: r.id, label: r.label, sublabel: null, cover_url: null, score: Number(r.score) });
            }
        }

        /* ============ ALBUMS ============ */
        if (types.includes('album')) {
            const { rows } = await pool.query(
                short
                    ? `
                            SELECT a.id, a.title AS label, ar.name AS sublabel, a.cover_url,
                                   1.0::float AS score
                            FROM albums a
                                     JOIN artists ar ON ar.id = a.artist_id
                            WHERE a.title ILIKE $1 || '%'
                            ORDER BY length(a.title) ASC
                                LIMIT $2
                    `
                    : `
                            SELECT a.id, a.title AS label, ar.name AS sublabel, a.cover_url,
                                   GREATEST(similarity(a.title, $1), CASE WHEN a.title ILIKE '%' || $1 || '%' THEN 0.4 ELSE 0 END) AS score
                            FROM albums a
                                     JOIN artists ar ON ar.id = a.artist_id
                            WHERE similarity(a.title, $1) > 0.2 OR a.title ILIKE '%' || $1 || '%'
                            ORDER BY score DESC, length(a.title) ASC
                                LIMIT $2
                    `,
                [q, perType]
            );
            for (const r of rows) {
                suggestions.push({ type: 'album', id: r.id, label: r.label, sublabel: r.sublabel, cover_url: r.cover_url, score: Number(r.score) });
            }
        }

        /* ============ USERS ============ */
        if (types.includes('user') && q) {
            const { rows } = await pool.query(
                `
                    SELECT id, display_name, username, picture_url
                    FROM users
                    WHERE display_name ILIKE $2
                       OR username     ILIKE $2
                    ORDER BY (CASE WHEN username ILIKE $3 THEN 0 ELSE 1 END),
                        (CASE WHEN display_name ILIKE $3 THEN 0 ELSE 1 END),
                        display_name ASC
                        LIMIT $1
                `,
                // ✅ perType et pas "limit" (qui n'existe pas ici)
                [perType, `%${q}%`, q]
            );
            for (const r of rows) {
                // ✅ pousser dans "suggestions" (items n’existe pas encore)
                suggestions.push({
                    type: 'user',
                    id: r.id,
                    label: r.display_name,
                    sublabel: r.username ? `@${r.username}` : null,
                    cover_url: r.picture_url,
                    score: 0.9, // petit boost pour usernames matchés haut
                });
            }
        }

        /* ============ TRACKS ============ */
        if (types.includes('track')) {
            const { rows } = await pool.query(
                short
                    ? `
                            SELECT t.id, t.title AS label, CONCAT(ar.name, ' — ', al.title) AS sublabel, NULL::text AS cover_url,
                                    1.0::float AS score
                            FROM tracks t
                                     JOIN artists ar ON ar.id = t.artist_id
                                     JOIN albums  al ON al.id = t.album_id
                            WHERE t.title ILIKE $1 || '%'
                            ORDER BY length(t.title) ASC
                                LIMIT $2
                    `
                    : `
                            SELECT t.id, t.title AS label, CONCAT(ar.name, ' — ', al.title) AS sublabel, NULL::text AS cover_url,
                                    GREATEST(similarity(t.title, $1), CASE WHEN t.title ILIKE '%' || $1 || '%' THEN 0.4 ELSE 0 END) AS score
                            FROM tracks t
                                     JOIN artists ar ON ar.id = t.artist_id
                                     JOIN albums  al ON al.id = t.album_id
                            WHERE similarity(t.title, $1) > 0.2 OR t.title ILIKE '%' || $1 || '%'
                            ORDER BY score DESC, length(t.title) ASC
                                LIMIT $2
                    `,
                [q, perType]
            );
            for (const r of rows) {
                suggestions.push({ type: 'track', id: r.id, label: r.label, sublabel: r.sublabel, cover_url: r.cover_url, score: Number(r.score) });
            }
        }

        // tri global par score puis label plus court
        suggestions.sort((a, b) => (b.score - a.score) || (a.label.length - b.label.length));

        // tronquer et retirer le score pour l’UI
        const items = suggestions.slice(0, limitTotal).map(({ score, ...rest }) => rest);

        res.json({ q, limit: limitTotal, items });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'suggest_failed' });
    }
});

export default router;
