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
        // In production, frontend and backend are on different domains, requiring sameSite / secure variations
        defaultCookieAttributes: {
            sameSite: "lax", //isLocal ? "lax" : "none", - this comment can be removed if "lax" works across all environments now
            secure: !isLocal,
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
