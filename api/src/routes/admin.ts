import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// ⚠️ Auth simple : à durcir si tu ajoutes des rôles
function isAdmin(user: any) {
    return user?.username === "teyssir"; // provisoire
}

/* ================== PREVIEW DISCOVER ================== */
router.get("/admin/discover/preview", requireAuth, async (req, res) => {
    const me = (req as any).user;
    if (!isAdmin(me)) return res.status(403).json({ error: "forbidden" });

    try {
        // Weekly top (dernière semaine)
        const { rows: weekly } = await pool.query(
            `
      SELECT a.id AS album_id, a.title, ar.name AS artist_name,
             ROUND(AVG(rt.score)::numeric,2) AS avg_score,
             COUNT(*) AS nb_ratings
      FROM ratings rt
      JOIN albums a ON a.id = rt.album_id
      JOIN artists ar ON ar.id = a.artist_id
      WHERE rt.updated_at >= NOW() - interval '7 days'
      GROUP BY a.id, a.title, ar.name
      HAVING COUNT(*) >= 3
      ORDER BY avg_score DESC, nb_ratings DESC
      LIMIT 5;
      `
        );

        // Global top (all time)
        const { rows: global } = await pool.query(
            `
      SELECT a.id AS album_id, a.title, ar.name AS artist_name,
             ROUND(AVG(rt.score)::numeric,2) AS avg_score,
             COUNT(*) AS nb_ratings
      FROM ratings rt
      JOIN albums a ON a.id = rt.album_id
      JOIN artists ar ON ar.id = a.artist_id
      GROUP BY a.id, a.title, ar.name
      HAVING COUNT(*) >= 5
      ORDER BY avg_score DESC, nb_ratings DESC
      LIMIT 5;
      `
        );

        res.json({
            weekly_candidates: weekly,
            global_candidates: global
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "discover_preview_failed" });
    }
});

/* ================== REFRESH DISCOVER ================== */
router.post("/admin/discover/refresh", requireAuth, async (req, res) => {
    const me = (req as any).user;
    if (!isAdmin(me)) return res.status(403).json({ error: "forbidden" });

    try {
        // Weekly insert
        await pool.query(`
            INSERT INTO discover_items (id, starts_at, ends_at, discover_kind, album_id, score, algo)
            SELECT
                'weekly_' || a.id || '_' || to_char(NOW(), 'IYYY_IW'),
                NOW(),
                NOW() + interval '7 days',
                'trending_week',
                a.id,
                AVG(rt.score) AS score,
                'weekly_top'
            FROM ratings rt
                JOIN albums a ON a.id = rt.album_id
            WHERE rt.updated_at >= NOW() - interval '7 days'
            GROUP BY a.id
            HAVING COUNT(*) >= 3
            ORDER BY AVG(rt.score) DESC
                LIMIT 5
            ON CONFLICT (id) DO NOTHING;
        `);

        // Global insert
        await pool.query(`
            INSERT INTO discover_items (id, starts_at, ends_at, discover_kind, album_id, score, algo)
            SELECT
                'global_' || a.id,
                NOW(),
                NOW() + interval '30 days',
                'all_time_top',
                a.id,
                AVG(rt.score) AS score,
                'global_top'
            FROM ratings rt
                JOIN albums a ON a.id = rt.album_id
            GROUP BY a.id
            HAVING COUNT(*) >= 5
            ORDER BY AVG(rt.score) DESC
                LIMIT 5
            ON CONFLICT (id) DO NOTHING;
        `);

        res.json({ ok: true, message: "discover_items refreshed ✅" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "discover_refresh_failed" });
    }
});



export default router;
