import express from "express";
import { and, desc, eq, getTableColumns, sql, or } from "drizzle-orm";

import { db } from "../db/index.js";
import { documents } from "../db/schema/index.js";
import { publishToQueue } from "../lib/messageBroker.js";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../lib/s3Client.js";

const router = express.Router();

//Get all available documents
// GET /api/documents?page=1&limit=10
router.get("/", async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = (req.user?.role as string) || "";

// test this - should be taken care of before hitting this?
        if (!userId) {
            return res.status(401).json({ error: "Unauthorised", message: "User session required [shouldnt get here?]." });
        }

        //ensure only Student users are triggering files at first
        if (!['student'].includes(userRole)){
            return res.status(403).json({
                error: "Forbidden",
                message: "Access Denied: This action is currently limited to student users"
            });
        }

        const { search, page = 1, limit = 10 } = req.query;
        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        // Core Visibility Rules Engine:
        // - End-users (students/teachers) only see their own rows.
        // - If a record is NOT requested by an end-user (system/admin batch task), it stays hidden from them until the status shifts to 'completed'.

        const filterConditions = [];

        filterConditions.push(eq(documents.userId, userId))

        filterConditions.push(
            sql`(${documents.status} = 'completed'::document_status_enum OR ${documents.requestedByEndUser} = true)`
        );

        filterConditions.push(
            sql`(${documents.status} != 'failed'::document_status_enum OR ${documents.id} = (
                SELECT id FROM documents 
                WHERE document_type = ${documents.documentType} 
                AND user_id = ${userId}
                ORDER BY created_at DESC LIMIT 1
            ))`
        );

        //todo - add logic for only seeing pending results where triggered by user
        //filterConditions.push(eq(documents.status, 'completed'::document_status_enum))

        //todo - add filter conditions once UI decided
        //if (search) {
        //        filterConditions.push(
        //            and(
        //                or(
        //                    field-a,
        //                    field-n
        //                )
        //            )
        //        );
        //    }


        const whereClause = and(...filterConditions);

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(documents)
            .where(whereClause);

        const totalCount = Number(countResult[0]?.count ?? 0);

        const userDocuments = await db
            .select({
                ...getTableColumns(documents)
            })
            .from(documents)
            .where(whereClause)
            .orderBy(desc(documents.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: userDocuments,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            },
        });
    } catch (error) {
        console.error("GET /documents error:", error);
        res.status(500).json({ error: "Failed to fetch documents" });
    }
});

// Request a document
// POST /api/documents
router.post("/", async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = (req.user?.role as string) || "";

        const { targetUserId, documentType } = req.body;

        if (!documentType || documentType !== "student_welcome_pack") {
            return res.status(400).json({ error: "Invalid parameters", message: "Supported types: student_welcome_pack" });
        }

        let requestedByEndUser = true;

        const [newDocumentRecord] = await db
            .insert(documents)
            .values({
                userId: userId,
                documentType: "student_welcome_pack",
                status: "pending",
                requestedByEndUser: requestedByEndUser
            })
            .returning();

        if (!newDocumentRecord) throw new Error("Failed to create document request");

        // Send a request to Message Broker
        const queuePayload = {
            documentId: newDocumentRecord.id,
            userId: newDocumentRecord.userId,
            documentType: newDocumentRecord.documentType
        };

        publishToQueue("university.document.requests", queuePayload);

        res.status(202).json({
            message: "Generate-document request successfully queued.",
            //data: newDocumentRecord //enabled for debugging; otherwise not required
        });
    } catch (error) {
        console.error("POST /documents error:", error);
        res.status(500).json({ error: "Failed to generate document request" });
    }
});

// Request a just-in-time secure document URL
// GET /api/documents/:id/download
router.get("/:id/download", async (req, res) => {
    try {
        const currentUserId = req.user?.id;
        const documentId = req.params.id;

        if (!currentUserId) {
            return res.status(401).json({ error: "Authentication issue, no userId was found" });
        }

        const [documentRecord] = await db
            .select()
            .from(documents)
            .where(
                and(
                    eq(documents.id, documentId),
                    eq(documents.userId, currentUserId)
                )
            )
            .limit(1);

        if (!documentRecord) {
            return res.status(404).json({ error: "Document not available." });
        }

        // Confirm the worker has actually finished compiling the file
        if (documentRecord.status !== "completed" || !documentRecord.fileName) {
            return res.status(400).json({
                error: "Cannot process request until file has been generated"
            });
        }

        const mode = req.query.mode; // e.g., ?mode=download
        const s3CommandOptions: any = {
            Bucket: process.env.R2_PRIVATE_BUCKET_NAME,
            Key: documentRecord.fileName,
        };

        if (mode === "download") {
            // Instructs the browser to instantly trigger its native "Save File As..." download dialogue prompt
            s3CommandOptions.ResponseContentDisposition = `attachment; filename="${documentRecord.fileName.split('/').pop()}"`;
        }

        const command = new GetObjectCommand(s3CommandOptions);

        //Request a cryptographic access link signed to expire after a short delay
        const shortLivedPresignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60, //industry standard 60-second window before link expires
        });

        return res.redirect(shortLivedPresignedUrl);

    } catch (error: any) {
        console.error("GET /documents/id/download error:", error);
        res.status(500).json({ error: "Failed to generate download-document request" });
    }
});

export default router;