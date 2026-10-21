// blocking this for now as issue collecting backend logs on apminsight (tr-57)
// import('apminsight')
//   .then(({ default: AgentAPI }) => AgentAPI.config())
//   .catch(() => console.log('APM not available in this environment'));

import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";

import subjectsRouter from "./routes/subjects.js";
import usersRouter from "./routes/users.js";
import classesRouter from "./routes/classes.js";
import departmentsRouter from "./routes/departments.js";
import statsRouter from "./routes/stats.js";
import enrollmentsRouter from "./routes/enrollments.js";
import healthRouter from "./routes/health.js";

import securityMiddleware from "./middleware/security.js";
import {auth} from "./lib/auth.js";
import { proxySanitizer } from "./middleware/proxySanitiser.js";

const app = express();
//below line tells Express to trust the proxy's HTTPS header flags; required due to Render using a reverse-proxy which uses HTTPS externally but HTTP internally
//Express gets confused and thinks the connection is insecure, causing it to fail cookie delivery
app.set("trust proxy", 1);
//have server return:
//X-Robots-Tag; helps ensure that non-html files are also not indexed
//Referrer-Policy: Prevents leaking sensitive URL paths and query parameters to external websites/resources; only the root domain (origin) is shared
app.use((req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    next();
});

const PORT = 8000;

app.use(proxySanitizer);

if (!process.env.FRONTEND_URL) throw new Error("FRONTEND_URL is not set in .env file");

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // React app URL
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // allow cookies
  })
);

//expose health and api/auth routes first, before we add session checks
app.use("/api/health", healthRouter);
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

//now add security layer to handle global session checking, arcjet logging/filtering/rate limiting checks etc
app.use(securityMiddleware);

app.use("/api/subjects", subjectsRouter);
app.use("/api/users", usersRouter);
app.use("/api/classes", classesRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/enrollments", enrollmentsRouter);

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
