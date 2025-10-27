import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// GET /tracks/:id -> infos track + album + artist
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { rows } = await pool.query(
            `SELECT t.id, t.title, t.duration_ms, t.track_no, t.disc_no, t.mbid,
              a.id AS album_id, a.title AS album_title, a.cover_url, a.release_date,
              ar.id AS artist_id, ar.name AS artist_name
       FROM tracks t
       JOIN albums a ON a.id = t.album_id
       JOIN artists ar ON ar.id = a.artist_id
       WHERE t.id = $1
       LIMIT 1`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'not_found' });
        res.json({ track: rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'internal_error' });
    }
});

export default router;
