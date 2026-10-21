import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db/index.js"; // your drizzle instance
import * as schema from "../db/schema/auth.js";

const isLocal = process.env.IS_LOCAL === "true";

export const auth = betterAuth({
    secret: process.env.BetterAuthSecret!,
    trustedOrigins: [
        process.env.FRONTEND_URL!,
        "http://localhost:3000" //Vercel CLI development server proxy port
    ],
    advanced: {
        defaultCookieAttributes: {
            sameSite: "lax", // "lax" mode is more secure than "none" (possible now proxies make frontend/backend same-site)
            secure: !isLocal, // true on HTTPS cloud environments, false on HTTP localhost
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
        input: true, // Allow role to be set during registration
            },
            imageCldPubId: {
        type: "string",
        required: false,
        input: true, // Allow imageCldPubId to be set during registration
      },
    },
  },
});
