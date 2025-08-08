import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization!;

    try {
        const decoded = jwt.verify(header, process.env.JWT_SECRET!)
        req.userId = decoded.sub as string;
        next();
    } catch (error) {
        res.send(403).send("Forbidden");
    }

}