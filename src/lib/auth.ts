import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db/index.js"; // your drizzle instance
import * as schema from "../db/schema/auth.js";

export const auth = betterAuth({
    secret: process.env.BetterAuthSecret!,
    trustedOrigins: [process.env.FRONTEND_URL!],
    advanced: {
        // Force cookies to be shareable cross-domain (required for Prod where frontend & backend are different domains)
        // Below still ensures this cookie can only be exchanged with backend
        defaultCookieAttributes: {
            sameSite: "none", // Mandatory for cross-origin setups
            secure: true,     // Required by browsers when sameSite is "none"
            httpOnly: true, // Protects cookies from being read non-http such as js
        },
    },
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
        schema,
    }),
    emailAndPassword: {
        enabled: true,
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
