import "dotenv/config";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { neon, Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
}
// STANDARD HTTP DRIVER (for majority of our standard reads/writes)
const sql = neon(process.env.DATABASE_URL);
export const db = drizzleHttp({ client: sql, schema }); // recommended best practice is to include schema here so drizzle can provide advanced features

// TRANSACTIONAL WEBSOCKET POOL MANAGER limited to only complex transactions requiring db-conn that remains open
// Exported cleanly so individual sensitive endpoints can handle checking out clients safely
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });