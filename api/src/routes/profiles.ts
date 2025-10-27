import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { requireAuthOptional } from "../middleware/requireAuthOptional";

const router = Router();

// Helper pour détecter un UUID v4
function isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

// GET /profiles/:idOrUsername
router.get('/:idOrUsername', requireAuthOptional, async (req, res) => {
    const key = req.params.idOrUsername;

    try {
        let query: string;
        if (isUUID(key)) {
            query = `SELECT id, email, display_name, picture_url, username FROM users WHERE id::text = $1 LIMIT 1`;
        } else {
            query = `SELECT id, email, display_name, picture_url, username FROM users WHERE username = $1 LIMIT 1`;
        }

        const { rows } = await pool.query(query, [key]);
        if (rows.length === 0) return res.status(404).json({ error: 'not_found' });

        const { email, ...pub } = rows[0];
        const sessionUser = (req as any).user;
        const isMe = sessionUser && sessionUser.id === pub.id;

        // Vérifier si l’utilisateur courant suit ce profil
        let isFollowing = false;
        if (sessionUser && !isMe) {
            const result = await pool.query(
                `SELECT 1 FROM follows WHERE follower_id=$1 AND followee_id=$2`,
                [sessionUser.id, pub.id]
            );
            isFollowing = (result.rowCount ?? 0) > 0;
        }

        // Récupérer les compteurs
        const { rows: counts } = await pool.query(
            `SELECT
                     (SELECT COUNT(*) FROM follows WHERE followee_id = $1) AS followers_count,
                     (SELECT COUNT(*) FROM follows WHERE follower_id = $1) AS following_count`,
            [pub.id]
        );

        res.json({
            user: {
                ...pub,
                ...counts[0],
                is_me: isMe,
                is_following: isFollowing,
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'internal_error' });
    }
});

// GET /profiles/me/self (profil du user courant)
router.get('/me/self', requireAuth, async (req, res) => {
    const me = (req as any).user;
    try {
        const { rows } = await pool.query(
            `SELECT u.id, u.display_name, u.picture_url, u.username,
                    c.followers_count, c.following_count
             FROM users u
                      LEFT JOIN user_social_counts c ON c.id = u.id
             WHERE u.id = $1`,
            [me.id]
        );

        res.json({
            user: {
                ...rows[0],
                is_me: true,
                is_following: false, // toujours false car c'est soi-même
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'internal_error' });
    }
});

export default router;
