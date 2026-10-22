import express from "express";
import { and, desc, eq, ilike, or, sql, getTableColumns } from "drizzle-orm";

import { db } from "../db/index.js";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index.js";
import { USER_ROLES } from "../constants/index.js";

const router = express.Router();

// Get all users with optional search, role filter, and pagination
router.get("/", async (req, res) => {
    try {
        const {search, role, page = 1, limit = 10} = req.query;

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        //enforce authorise inline, rather than via middleware, as has additional role-logic
        const currentUserRole = req.user?.role;
        // Restrict so only ADMIN or TEACHER users can see all user data
        const allowedCurrentUserRoles: USER_ROLES[] = [USER_ROLES.ADMIN, USER_ROLES.TEACHER];
        if (!currentUserRole || !allowedCurrentUserRoles.includes(currentUserRole)) {
            // If current user is NOT an ADMIN or TEACHER, they are ONLY allowed to request the TEACHER role filter
            if (role !== USER_ROLES.TEACHER) {
                return res.status(403).json({
                    error: "Forbidden",
                    message: "Access Denied: This action is unavailable for your profile"
                });
            }
        }

        if (search) {
            filterConditions.push(
                or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
            );
        }

        if (role) {
            filterConditions.push(eq(user.role, role as UserRoles));
        }

        const whereClause =
            filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({count: sql<number>`count(*)`})
            .from(user)
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const usersList = await db
            .select()
            .from(user)
            .where(whereClause)
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
        console.error("GET /users error:", error);
        res.status(500).json({error: "Failed to fetch users"});
    }
});

// Get user details with role-specific data
router.get("/:id", async (req, res) => {
    try {

        const userId = req.params.id;

        const [userRecord] = await db
            .select()
            .from(user)
            .where(eq(user.id, userId));

        if (!userRecord) {
            return res.status(404).json({error: "User not found"});
        }

        //enforce authorise inline, rather than via middleware, as has additional role-logic
        const currentUserRole = req.user?.role;
        // Restrict so only ADMIN or TEACHER users can see all user data
        const allowedCurrentUserRoles: USER_ROLES[] = [USER_ROLES.ADMIN, USER_ROLES.TEACHER];
        if (!currentUserRole || !allowedCurrentUserRoles.includes(currentUserRole)) {
            // If current user is NOT an ADMIN or TEACHER, they are ONLY allowed to request the TEACHER role filter
            if (userRecord.role !== USER_ROLES.TEACHER) {
                return res.status(403).json({
                    error: "Forbidden",
                    message: "Access Denied: This action is unavailable for your profile"
                });
            }
        }

        res.status(200).json({data: userRecord});
    } catch (error) {
        console.error("GET /users/:id error:", error);
        res.status(500).json({error: "Failed to fetch user"});
    }
});

// List departments associated with a user
router.get("/:id/departments", async (req, res) => {
    try {

        const userId = req.params.id;
        const {page = 1, limit = 10} = req.query;

        const [userRecord] = await db
            .select({id: user.id, role: user.role})
            .from(user)
            .where(eq(user.id, userId));

        if (!userRecord) {
            return res.status(404).json({error: "User not found"});
        }

        //enforce authorise inline, rather than via middleware, as has additional role-logic
        const currentUserRole = req.user?.role;
        // Restrict so only ADMIN or TEACHER users can see all user data
        const allowedCurrentUserRoles: USER_ROLES[] = [USER_ROLES.ADMIN, USER_ROLES.TEACHER];
        if (!currentUserRole || !allowedCurrentUserRoles.includes(currentUserRole)) {
            // If current user is NOT an ADMIN or TEACHER, they are ONLY allowed to request the TEACHER role filter
            if (userRecord.role !== USER_ROLES.TEACHER) {
                return res.status(403).json({
                    error: "Forbidden",
                    message: "Access Denied: This action is unavailable for your profile"
                });
            }
        }

        if (userRecord.role !== USER_ROLES.TEACHER && userRecord.role !== USER_ROLES.STUDENT) {
            return res.status(200).json({
                data: [],
                pagination: {
                    page: 1,
                    limit: 0,
                    total: 0,
                    totalPages: 0,
                },
            });
        }

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        //Get totalCount & departmentsList for either teacher, or default (student)
        //Logic to determine department relationship varies based on user role
        const countResult =
            userRecord.role === USER_ROLES.TEACHER
                ? await db
                    .select({
                        count: sql<number>`count(distinct
                        ${departments.id}
                        )`
                    })
                    .from(departments)
                    .leftJoin(subjects, eq(subjects.departmentId, departments.id))
                    .leftJoin(classes, eq(classes.subjectId, subjects.id))
                    .where(eq(classes.teacherId, userId))
                : await db
                    .select({
                        count: sql<number>`count(distinct
                        ${departments.id}
                        )`
                    })
                    .from(departments)
                    .leftJoin(subjects, eq(subjects.departmentId, departments.id))
                    .leftJoin(classes, eq(classes.subjectId, subjects.id))
                    .leftJoin(enrollments, eq(enrollments.classId, classes.id))
                    .where(eq(enrollments.studentId, userId));

        const totalCount = countResult[0]?.count ?? 0;

        const departmentsList =
            userRecord.role === USER_ROLES.TEACHER
                ? await db
                    .select({
                        ...getTableColumns(departments),
                    })
                    .from(departments)
                    .leftJoin(subjects, eq(subjects.departmentId, departments.id))
                    .leftJoin(classes, eq(classes.subjectId, subjects.id))
                    .where(eq(classes.teacherId, userId))
                    .groupBy(
                        departments.id,
                        departments.code,
                        departments.name,
                        departments.description,
                        departments.createdAt,
                        departments.updatedAt
                    )
                    .orderBy(desc(departments.createdAt))
                    .limit(limitPerPage)
                    .offset(offset)
                : await db
                    .select({
                        ...getTableColumns(departments),
                    })
                    .from(departments)
                    .leftJoin(subjects, eq(subjects.departmentId, departments.id))
                    .leftJoin(classes, eq(classes.subjectId, subjects.id))
                    .leftJoin(enrollments, eq(enrollments.classId, classes.id))
                    .where(eq(enrollments.studentId, userId))
                    .groupBy(
                        departments.id,
                        departments.code,
                        departments.name,
                        departments.description,
                        departments.createdAt,
                        departments.updatedAt
                    )
                    .orderBy(desc(departments.createdAt))
                    .limit(limitPerPage)
                    .offset(offset);

        res.status(200).json({
            data: departmentsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            },
        });
    } catch (error) {
        console.error("GET /users/:id/departments error:", error);
        res.status(500).json({error: "Failed to fetch user departments"});
    }
});

// List subjects associated with a user
router.get("/:id/subjects", async (req, res) => {
    try {

        const userId = req.params.id;
        const {page = 1, limit = 10} = req.query;

        const [userRecord] = await db
            .select({id: user.id, role: user.role})
            .from(user)
            .where(eq(user.id, userId));

        if (!userRecord) {
            return res.status(404).json({error: "User not found"});
        }

        //enforce authorise inline, rather than via middleware, as has additional role-logic
        const currentUserRole = req.user?.role;
        // Restrict so only ADMIN or TEACHER users can see all user data
        const allowedCurrentUserRoles: USER_ROLES[] = [USER_ROLES.ADMIN, USER_ROLES.TEACHER];
        if (!currentUserRole || !allowedCurrentUserRoles.includes(currentUserRole)) {
            // If current user is NOT an ADMIN or TEACHER, they are ONLY allowed to request the TEACHER role filter
            if (userRecord.role !== USER_ROLES.TEACHER) {
                return res.status(403).json({
                    error: "Forbidden",
                    message: "Access Denied: This action is unavailable for your profile"
                });
            }
        }

        if (userRecord.role !== USER_ROLES.TEACHER && userRecord.role !== USER_ROLES.STUDENT) {
            return res.status(200).json({
                data: [],
                pagination: {
                    page: 1,
                    limit: 0,
                    total: 0,
                    totalPages: 0,
                },
            });
        }

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        //Get totalCount & subjectsList for either teacher, or default (student)
        //Logic to determine subject relationship varies based on user role
        const countResult =
            userRecord.role === USER_ROLES.TEACHER
                ? await db
                    .select({
                        count: sql<number>`count(distinct
                        ${subjects.id}
                        )`
                    })
                    .from(subjects)
                    .leftJoin(classes, eq(classes.subjectId, subjects.id))
                    .where(eq(classes.teacherId, userId))
                : await db
                    .select({
                        count: sql<number>`count(distinct
                        ${subjects.id}
                        )`
                    })
                    .from(subjects)
                    .leftJoin(classes, eq(classes.subjectId, subjects.id))
                    .leftJoin(enrollments, eq(enrollments.classId, classes.id))
                    .where(eq(enrollments.studentId, userId));

        const totalCount = countResult[0]?.count ?? 0;

        const subjectsList =
            userRecord.role === USER_ROLES.TEACHER
                ? await db
                    .select({
                        ...getTableColumns(subjects),
                        department: {
                            ...getTableColumns(departments),
                        },
                    })
                    .from(subjects)
                    .leftJoin(departments, eq(subjects.departmentId, departments.id))
                    .leftJoin(classes, eq(classes.subjectId, subjects.id))
                    .where(eq(classes.teacherId, userId))
                    .groupBy(
                        subjects.id,
                        subjects.departmentId,
                        subjects.name,
                        subjects.code,
                        subjects.description,
                        subjects.createdAt,
                        subjects.updatedAt,
                        departments.id,
                        departments.code,
                        departments.name,
                        departments.description,
                        departments.createdAt,
                        departments.updatedAt
                    )
                    .orderBy(desc(subjects.createdAt))
                    .limit(limitPerPage)
                    .offset(offset)
                : await db
                    .select({
                        ...getTableColumns(subjects),
                        department: {
                            ...getTableColumns(departments),
                        },
                    })
                    .from(subjects)
                    .leftJoin(departments, eq(subjects.departmentId, departments.id))
                    .leftJoin(classes, eq(classes.subjectId, subjects.id))
                    .leftJoin(enrollments, eq(enrollments.classId, classes.id))
                    .where(eq(enrollments.studentId, userId))
                    .groupBy(
                        subjects.id,
                        subjects.departmentId,
                        subjects.name,
                        subjects.code,
                        subjects.description,
                        subjects.createdAt,
                        subjects.updatedAt,
                        departments.id,
                        departments.code,
                        departments.name,
                        departments.description,
                        departments.createdAt,
                        departments.updatedAt
                    )
                    .orderBy(desc(subjects.createdAt))
                    .limit(limitPerPage)
                    .offset(offset);

        res.status(200).json({
            data: subjectsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            },
        });
    } catch (error) {
        console.error("GET /users/:id/subjects error:", error);
        res.status(500).json({error: "Failed to fetch user subjects"});
    }
});

export default router;
