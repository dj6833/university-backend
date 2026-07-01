import express from "express";
import {and, desc, eq, getTableColumns, ilike, or, sql} from "drizzle-orm";

import { db, pool} from "../db/index.js";
import { classes, departments, enrollments, subjects, user, enrollmentClassCountsView } from "../db/schema/index.js";

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";

if (!process.env.ANALYSIS_SERVICE_URL) throw new Error("ANALYSIS_SERVICE_URL is not set in .env file");

const router = express.Router();

router.get("/", async (req, res) => {
    try {

        const userId = req.user?.id;

        if (!userId)
        {
            throw new Error("could not establish userID");
        }

        const { search, page = 1, limit = 10 } = req.query;

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        filterConditions.push(eq(enrollments.studentId, userId))

        if (search) {
            filterConditions.push(
                and(
                    or(
                        ilike(classes.name, `%${search}%`),
                        ilike(subjects.name, `%${search}%`)
                    )
                )
            );
        }

        const whereClause =
            filterConditions.length > 0 ? and(...filterConditions) : undefined;

         const countResult = await db
             .select({ count: sql<number>`count(*)` })
             .from(enrollments)
             .leftJoin(classes, eq(enrollments.classId, classes.id))
             .leftJoin(subjects, eq(classes.subjectId, subjects.id))
             .leftJoin(user, eq(classes.teacherId, user.id))
             .where(whereClause);
        //
        const totalCount = countResult[0]?.count ?? 0;

        const enrolmentsList = await db
            .select({
                ...getTableColumns(enrollments),
                classes: {
                    ...getTableColumns(classes),
                },
                subjects: {
                    ...getTableColumns(subjects),
                },
                teacher: {
                    ...getTableColumns(user),
                },
            })
            .from(enrollments)
            .leftJoin(classes, eq(enrollments.classId, classes.id))
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause)
            .orderBy(desc(enrollments.updatedAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: enrolmentsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            },
        });
    } catch (error) {
        console.error("GET /enrolments error:", error);
        res.status(500).json({ error: "Failed to fetch enrolments" });
    }
});

const getEnrollmentDetails = async (enrollmentId: number) => {
  const [enrollment] = await db
    .select({
      ...getTableColumns(enrollments),
      class: {
        ...getTableColumns(classes),
      },
      subject: {
        ...getTableColumns(subjects),
      },
      department: {
        ...getTableColumns(departments),
      },
      teacher: {
        ...getTableColumns(user),
      },
    })
    .from(enrollments)
    .leftJoin(classes, eq(enrollments.classId, classes.id))
    .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .leftJoin(user, eq(classes.teacherId, user.id))
    .where(eq(enrollments.id, enrollmentId));

  return enrollment;
};

// Create enrollment
router.post("/", async (req, res) => {
    try {
        // Enforce implicit type-casting on incoming bodies
        const classId = Number(req.body.classId);
        const userId = req.user?.id;

        if (!classId || isNaN(classId)) {
            return res.status(400).json({ error: "Valid numeric classId is required" });
        }

        if (!userId) {
            return res.status(401).json({ error: "Authentication failed. Could not establish user ID." });
        }

        try {
            const client = await pool.connect();

            try {
                const txDb = drizzle({ client });

                const newEnrollmentId = await txDb.transaction(async (tx) => {

                    // Fetch capacity metrics and LOCK the specific class row instantly
                    const [classMetrics] = await tx
                        .select({
                            capacity: classes.capacity,
                            seatsUsed: sql<number>`coalesce(${enrollmentClassCountsView.seatsUsed}, 0)::int`,
                        })
                        .from(classes)
                        .leftJoin(enrollmentClassCountsView, eq(classes.id, enrollmentClassCountsView.classId))
                        .where(eq(classes.id, classId))
                        .for("update", { of: classes }); // Safely locked to core table (otherwise it attempts to lock left-join tables and throws a NULL error)

                    if (!classMetrics) throw new Error("CLASS_NOT_FOUND");

                    const [existingEnrollment] = await tx
                        .select({ id: enrollments.id })
                        .from(enrollments)
                        .where(
                            and(
                                eq(enrollments.classId, classId),
                                eq(enrollments.studentId, userId)
                            )
                        );

                    if (existingEnrollment) throw new Error("ALREADY_ENROLLED");

                    const spacesLeft = classMetrics.capacity - classMetrics.seatsUsed;
                    if (spacesLeft <= 0) throw new Error("CLASS_IS_FULL");

                    const [newEnrollment] = await tx
                        .insert(enrollments)
                        .values({
                            classId: classId,
                            studentId: userId,
                        })
                        .returning({ id: enrollments.id });

                    if (!newEnrollment) throw new Error("INSERT_FAILED");

                    return newEnrollment.id;
                });

                return res.status(201).json({
                    success: true,
                    enrollmentId: newEnrollmentId
                });

            } finally {
                client.release(); //Cleanly return the client thread back to pool
            }
        } catch (error: any) {
            if (error.message === "ALREADY_ENROLLED") {
                return res.status(409).json({ error: "Registration failed. Student is already enrolled in this class." });
            }
            if (error.message === "CLASS_IS_FULL") {
                return res.status(409).json({ error: "Registration failed. This class has reached maximum capacity." });
            }
            if (error.message === "CLASS_NOT_FOUND") {
                return res.status(404).json({ error: "The requested class does not exist." });
            }

            console.error("POST /enrollments error inside db-transaction:", error);
            return res.status(500).json({ error: "Failed to create enrollment" });
        }
    } catch (error) {
        console.error("POST /enrollments error:", error);
        return res.status(500).json({ error: "Failed to create enrollment" });
    }
});


// Join class by invite code
router.post("/join", async (req, res) => {
  try {
    const { inviteCode, studentId } = req.body;

    if (!inviteCode || !studentId) {
      return res
        .status(400)
        .json({ error: "inviteCode and studentId are required" });
    }

    const [classRecord] = await db
      .select()
      .from(classes)
      .where(eq(classes.inviteCode, inviteCode));

    if (!classRecord) return res.status(404).json({ error: "Class not found" });

    const [student] = await db
      .select()
      .from(user)
      .where(eq(user.id, studentId));

    if (!student) return res.status(404).json({ error: "Student not found" });

    const [existingEnrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.classId, classRecord.id),
          eq(enrollments.studentId, studentId)
        )
      );

    if (existingEnrollment)
      return res
        .status(409)
        .json({ error: "Student already enrolled in class" });

    const [createdEnrollment] = await db
      .insert(enrollments)
      .values({ classId: classRecord.id, studentId })
      .returning({ id: enrollments.id });

    if (!createdEnrollment)
      return res.status(500).json({ error: "Failed to join class" });

    const enrollment = await getEnrollmentDetails(createdEnrollment.id);

    res.status(201).json({ data: enrollment });
  } catch (error) {
    console.error("POST /enrollments/join error:", error);
    res.status(500).json({ error: "Failed to join class" });
  }
});

// Leave class
router.delete("/:id", async (req, res) => {
    try {

        const userId = (req.session?.userId as string) || "";

        if (!userId || userId.length === 0) return res.status(404).json({ error: "User ID not found" });

        const enrolmentId = Number(req.params.id);

        if (!Number.isFinite(enrolmentId)) {
            return res.status(400).json({ error: "Invalid enrolment id" });
        }

        const [enrolment] = await db
            .select()
            .from(enrollments)
            .where(
                and(
                    eq(enrollments.studentId, userId),
                    eq(enrollments.id, enrolmentId)
                )
            );

        if (!enrolment) {
            return res.status(404).json({ error: "Enrolment record not found" });
        }

        const [deletedEnrolment] = await db
            .delete(enrollments)
            .where(and
                (
                eq(enrollments.studentId, userId),
                eq(enrollments.id, enrolmentId)
                )
            )
            .returning({ id: enrollments.id });

        if (!deletedEnrolment) throw Error;

        res.status(200).json({ data: deletedEnrolment });

    } catch (error) {
        console.error("DELETE /enrollments/:id error:", error);
        res.status(500).json({ error: "Failed to delete enrolment record" });
    }
});

export default router;
