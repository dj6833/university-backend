import { slidingWindow } from "@arcjet/node";
import type { ArcjetNodeRequest } from "@arcjet/node";
import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node"; // ◄ Added this import

import aj from "../config/arcjet.js";
import { auth } from "../lib/auth.js"; // ◄ Import your actual initialized Better Auth server instance

// Extend Express Request types locally if TypeScript complains about req.user or req.session
interface AuthenticatedRequest extends Request {
    user?: any;
    session?: any;
}

const securityMiddleware = async (
    req: AuthenticatedRequest, // ◄ Using our extended type
    res: Response,
    next: NextFunction
) => {
    try {
        console.log("here1")
        // BETTER AUTH SESSION CHECK (Runs globally across environments)
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        // Attach the user context if found, otherwise they stay guest/undefined
        if (session && session.user) {
            req.user = session.user;
            req.session = session.session;
        }

        // Environment bypass rule for local development
        if (['test', 'development'].includes(<string>process.env.NODE_ENV)){
           return next();
        }

        // ARCJET SECURITY & RATE LIMITING
        const role = req.user?.role ?? "guest";

        let limit: number;
        let message: string;

        switch (role) {
            case "admin":
                limit = 20;
                message = "Admin request limit exceeded (20 per minute). Slow down!";
                break;
            case "teacher":
            case "student":
                limit = 10;
                message = "User request limit exceeded (10 per minute). Please wait.";
                break;
            default:
                limit = 5;
                message =
                    "Guest request limit exceeded (5 per minute). Please sign up for higher limits.";
                break;
        }

        const client = aj.withRule(
            slidingWindow({
                mode: "LIVE",
                interval: "1m",
                max: limit,
            })
        );

        const arcjetRequest: ArcjetNodeRequest = {
            headers: req.headers,
            method: req.method,
            url: req.originalUrl ?? req.url,
            socket: {
                remoteAddress: req.socket.remoteAddress ?? req.ip ?? "0.0.0.0",
            },
        };

        const decision = await client.protect(arcjetRequest);

        if (decision.isDenied() && decision.reason.isBot()) {
            return res.status(403).json({
                error: "Forbidden",
                message: "Automated requests are not allowed",
            });
        }

        if (decision.isDenied() && decision.reason.isShield()) {
            return res.status(403).json({
                error: "Forbidden",
                message: "Request blocked by security policy",
            });
        }

        if (decision.isDenied() && decision.reason.isRateLimit()) {
            return res.status(429).json({
                error: "Too Many Requests",
                message,
            });
        }

        next();
    } catch (error) {
        console.error("Arcjet/Auth middleware error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Something went wrong with the security middleware.",
        });
    }
};

export default securityMiddleware;
