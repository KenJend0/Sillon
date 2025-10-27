import { Request, Response, NextFunction } from "express";

export function requireAuthOptional(req: Request, res: Response, next: NextFunction) {
    if (req.session?.user) {
        (req as any).user = req.session.user;
    }
    next();
}
