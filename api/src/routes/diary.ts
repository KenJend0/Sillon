import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import {requireAuthOptional} from "../middleware/requireAuthOptional";

const router = Router();

const CreateDiarySchema = z.object({
    albumId: z.string().uuid(),
    listenedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
    reListen: z.boolean().optional(),
    rating: z.number().int().min(1).max(10).optional(),
    reviewTitle: z.string().max(200).optional(),
    reviewBody: z.string().max(10000).optional(),
    isPublic: z.boolean().optional(),
});

// POST /diary : créer/mettre à jour l’entrée du jour pour un album
router.post('/', requireAuth, async (req, res) => {
    const parse = CreateDiarySchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: 'invalid_payload', details: parse.error.flatten() });
    }
    const { albumId, listenedAt, reListen, rating, reviewTitle, reviewBody, isPublic } = parse.data;
    const user = (req.session as any).user;

    try {
        const { rows } = await pool.query(
            `INSERT INTO diary_entries (user_id, album_id, listened_at, re_listen, rating, review_title, review_body, is_public)
             VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), COALESCE($4, FALSE), $5, $6, $7, COALESCE($8, TRUE))
                 ON CONFLICT (user_id, album_id, listened_at) DO UPDATE
                                                                     SET re_listen   = EXCLUDED.re_listen,
                                                                     rating      = COALESCE(EXCLUDED.rating, diary_entries.rating),
                                                                     review_title= COALESCE(EXCLUDED.review_title, diary_entries.review_title),
                                                                     review_body = COALESCE(EXCLUDED.review_body, diary_entries.review_body),
                                                                     is_public   = EXCLUDED.is_public,
                                                                     updated_at  = now()
                                                                     RETURNING *`,
            [user.id, albumId, listenedAt ?? null, reListen ?? null, rating ?? null, reviewTitle ?? null, reviewBody ?? null, isPublic ?? null]
        );
        res.json({ ok: true, entry: rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'internal_error' });
    }
});

// GET /diary/users/:id/diary?limit=20 — journal d’un user (si pas soi-même: public only)
router.get('/users/:id/diary', requireAuthOptional, async (req, res) => {
    const targetUserId = req.params.id;
    const sessionUser = (req as any).user;
    const viewerId = sessionUser ? sessionUser.id : null;
    const limit = Math.min(Number(req.query.limit ?? 20), 100);

    try {
        const { rows } = await pool.query(
            `SELECT d.id, d.user_id, d.album_id, d.listened_at, d.rating,
                    d.review_title, d.review_body, d.created_at,
                    a.title AS album_title, a.cover_url,
                    ar.name AS artist_name, ar.id AS artist_id,
                    (SELECT COUNT(*) FROM diary_likes WHERE entry_id = d.id) AS likes_count,
                    (CASE
                         WHEN $3::uuid IS NOT NULL
                        THEN EXISTS (
                        SELECT 1 FROM diary_likes l
                        WHERE l.entry_id = d.id AND l.user_id = $3
                        )
                        ELSE false
                        END) AS is_liked
             FROM diary_entries d
                      JOIN albums a ON a.id = d.album_id
                      JOIN artists ar ON ar.id = a.artist_id
             WHERE d.user_id = $1
             ORDER BY d.listened_at DESC, d.created_at DESC
                 LIMIT $2`,
            [targetUserId, limit, viewerId]
        );

        res.json({ items: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'diary_failed' });
    }
});


// GET /diary/albums/:id/reviews?limit=20 — reviews publiques d’un album
router.get('/albums/:id/reviews', requireAuthOptional, async (req, res) => {
    const albumId = req.params.id;
    const sessionUser = (req as any).user;
    const viewerId = sessionUser ? sessionUser.id : null;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);

    try {
        const { rows } = await pool.query(
            `SELECT d.id, d.user_id, d.album_id, d.listened_at, d.rating,
                    d.review_title, d.review_body, d.created_at,
                    u.display_name, u.picture_url, u.username,
                    (SELECT COUNT(*) FROM diary_likes WHERE entry_id = d.id) AS likes_count,
                    (CASE
                         WHEN $3::uuid IS NOT NULL
                        THEN EXISTS (
                        SELECT 1 FROM diary_likes l
                        WHERE l.entry_id = d.id AND l.user_id = $3
                        )
                        ELSE false
                        END) AS is_liked
             FROM diary_entries d
                      JOIN users u ON u.id = d.user_id
             WHERE d.album_id = $1
             ORDER BY d.created_at DESC
                 LIMIT $2`,
            [albumId, limit, viewerId]
        );

        res.json({ items: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'reviews_failed' });
    }
});

// PATCH /diary/:entryId
router.patch('/:entryId', requireAuth, async (req, res) => {
    const me = (req as any).user;
    const entryId = req.params.entryId;
    const { rating, review_title, review_body, listened_at, is_public } = req.body;

    try {
        // Vérifier que la review existe et m’appartient
        const check = await pool.query(
            `SELECT user_id FROM diary_entries WHERE id=$1`,
            [entryId]
        );
        if (check.rowCount === 0) return res.status(404).json({ error: 'not_found' });
        if (check.rows[0].user_id !== me.id)
            return res.status(403).json({ error: 'forbidden' });

        // Mise à jour
        const { rows } = await pool.query(
            `UPDATE diary_entries
             SET rating = COALESCE($1, rating),
                 review_title = COALESCE($2, review_title),
                 review_body = COALESCE($3, review_body),
                 listened_at = COALESCE($4, listened_at),
                 is_public = COALESCE($5, is_public),
                 updated_at = NOW()
             WHERE id=$6
             RETURNING *`,
            [rating, review_title, review_body, listened_at, is_public, entryId]
        );

        res.json({ ok: true, review: rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'update_failed' });
    }
});

// DELETE /diary/:entryId
router.delete('/:entryId', requireAuth, async (req, res) => {
    const me = (req as any).user;
    const entryId = req.params.entryId;

    try {
        const check = await pool.query(
            `SELECT user_id FROM diary_entries WHERE id=$1`,
            [entryId]
        );
        if (check.rowCount === 0) return res.status(404).json({ error: 'not_found' });
        if (check.rows[0].user_id !== me.id)
            return res.status(403).json({ error: 'forbidden' });

        await pool.query(`DELETE FROM diary_entries WHERE id=$1`, [entryId]);

        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'delete_failed' });
    }
});


export default router;
