import express from "express";
import { sql } from "drizzle-orm";

import { db } from "../db/index.js";

const router = express.Router();

const HEALTH_CHECK_URL_SLUG = process.env.HEALTH_CHECK_URL_SLUG

// Open endpoint for services to check/wake-up backend
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

export default router;
