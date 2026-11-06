import { USER_ROLES } from "./src/constants/index.js";

declare global {
    namespace Express {
        interface Request {
            user?: {
                role?: USER_ROLES;
                id: string;
            };
            session?: any;
        }
    }
}

export {};
