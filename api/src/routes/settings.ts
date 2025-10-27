import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// PATCH /settings/profile  { displayName?, username? }
router.patch('/profile', requireAuth, async (req, res) => {
    const me = (req as any).user;
    const displayName = req.body?.displayName;
    const username    = req.body?.username;

    // validations simples
    if (username != null && !/^[a-zA-Z0-9_.-]{2,32}$/.test(username)) {
        return res.status(400).json({ error: 'invalid_username' });
    }
    if (displayName != null && String(displayName).trim().length < 2) {
        return res.status(400).json({ error: 'invalid_display_name' });
    }

    try {
        const { rows } = await pool.query(
            `UPDATE users
          SET display_name = COALESCE($1, display_name),
              username     = COALESCE($2, username)
        WHERE id = $3
        RETURNING id, display_name, username, picture_url`,
            [displayName ?? null, username ?? null, me.id]
        );
        res.json({ ok: true, user: rows[0] });
    } catch (e: any) {
        // violation de contrainte unique sur username
        if (e?.code === '23505') {
            return res.status(409).json({ error: 'username_taken' });
        }
        console.error(e);
        res.status(500).json({ error: 'update_failed' });
    }
});

export default router;
