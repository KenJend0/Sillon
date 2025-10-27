import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows: albumRows } = await pool.query(
            `SELECT a.id, a.title, a.cover_url, a.release_date,
                    ar.id AS artist_id, ar.name AS artist_name
             FROM albums a
                      JOIN artists ar ON ar.id = a.artist_id
             WHERE a.id = $1`,
            [id]
        );
        if (albumRows.length === 0) return res.status(404).json({ error: 'album_not_found' });
        const album = albumRows[0];

        const { rows: tracks } = await pool.query(
            `SELECT id, title, duration_ms, track_no, disc_no
             FROM tracks
             WHERE album_id = $1
             ORDER BY disc_no NULLS FIRST, track_no NULLS FIRST, title`,
            [id]
        );

        res.json({ album, tracks });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'internal_error' });
    }
});

export default router;
