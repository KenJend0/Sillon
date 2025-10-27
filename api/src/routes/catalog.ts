import { Router } from 'express';
import { z } from 'zod';
import { importReleaseByMBID } from '../services/catalog';

const router = Router();

router.get('/import', async (req, res) => {
    const schema = z.object({ mbid: z.string().uuid() });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'mbid invalide' });

    try {
        const out = await importReleaseByMBID(parsed.data.mbid);
        res.json({ ok: true, ...out });
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false, error: 'import_failed' });
    }
});

export default router;
