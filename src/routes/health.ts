import express from "express";
import { sql } from "drizzle-orm";

import { db } from "../db/index.js";
import {sleep} from "../lib/utils";

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




// Open endpoint for services to check/wake-up backend
router.get("/warmup/primary-webservice", async (req, res) => {
  try {
    //await sleep(15000);
    res.status(200).json({ message: "Primary web service warmed up successfully" });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({ error: "Health check failed" });
  }
});

// Open endpoint for services to check/wake-up backend
router.get("/warmup/database", async (req, res) => {
  try {
    //await sleep(10000);
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ message: "Database service warmed up successfully" });
  } catch (error) {
    console.error("Database warmup sequence failed:", error);
    res.status(500).json({ error: "Database layer connection error" });
  }
});

// Publicly accessible route for the frontend to safely trigger backend services spin-ups (todo remove as this was old approach calling API & DB together?)
// router.get("/warmup", async (req, res) => {
//   try {
//
//     //Wakeup Neon DB first
//     await db.execute(sql`SELECT 1`);
//     console.log("Infrastructure Monitor: Neon Database is active and responsive.");
//
//     const analysisServiceUrl = process.env.ANALYSIS_SERVICE_URL;
//
//     if (!analysisServiceUrl) {
//       return res.status(500).json({ error: "Upstream analysis configuration missing" });
//     }
//
//     const targetRedirect = `${analysisServiceUrl.replace(/\/$/, "")}/healthz`;
//     console.log(`Relaying analysis service warm-up signal via browser redirect to: ${targetRedirect}`);
//
//     // HTTP 307 tells the user's browser to also wakeup the analysis service (as this doesn't appear possible using a Render-to-Render API request)
//     return res.redirect(307, targetRedirect);
//   } catch (error) {
//     console.error("Warmup infrastructure redirection failed:", error);
//     res.status(500).json({ error: "Warmup routine failed" });
//   }
// });

export default router;
