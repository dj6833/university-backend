import express from "express";
import { desc, eq, getTableColumns, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { classes, departments, subjects, user, enrollments } from "../db/schema/index.js";
import { USER_ROLES } from "../constants/index.js";

const router = express.Router();

// Overview counts for core entities
router.get("/overview", async (req, res) => {
  try {

    const currentUserRole = req.user?.role;

    const includeUserStats = ([USER_ROLES.ADMIN,USER_ROLES.TEACHER].includes(currentUserRole));

    const [
      subjectsCount,
      departmentsCount,
      classesCount,
      usersCount,
      teachersCount,
      adminsCount,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(subjects),
      db.select({ count: sql<number>`count(*)` }).from(departments),
      db.select({ count: sql<number>`count(*)` }).from(classes),
      // Sensitive metrics (only fetched for elevated roles, otherwise resolves immediately to 0)
      includeUserStats
          ? db.select({ count: sql<number>`count(*)` }).from(user)
          : Promise.resolve([{ count: 0 }]),

      includeUserStats
          ? db.select({ count: sql<number>`count(*)` }).from(user).where(eq(user.role, USER_ROLES.TEACHER))
          : Promise.resolve([{ count: 0 }]),

      includeUserStats
          ? db.select({ count: sql<number>`count(*)` }).from(user).where(eq(user.role, USER_ROLES.ADMIN))
          : Promise.resolve([{ count: 0 }]),
    ]);

    res.status(200).json({
      data: {
        subjects: subjectsCount ?? 0,
        departments: departmentsCount ?? 0,
        classes: classesCount ?? 0,
        users: usersCount ?? 0,
        teachers: teachersCount ?? 0,
        admins: adminsCount ?? 0
      },
    });
  } catch (error) {
    console.error("GET /stats/overview error:", error);
    res.status(500).json({ error: "Failed to fetch overview stats" });
  }
});

// Latest activity summaries
router.get("/latest", async (req, res) => {
  try {

    const { limit = 5 } = req.query;
    const limitPerPage = Math.max(1, +limit);

    const [latestClasses, latestTeachers] = await Promise.all([
      db
          .select({
            ...getTableColumns(classes),
            subject: { ...getTableColumns(subjects) },
            teacher: { ...getTableColumns(user) },
          })
          .from(classes)
          .leftJoin(subjects, eq(classes.subjectId, subjects.id))
          .leftJoin(user, eq(classes.teacherId, user.id))
          .orderBy(desc(classes.createdAt))
          .limit(limitPerPage),
      db.select().from(user).where(eq(user.role, USER_ROLES.TEACHER)).orderBy(desc(user.createdAt)).limit(limitPerPage)
    ]);

    res.status(200).json({
      data: {
        latestClasses,
        latestTeachers,
      },
    });
  } catch (error) {
    console.error("GET /stats/latest error:", error);
    res.status(500).json({ error: "Failed to fetch latest stats" });
  }
});

// Aggregates for charts
router.get("/charts", async (req, res) => {
  try {

    const [studentsPerDepartment, busiestTeachers, studentsBySubject] =
      await Promise.all([
        db
            .select({
              department: departments.name,
              total: sql<number>`count(distinct ${user.id})`.mapWith(Number),
            })
            .from(departments)
            .leftJoin(subjects, eq(subjects.departmentId, departments.id))
            .leftJoin(classes, eq(classes.subjectId, subjects.id))
            .leftJoin(enrollments, eq(enrollments.classId, classes.id))
            .leftJoin(user, eq(user.id, enrollments.studentId))
            .where(eq(user.role, USER_ROLES.STUDENT))
            .groupBy(departments.id)
            .orderBy(desc(sql`count(distinct ${user.id})`)),
            // .from(user)
            // .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            // .leftJoin(classes, eq(enrollments.classId, classes.id))
            // .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            // .groupBy(departments.id)
            // .orderBy(desc(sql`count(distinct ${user.id})`)),
        db
            .select({
              name: user.name,
              classCount: sql<number>`count(distinct ${classes.id})`.mapWith(Number),
            })
            .from(user)
            .innerJoin(classes, eq(classes.teacherId, user.id))
            .where(eq(user.role, USER_ROLES.TEACHER))
            .groupBy(user.id)
            .orderBy(desc(sql`count(distinct ${classes.id})`))
            .limit(5),
        db
            .select({
              subjectName: subjects.name,
              totalEnrollments: sql<number>`count(${enrollments.id})`.mapWith(Number),
            })
            .from(subjects)
            .leftJoin(classes, eq(classes.subjectId, subjects.id))
            .leftJoin(enrollments, eq(enrollments.classId, classes.id))
            .groupBy(subjects.id)
            .orderBy(desc(sql`count(${enrollments.id})`))
            .limit(5),
      ]);

    res.status(200).json({
      data: {
        studentsPerDepartment,
        busiestTeachers,
        studentsBySubject
      },
    });
  } catch (error) {
    console.error("GET /stats/charts error:", error);
    res.status(500).json({ error: "Failed to fetch chart stats" });
  }
});

export default router;
