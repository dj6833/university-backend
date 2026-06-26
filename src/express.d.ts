declare global {
    namespace Express {
        interface Request {
            user?: {
                role?: "admin" | "teacher" | "student";
                id: string;
            };
            session?: any;
        }
    }
}

export {};
