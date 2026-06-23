declare global {
    namespace Express {
        interface Request {
            user?: {
                role?: "admin" | "teacher" | "student";
            };
            session?: any;
        }
    }
}

export {};
