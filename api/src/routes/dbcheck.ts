import { Router } from 'express';
import pg from 'pg';

const router = Router();
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

router.get('/', async (_req, res) => {
    try {
        const { rows } = await pool.query(`SELECT now() as now`);
        res.json({ ok: true, now: rows[0].now });
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false });
    }
});

export default router;
