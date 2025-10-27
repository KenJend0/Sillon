import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';

const router = Router();

const QuerySchema = z.object({
    q: z.string().trim().min(1, 'q required'),
    // types=artist,album,track (par défaut: tous)
    types: z.string().optional(), // "artist,album,track"
    limit: z.coerce.number().int().min(1).max(20).optional() // par type
});

router.get('/', async (req, res) => {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const q = parsed.data.q;
    const limit = parsed.data.limit ?? 5;

    const allowed = new Set(['artist','album','track']);
    const types = (parsed.data.types?.split(',').map(s => s.trim()) ?? ['artist','album','track'])
        .filter(t => allowed.has(t)) as Array<'artist'|'album'|'track'>;
    if (types.length === 0) types.push('artist','album','track');

    // Petite règle:
    // - si q < 3 chars -> on évite similarity et on fait ILIKE strict pour limiter le bruit
    // - sinon -> similarity + fallback ILIKE
    const short = q.length < 3;

    try {
        const results: Record<string, any[]> = {};

        if (types.includes('artist')) {
            const { rows } = await pool.query(
                short
                    ? `
          SELECT id, name, NULL::TEXT AS extra, 1.0::float AS score
          FROM artists
          WHERE name ILIKE '%' || $1 || '%'
          ORDER BY length(name) ASC
          LIMIT $2
        ` : `
          SELECT id, name, NULL::TEXT AS extra,
                 GREATEST(similarity(name, $1), CASE WHEN name ILIKE '%' || $1 || '%' THEN 0.4 ELSE 0 END) AS score
          FROM artists
          WHERE similarity(name, $1) > 0.2 OR name ILIKE '%' || $1 || '%'
          ORDER BY score DESC, length(name) ASC
          LIMIT $2
        `,
                [q, limit]
            );
            results.artists = rows.map(r => ({
                type: 'artist',
                id: r.id,
                name: r.name,
                score: Number(r.score)
            }));
        }

        if (types.includes('album')) {
            const { rows } = await pool.query(
                short
                    ? `
          SELECT a.id, a.title, ar.name AS extra, a.cover_url,
                 1.0::float AS score
          FROM albums a
          JOIN artists ar ON ar.id = a.artist_id
          WHERE a.title ILIKE '%' || $1 || '%'
          ORDER BY length(a.title) ASC
          LIMIT $2
        ` : `
          SELECT a.id, a.title, ar.name AS extra, a.cover_url,
                 GREATEST(similarity(a.title, $1), CASE WHEN a.title ILIKE '%' || $1 || '%' THEN 0.4 ELSE 0 END) AS score
          FROM albums a
          JOIN artists ar ON ar.id = a.artist_id
          WHERE similarity(a.title, $1) > 0.2 OR a.title ILIKE '%' || $1 || '%'
          ORDER BY score DESC, length(a.title) ASC
          LIMIT $2
        `,
                [q, limit]
            );
            results.albums = rows.map(r => ({
                type: 'album',
                id: r.id,
                title: r.title,
                artist: r.extra,
                cover_url: r.cover_url,
                score: Number(r.score)
            }));
        }

        if (types.includes('track')) {
            const { rows } = await pool.query(
                short
                    ? `
          SELECT t.id, t.title, CONCAT(ar.name, ' — ', al.title) AS extra, t.duration_ms,
                 1.0::float AS score
          FROM tracks t
          JOIN artists ar ON ar.id = t.artist_id
          JOIN albums  al ON al.id = t.album_id
          WHERE t.title ILIKE '%' || $1 || '%'
          ORDER BY length(t.title) ASC
          LIMIT $2
        ` : `
          SELECT t.id, t.title, CONCAT(ar.name, ' — ', al.title) AS extra, t.duration_ms,
                 GREATEST(similarity(t.title, $1), CASE WHEN t.title ILIKE '%' || $1 || '%' THEN 0.4 ELSE 0 END) AS score
          FROM tracks t
          JOIN artists ar ON ar.id = t.artist_id
          JOIN albums  al ON al.id = t.album_id
          WHERE similarity(t.title, $1) > 0.2 OR t.title ILIKE '%' || $1 || '%'
          ORDER BY score DESC, length(t.title) ASC
          LIMIT $2
        `,
                [q, limit]
            );
            results.tracks = rows.map(r => ({
                type: 'track',
                id: r.id,
                title: r.title,
                context: r.extra,     // "Artist — Album"
                duration_ms: r.duration_ms,
                score: Number(r.score)
            }));
        }

        res.json({ q, limit, results });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'search_failed' });
    }
});
// ...imports/route existants...
router.get('/', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const limit = Math.min(Number(req.query.limit ?? 5), 20);
    const types = String(req.query.types ?? 'artist,album,track,user')
        .split(',').map(s => s.trim()).filter(Boolean);

    const results: any = { artists: [], albums: [], tracks: [], users: [] };

    try {
        // ... tes requêtes artists/albums/tracks

        if (types.includes('user') && q) {
            const { rows } = await pool.query(
                `SELECT id, display_name, username, picture_url
           FROM users
          WHERE display_name ILIKE '%' || $1 || '%'
             OR username     ILIKE '%' || $1 || '%'
          ORDER BY (CASE WHEN username ILIKE $2 THEN 0 ELSE 1 END),
                   (CASE WHEN display_name ILIKE $2 THEN 0 ELSE 1 END),
                   display_name ASC
          LIMIT $3`,
                [q, q, limit]
            );
            results.users = rows.map(r => ({
                type: 'user',
                id: r.id,
                name: r.display_name,
                username: r.username,
                picture_url: r.picture_url,
                score: 0.5, // simple placeholder
            }));
        }

        res.json({ q, limit, results });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'search_failed' });
    }
});

export default router;
