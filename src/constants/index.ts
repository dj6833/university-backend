export const USER_ROLES = {
    STUDENT: "student",
    TEACHER: "teacher",
    ADMIN: "admin",
} as const;

export type USER_ROLES = typeof USER_ROLES[keyof typeof USER_ROLES];