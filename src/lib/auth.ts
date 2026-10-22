import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db/index.js"; // your drizzle instance
import * as schema from "../db/schema/auth.js";

const activePort = process.env.PORT || 8000;
const activeHost = process.env.HOST || "http://127.0.0.1";
const localFallbackUrl = `${activeHost}:${activePort}/auth`;

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL || localFallbackUrl,
    trustedOrigins: [
        process.env.FRONTEND_URL!,
        "http://localhost:3000" //Vercel CLI development server proxy port
    ],
    advanced: {
        defaultCookieAttributes: {
            sameSite: "lax", // "lax" mode is more secure than "none" (possible now proxies make frontend/backend same-site)
            secure: true, // browsers now treat localhost as 'secure' to allow for testing https without certificates; so can avoid a local=false/server_hosted=true switch here
            httpOnly: true, // Protects cookies from being read non-http such as js
        },
    },
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
        schema,
    }),
    emailAndPassword: {
        enabled: true,
        disableSignUp: true //prevent users creating new accounts until suitable controls are in place
    },
    user: {
        additionalFields: {
            role: {
        type: "string",
        required: true,
        defaultValue: "student",
        input: false, // true=Allow role to be set during registration; we block signup already using [disableSignUp: true], but setting this to 'false' for now to ensure no user can select their role when registering (also, it's possible that when set to 'true', better-auth allows this role field to be updated via their endpoint, which 'false' should block - investigate before re-enabling this
            },
            imageCldPubId: {
        type: "string",
        required: false,
        input: true, // Allow imageCldPubId to be set during registration
      },
    },
  },
});
