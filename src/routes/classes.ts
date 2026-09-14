import express from "express";
import { and, desc, eq, getTableColumns, ilike, or, sql, inArray } from "drizzle-orm";

import {db} from "../db/index.js";
import { classes, departments, enrollments, subjects, user, enrollmentClassCountsView  } from "../db/schema/index.js";

const router = express.Router();

//declare "static" routes first, otherwise dynamic routes e.g. /:id/ will see the static endpoint as a variable and attempt to process these requests
router.get("/recommendations", async (req, res) => {
    try {

        const userId = (req.session?.userId as string) || "";

        const maxRecordsToReturn  = 10;

        if (!userId || userId.length === 0) return res.status(404).json({ error: "User ID not found" });

        interface recommendationsAPIModel {
            status: string;
            processed_student: string;
            recommended_classes: {
                classId: string;
                match_strength: string;
            }[];

        }
        const timeoutSignal = AbortSignal.timeout(90000); //required in Prod as ANALYSIS_SERVICE goes offline and needs time to spin-up

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        const maxRetries = 5;
        let attempt = 0;
        let recommendationsResponseRaw: Response | null = null;

        // Clean up the trailing slash securely
        const targetUrl = `${process.env.ANALYSIS_SERVICE_URL!.replace(/\/$/, '')}/recommendations`;

        while (attempt < maxRetries) {
            try {
                attempt++;
                const timeoutSignal = AbortSignal.timeout(15000); // 15s per individual request attempt

                recommendationsResponseRaw = await fetch(targetUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        api_username: process.env.RECOMMEND_ENROLLMENTS_API_USERNAME!,
                        api_password: process.env.RECOMMEND_ENROLLMENTS_API_PASSWORD!,
                        student_id: userId,
                        max_records: maxRecordsToReturn
                    }),
                    signal: timeoutSignal
                });

                // If Render sends a 503 (Service Unavailable/Spinning Up), force it into the retry block
                if (recommendationsResponseRaw.status === 503) {
                    throw new Error("Render service is spinning up...");
                }

                // If we hit this line, we successfully bypassed the 503 wall!
                break;

            } catch (error) {
                console.warn(`Attempt ${attempt} failed. Backend is likely waking up. Retrying...`);

                if (attempt >= maxRetries) {
                    throw new Error(`Analysis service failed to respond after ${maxRetries} attempts.`);
                }

                // Wait a few seconds before trying again to allow the container time to boot
                // Attempt 1: waits 3s | Attempt 2: waits 6s | Attempt 3: waits 9s...
                await delay(attempt * 3000);
            }
        }

        if (!recommendationsResponseRaw) {
            throw new Error("Failed to receive a response from the analysis service.");
        }

        const recommendationsResponseRawJson = await recommendationsResponseRaw.json() as recommendationsAPIModel;
        const recommendationsResponse = recommendationsResponseRawJson as recommendationsAPIModel;
        const recommendedClasses = recommendationsResponse.recommended_classes;
        const recommendedClassIDs = recommendedClasses.map(item => Number(item.classId))

        if (recommendedClassIDs.length < 1) {
            res.status(201).json({ "data": [] });
        }

        const recommendedClassesStrengthMap = new Map(
            recommendedClasses.map(item => [Number(item.classId), Number(item.match_strength)])
        );

        const filterConditions = [];

        filterConditions.push(inArray(classes.id, recommendedClassIDs));

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const classesList = await db
            .select({
                ...getTableColumns(classes),
                spacesLeft: sql<number>`(${classes.capacity} - coalesce(${enrollmentClassCountsView.seatsUsed}, 0))::int`,
                subject: {
                    ...getTableColumns(subjects),
                },
                teacher: {
                    ...getTableColumns(user),
                },
            })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .leftJoin(
                enrollmentClassCountsView,
                eq(classes.id, enrollmentClassCountsView.classId)
            )
            .where(whereClause)
            .orderBy(desc(classes.createdAt)) //strengthMap will be used to sort later - this is a default backup if any issues

        const classesListWithStrength = classesList
            .map(row => ({
                ...row,
                match_strength: recommendedClassesStrengthMap.get(row.id) ?? 0 // shouldn't happen: default to 0 match_strength if not found
            }))
            .sort((a, b) => b.match_strength - a.match_strength);

        res.status(201).json({ data: classesListWithStrength });

    }
    catch (error) {
        console.error("GET /classes/recommendations error:", error);
        return res.status(500).json({ error: "Failed to fetch recommendations" });
    }
});

// Get all classes with optional search, subject, teacher filters, and pagination
router.get("/", async (req, res) => {
    try {
        const {search, subject, teacher, page = 1, limit = 10} = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        if (search) {
            filterConditions.push(
                or(
                    ilike(classes.name, `%${search}%`),
                    ilike(classes.inviteCode, `%${search}%`)
                )
            );
        }

        if (subject) {
      filterConditions.push(ilike(subjects.name, `%${subject}%`));
        }

        if (teacher) {
      filterConditions.push(ilike(user.name, `%${teacher}%`));
        }

        const whereClause =
            filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({count: sql<number>`count(*)`})
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const classesList = await db
            .select({
                ...getTableColumns(classes),
                spacesLeft: sql<number>`(${classes.capacity} - coalesce(${enrollmentClassCountsView.seatsUsed}, 0))::int`,
                subject: {
                  ...getTableColumns(subjects),
                },
                teacher: {
                  ...getTableColumns(user),
                },
            })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .leftJoin(
                enrollmentClassCountsView,
                eq(classes.id, enrollmentClassCountsView.classId)
            )
            .where(whereClause)
            .orderBy(desc(classes.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: classesList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            },
        });
  } catch (error) {
    console.error("GET /classes error:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
    }
});

router.post("/", async (req, res) => {
  try {
    const {
      name,
      teacherId,
      subjectId,
      capacity,
      description,
      status,
      bannerUrl,
      bannerCldPubId,
    } = req.body;

    const [createdClass] = await db
      .insert(classes)
      .values({
        subjectId,
        inviteCode: Math.random().toString(36).substring(2, 9),
        name,
        teacherId,
        bannerCldPubId,
        bannerUrl,
        capacity,
        description,
        schedules: [],
        status,
      })
      .returning({ id: classes.id });

    if (!createdClass) throw Error;

    res.status(201).json({ data: createdClass });
  } catch (error) {
    console.error("POST /classes error:", error);
    res.status(500).json({ error: "Failed to create class" });
    }
});

// Get class details with counts
router.get("/:id", async (req, res) => {
    try{
        const classId = Number(req.params.id);

        const userId = (req.session?.userId as string) || "";

        if (!userId || userId.length === 0) return res.status(404).json({ error: "User ID not found" });

        if (!Number.isFinite(classId)) {
          return res.status(400).json({ error: "Invalid class id" });
        }

        const [classDetails] = await db
            .select({
                ...getTableColumns(classes),
                spacesLeft: sql<number>`(${classes.capacity} - coalesce(${enrollmentClassCountsView.seatsUsed}, 0))::int`,
                enrolledAlready: sql<boolean>`CASE WHEN ${enrollments.id} IS NOT NULL THEN true ELSE false END`,
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
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .leftJoin(
                enrollments,
                and(
                    eq(enrollments.classId, classes.id),
                    eq(enrollments.studentId, userId)
                )
            )
            .leftJoin(
                enrollmentClassCountsView,
                eq(classes.id, enrollmentClassCountsView.classId)
            )
            .where(eq(classes.id, classId));

    if (!classDetails) {
      return res.status(404).json({ error: "Class not found" });
    }

        res.status(200).json({data: classDetails});
  } catch (error) {
        console.error("GET /classes/:id error:", error);
        res.status(500).json({ error: "Failed to fetch class details" });
    }
});

// List users in a class by role with pagination
router.get("/:id/users", async (req, res) => {
    try {
    const classId = Number(req.params.id);
    const { role, page = 1, limit = 10 } = req.query;

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: "Invalid class id" });
    }

    if (role !== "teacher" && role !== "student") {
      return res.status(400).json({ error: "Invalid role" });
    }

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const baseSelect = {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      imageCldPubId: user.imageCldPubId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const groupByFields = [
      user.id,
      user.name,
      user.email,
      user.emailVerified,
      user.image,
      user.role,
      user.imageCldPubId,
      user.createdAt,
      user.updatedAt,
    ];

    const countResult =
      role === "teacher"
        ? await db
            .select({ count: sql<number>`count(distinct ${user.id})` })
            .from(user)
            .leftJoin(classes, eq(user.id, classes.teacherId))
            .where(and(eq(user.role, role), eq(classes.id, classId)))
        : await db
            .select({ count: sql<number>`count(distinct ${user.id})` })
            .from(user)
            .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            .where(and(eq(user.role, role), eq(enrollments.classId, classId)));

    const totalCount = countResult[0]?.count ?? 0;

    const usersList =
      role === "teacher"
        ? await db
            .select(baseSelect)
            .from(user)
            .leftJoin(classes, eq(user.id, classes.teacherId))
            .where(and(eq(user.role, role), eq(classes.id, classId)))
            .groupBy(...groupByFields)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset)
        : await db
            .select(baseSelect)
            .from(user)
            .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            .where(and(eq(user.role, role), eq(enrollments.classId, classId)))
            .groupBy(...groupByFields)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset);

    res.status(200).json({
      data: usersList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /classes/:id/users error:", error);
    res.status(500).json({ error: "Failed to fetch class users" });
  }
});

export default router;
