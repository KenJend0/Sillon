import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const EchoSchema = z.object({
    message: z.string().min(1)
});

router.post('/echo', (req, res) => {
    const parse = EchoSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
    }
    const { message } = parse.data;
    res.json({ echoed: message, at: new Date().toISOString() });
});

export default router;
