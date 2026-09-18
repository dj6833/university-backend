import express from "express";
import { sql } from "drizzle-orm";

import { db } from "../db/index.js";
import {sleep} from "../lib/utils";

const router = express.Router();

const HEALTH_CHECK_URL_SLUG = process.env.HEALTH_CHECK_URL_SLUG

// Open endpoint for 3rd party services to check/wake-up backend (e.g. github actions)
router.get(`/${HEALTH_CHECK_URL_SLUG}`, async (req, res) => {
  try {

    // required in case HEALTH_CHECK_URL_SLUG not configured, as the endpoint will be exposed as simply "/health/"
    if (!HEALTH_CHECK_URL_SLUG) {
      return res.status(500).json({ error: "Health URL slug not configured" });
    }

    await db.execute(sql`SELECT 1`);

    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: "Connected"
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({ error: "Health check failed" });
  }
});

// Open endpoint for frontend to check/wake-up this webservice
router.get("/warmup/primary-webservice", async (req, res) => {
  try {
    res.status(200).json({ message: "Primary web service warmed up successfully" });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({ error: "Health check failed" });
  }
});

// Open endpoint for frontend to check/wake-up database
router.get("/warmup/database", async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ message: "Database service warmed up successfully" });
  } catch (error) {
    console.error("Database warmup sequence failed:", error);
    res.status(500).json({ error: "Database layer connection error" });
  }
});

export default router;
