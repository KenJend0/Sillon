import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Artiste + discographie (albums + nb de pistes)
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows: art } = await pool.query(
            `SELECT id, name, mbid
       FROM artists
       WHERE id = $1`,
            [id]
        );
        if (art.length === 0) return res.status(404).json({ error: 'artist_not_found' });

        const { rows: albums } = await pool.query(
            `SELECT a.id, a.title, a.cover_url, a.release_date,
              COUNT(t.id)::int AS track_count
       FROM albums a
       LEFT JOIN tracks t ON t.album_id = a.id
       WHERE a.artist_id = $1
       GROUP BY a.id
       ORDER BY a.release_date DESC NULLS LAST, a.title ASC`,
            [id]
        );

        res.json({ artist: art[0], albums });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'internal_error' });
    }
});

export default router;
