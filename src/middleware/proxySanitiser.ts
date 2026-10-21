import type { Request, Response, NextFunction } from 'express';
/**
 * tr-39; Middleware to sanitise comma-appended forwarding headers injected by Vercel's frontend > backend-API proxy layer.
 * Ensures requests (i.e. Better Auth which was failing) get a single clean string (e.g., "http") instead of a broken combined list ("http,http").
 */
export function proxySanitizer(req: Request, res: Response, next: NextFunction) {
    if (typeof req.headers['x-forwarded-proto'] === 'string' && req.headers['x-forwarded-proto'].includes(',')) {
        req.headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'].split(',')[0]?.trim();
    }

    if (typeof req.headers['x-forwarded-host'] === 'string' && req.headers['x-forwarded-host'].includes(',')) {
        req.headers['x-forwarded-host'] = req.headers['x-forwarded-host'].split(',')[0]?.trim();
    }

    next();
}