import type { NextFunction, Request, Response } from "express";
import { USER_ROLES } from "../constants/index.js";

export const authorise = (allowedRoles: USER_ROLES[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const currentUserRole = req.user?.role;

        if (!currentUserRole || !allowedRoles.includes(currentUserRole)) {
            return res.status(403).json({
                error: "Forbidden",
                message: "Access Denied: This action is unavailable for your profile"
            });
        }

        next();
    };
};