import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const user = (req.session as any)?.user;
    if (!user) return res.status(401).json({ error: 'Vous devez être connecté' });
    (req as any).user = user;  // <--- Fix: attache l’utilisateur à req.user
    next();
}
