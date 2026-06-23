import express from "express";
import {and, desc, eq, getTableColumns, ilike, inArray, or, sql, SQL} from "drizzle-orm";

import { db } from "../db/index.js";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index.js";
import {string} from "better-auth";
import users from "./users";

if (!process.env.ANALYSIS_SERVICE_URL) throw new Error("ANALYSIS_SERVICE_URL is not set in .env file");

const router = express.Router();

router.get("/", async (req, res) => {
    try {

        //const userRole = (req.user?.role as string) || "";
        //const userId = req.user?.id ?? 0;
        const userId = req.user?.id

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
                or(
                    ilike(classes.name, `%${search}%`),
                    ilike(subjects.name, `%${search}%`)
                )
            );
        }

        const whereClause =
            filterConditions.length > 0 ? and(...filterConditions) : undefined;

         const countResult = await db
             .select({ count: sql<number>`count(*)` })
             .from(enrollments)
        //     .leftJoin(user, eq(enrollments.studentId, user.id))
        //     .leftJoin(classes, eq(enrollments.classId, classes.id))
        //     .leftJoin(subjects, eq(departments.id, classes.subjectId))
             .where(whereClause);
        //
        const totalCount = countResult[0]?.count ?? 0;

        const enrolmentsList = await db
        //const objSQL = db
            .select({
                ...getTableColumns(enrollments),
                ...getTableColumns(classes),
                ...getTableColumns(subjects),
            })
            .from(enrollments)
            //.leftJoin(user, eq(enrollments.studentId, user.id))
            .leftJoin(classes, eq(enrollments.classId, classes.id))
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .where(whereClause)
            //.groupBy(departments.id)
            .orderBy(desc(enrollments.updatedAt))
            .limit(limitPerPage)
            .offset(offset);
            //.toSQL();

        //res.status(200).json({data: objSQL});

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
    const { classId, studentId } = req.body;

    if (!classId || !studentId) {
      return res
        .status(400)
        .json({ error: "classId and studentId are required" });
    }

    const [classRecord] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId));

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
          eq(enrollments.classId, classId),
          eq(enrollments.studentId, studentId)
        )
      );

    if (existingEnrollment)
      return res
        .status(409)
        .json({ error: "Student already enrolled in class" });

    const [createdEnrollment] = await db
      .insert(enrollments)
      .values({ classId, studentId })
      .returning({ id: enrollments.id });

    if (!createdEnrollment)
      return res.status(500).json({ error: "Failed to create enrollment" });

    const enrollment = await getEnrollmentDetails(createdEnrollment.id);

    res.status(201).json({ data: enrollment });
  } catch (error) {
    console.error("POST /enrollments error:", error);
    res.status(500).json({ error: "Failed to create enrollment" });
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

    const recommendationsResponseRaw = await fetch(`${process.env.ANALYSIS_SERVICE_URL}recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({  api_username: process.env.RECOMMEND_ENROLLMENTS_API_USERNAME!,
                              api_password: process.env.RECOMMEND_ENROLLMENTS_API_PASSWORD!,
                              student_id: userId,
                              max_records: maxRecordsToReturn}),
    });

    const recommendationsResponseRawJson = await recommendationsResponseRaw.json() as recommendationsAPIModel;
    const recommendationsResponse = recommendationsResponseRawJson as recommendationsAPIModel;
    const recommendedClasses = recommendationsResponse.recommended_classes;
    const recommendedClassIDs = recommendedClasses.map(item => Number(item.classId))

    if (recommendedClassIDs.length < 1) {
      return res.status(204).json({ data: null });
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
    console.error("Express failed to connect to FastAPI:", error);
    return res.status(500).json({ error: "Error calling Python service" });
  }
});

export default router;
