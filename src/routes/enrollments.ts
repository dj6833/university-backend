import express from "express";
import {and, desc, eq, getTableColumns, inArray, SQL} from "drizzle-orm";

import { db } from "../db/index.js";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index.js";
import {string} from "better-auth";

if (!process.env.ANALYSIS_SERVICE_URL) throw new Error("ANALYSIS_SERVICE_URL is not set in .env file");

const router = express.Router();

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
    // todo: replace temporary user & pwd approach with JWT or similar if not using a private network across hosting platforms
    // Using a student ID from seed data to test the pipeline
    //const testStudentId = "b996a70a-a020-41f3-b787-b34639a587d7"; //"02f0669b-a01c-454f-8df4-be7741a70491";

    //const userId = (req.user?.role as string) || "";
    // const userId = (req.session?.userId as string) || "";
    //
    // if (!['admin', 'teacher'].includes(userRole)){
    //   return res.status(403).json({
    //     error: "Forbidden",
    //     message: "Access Denied: Departments are not available for your user profile."
    //   });
    // }

    const userId = (req.session?.userId as string) || "";

    if (!userId || userId.length === 0) return res.status(404).json({ error: "User ID not found" });

    interface PythonApiResponse {
      data: {
        status: string;
        processed_student: string;
        recommended_classes: {
          classId: string;
          match_strength: string;
        }[];
      };
    }

    // Make an asynchronous call to your FastAPI server
    const pythonResponse = await fetch(`${process.env.ANALYSIS_SERVICE_URL}recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({  api_username: process.env.RECOMMEND_ENROLLMENTS_API_USERNAME!,
                              api_password: process.env.RECOMMEND_ENROLLMENTS_API_PASSWORD!,
                              student_id: userId }),
    });

    // Parse the JSON payload sent back by Python
    const pyRespData = await pythonResponse.json(); // as PythonApiResponse;

    // 1. Map API string IDs to numbers and build the lookup Map
    const recommendedClasses = pyRespData; //.data.recommended_classes;
    // const recommendedClassIDs = recommendedClasses.map(item => Number(item.classId)); // Cast to number for Postgres ID matching
    //
    // const strengthMap = new Map(
    //     recommendedClasses.map(item => [Number(item.classId), item.match_strength])
    // );

    // if (recommendedClassIDs.length < 1) {
    //   return res.status(204).json({ data: null });
    // }

    const filterConditions = [];

    //filterConditions.push(inArray(classes.id,recommendedClassIDs))

    // If there are conditions, pass the array directly to and(); otherwise pass undefined
    //const drizzleWhereClause = filterConditions.length > 0
    //    ? and(filterConditions[0], ...filterConditions.slice(1))
    //    : undefined;

    //const filterConditions : SQL[] = [];

    // if (search) {
    //   filterConditions.push(
    //       or(
    //           ilike(classes.name, `%${search}%`),
    //           ilike(classes.inviteCode, `%${search}%`)
    //       )
    //   );
    // }

    // if (subject) {
    //   filterConditions.push(ilike(subjects.name, `%${subject}%`));
    // }

    // if (teacher) {
    //   filterConditions.push(ilike(user.name, `%${teacher}%`));
    // }

    //filterConditions.push(inArray(classes.id, recommendedClassIDs));
    filterConditions.push(inArray(classes.id, [18904]));

    const whereClause = filterConditions.length > 0
        ? and(...filterConditions)
        : undefined;



    // const classesList = await db
    //     .select({
    //       ...getTableColumns(classes),
    //       subject: {
    //         ...getTableColumns(subjects),
    //       },
    //       teacher: {
    //         ...getTableColumns(user),
    //       },
    //     })
    //     .from(classes)
    //     .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    //     .leftJoin(user, eq(classes.teacherId, user.id))
    //     .where(whereClause)
    //     .orderBy(desc(classes.createdAt))
    //     // .limit(limitPerPage)
    //     // .offset(offset);

    // const classesList = await db
    //     .select({
    //       // 1. Pass the tables directly. Drizzle automatically flattens/groups them.
    //       class: classes,
    //       subject: subjects,
    //       teacher: user,
    //     })
    //     .from(classes)
    //     .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    //     .leftJoin(user, eq(classes.teacherId, user.id))
    //     //.where(whereClause)
    //     .orderBy(desc(classes.createdAt))
    //     .limit(5)

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
        .orderBy(desc(classes.createdAt))
        .limit(1)

    // const classesListWithStrength = classesList
    //     .map(row => ({
    //       ...row,
    //       match_strength: strengthMap.get(row.class.id) ?? 0 // Default to 0 if not found
    //     }))
        //.sort((a, b) => b.match_strength - a.match_strength);

    // Return it to your browser to confirm the loop is closed
    //res.status(201).json({ data: classesListWithStrength });
    res.status(201).json({ data: classesList });

    // return res.json({
    //   express_status: "Successfully reached Python!",
    //   data_received_from_python: data
    // });

  } catch (error) {
    console.error("Express failed to connect to FastAPI:", error);
    return res.status(500).json({ error: "Error calling Python service" });
  }
});

export default router;
