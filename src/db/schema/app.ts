import { relations, sql } from "drizzle-orm";
import {
    boolean,
    integer,
    jsonb,
    index,
    pgEnum,
    pgTable,
    pgView,
    text,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

const timestamps = {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
};

export const classStatusEnum = pgEnum("class_status", [
    "active",
    "inactive",
    "archived",
]);

export const documentTypeEnum = pgEnum("document_type_enum", [
    "student_welcome_pack"
]);

export const documentStatusEnum = pgEnum("document_status_enum", [
    "pending",
    "processing",
    "completed",
    "failed"
]);

export const departments = pgTable("departments", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    ...timestamps,
});

export const subjects = pgTable("subjects", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    departmentId: integer("department_id")
        .notNull()
        .references(() => departments.id, { onDelete: "restrict" }),

    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    description: text("description"),

    ...timestamps,
});

export const classes = pgTable(
    "classes",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

        subjectId: integer("subject_id")
            .notNull()
            .references(() => subjects.id, { onDelete: "cascade" }),
        teacherId: text("teacher_id")
            .notNull()
            .references(() => user.id, { onDelete: "restrict" }),

        inviteCode: varchar("invite_code", { length: 50 }).notNull().unique(),
        name: varchar("name", { length: 255 }).notNull(),
        bannerCldPubId: text("banner_cld_pub_id"),
        bannerUrl: text("banner_url"),
        capacity: integer("capacity").notNull().default(50),
        description: text("description"),
        status: classStatusEnum("status").notNull().default("active"),
        schedules: jsonb("schedules").$type<Schedule[]>().notNull(),

        ...timestamps,
    },
    (table) => ({
        subjectIdIdx: index("classes_subject_id_idx").on(table.subjectId),
        teacherIdIdx: index("classes_teacher_id_idx").on(table.teacherId),
    })
);

export const enrollments = pgTable(
    "enrollments",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

        studentId: text("student_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        classId: integer("class_id")
            .notNull()
            .references(() => classes.id, { onDelete: "cascade" }),

        ...timestamps,
    },
    (table) => ({
        studentIdIdx: index("enrollments_student_id_idx").on(table.studentId),
        classIdIdx: index("enrollments_class_id_idx").on(table.classId),
        studentClassUnique: index("enrollments_student_class_unique").on(
            table.studentId,
            table.classId
        ),
    })
);


export const documents = pgTable(
    "documents",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),

        documentType: documentTypeEnum("document_type").notNull(),
        status: documentStatusEnum("status").notNull().default("pending"),

        // UX Visibility Rule: true = user initiated (show spinner), false = mass system task (hidden until complete)
        requestedByEndUser: boolean("requested_by_end_user").notNull().default(false),
        fileUrl: varchar("file_url", { length: 2048 }),
        fileName: varchar("file_name", { length: 255 }),
        errorMessage: varchar("error_message", { length: 1000 }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        startedProcessingAt: timestamp("started_processing_at", { withTimezone: true }),
        completedAt: timestamp("completed_at", { withTimezone: true }),
    },
    (table) => ({
        userIdIdx: index("documents_user_id_idx").on(table.userId),
        // "documents_user_pending_visibility_idx" included to speed up UI filtering
        userPendingVisibilityIdx: index("documents_user_pending_visibility_idx").on(
            table.userId,
            table.requestedByEndUser,
            table.status
        ),
    })
);

export const enrollmentClassCountsView = pgView("enrollment_class_counts_view").as((db) =>
    db
        .select({
            classId: enrollments.classId,
            seatsUsed: sql<number>`count(*)::int`.as("seats_used"),
        })
        .from(enrollments)
        .groupBy(enrollments.classId)
);

export const departmentsRelations = relations(departments, ({ many }) => ({
    subjects: many(subjects),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
    department: one(departments, {
        fields: [subjects.departmentId],
        references: [departments.id],
    }),
    classes: many(classes),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
    subject: one(subjects, {
        fields: [classes.subjectId],
        references: [subjects.id],
    }),
    teacher: one(user, {
        fields: [classes.teacherId],
        references: [user.id],
    }),
    enrollments: many(enrollments),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
    student: one(user, {
        fields: [enrollments.studentId],
        references: [user.id],
    }),
    class: one(classes, {
        fields: [enrollments.classId],
        references: [classes.id],
    }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
    user: one(user, {
        fields: [documents.userId],
        references: [user.id],
    }),
}));

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
