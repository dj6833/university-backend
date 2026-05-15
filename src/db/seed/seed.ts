/*
run using cmd:
 npm run db:seed
*/

import "dotenv/config";
import {neon} from "@neondatabase/serverless";
import {reset} from "drizzle-seed";
import * as schema from "../schema/index.js";
import {account, classes, departments, enrollments, subjects, user} from "../schema/index.js";
import {generateSeedUsers} from "./seed-helper.js";
import {getRandomInclusive} from "../../lib/utils.js";
import {seedData, classSeedImages} from "./seed-data.js";
import {drizzle} from "drizzle-orm/neon-http";

//region seeding-constants > >
const usersToCreate:number = 200
const adminsToCreate:number = 3
const teacherPercentageToCreate:number = 0.05
const departmentsToCreate:number = 2 //max 10 supported currently
//Randomise No. of Subjects per department using min & max here
const minSubjectsPerDepartmentToCreate:number = 3 //max 10 supported currently
const maxSubjectsPerDepartmentToCreate:number = 10 //max 10 supported currently
//Randomise No. of classes per subject using min & max here
const minClassesPerSubjectToCreate:number = 1 //max 5 supported currently
const maxClassesPerDepartmentToCreate:number = 5 //max 5 supported currently
//Randomise No. of class enrollments per student using min & max here
const minClassesPerStudent:number = 0
const maxClassesPerStudent:number = 8
//endregion

const args = process.argv.slice(2);
const retainDBData = args.includes('--retain-db-data');

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
}

const sqlCon = neon(process.env.DATABASE_URL);
const db = drizzle({client: sqlCon});

if (!retainDBData) {
    console.log("Begin clearing DB data");
    await reset(db, schema);
    console.log("DB data has been cleared");
} else {
    console.log("User requested to retain existing DB records");
}

const generateInviteCode = (name: string) => {
    const prefix = name.substring(0, 3).toUpperCase().replace(" ", "");
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `${prefix}-${random}`;
};

async function main() {
    console.log("Begin seeding");

    const capacities = [
        20, 25, 30, 35, 40, 45, 50
    ];

    const usersToInsert = generateSeedUsers(usersToCreate,adminsToCreate,teacherPercentageToCreate);

    /*
    add test user:
    gary.benson987@outluke.com (pwd: test1234)
     */
    const additionalUser = {
        id: "517c733b-7c19-478d-8011-b8668ccd827d",
        name: "Gary Benson",
        email: "gary.benson987@outluke.com",
        emailVerified: false,
        image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778671736/afrian-e-prasetyo-vsqboehwiaw-unsplash_yzunmk_48_2e0a75.jpg",
        role: "teacher" as UserRoles,
        imageCldPubId: "uploads/placeholder_value"
    };

    usersToInsert.push(additionalUser);

    const insertedUsers = await db.insert(user).values(usersToInsert).returning();
    /*
    add an [account] record so we can login as our test user:
     */
    await db.insert(account).values({
        id: "RdPIrXuGQYrgHTaHFXRO900ge9W0jaLw",
        userId: "517c733b-7c19-478d-8011-b8668ccd827d",
        accountId: "517c733b-7c19-478d-8011-b8668ccd827d",
        providerId: "credential",
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: "bed5c1b1398602091e3a4113a810fa44:1c9a1f9370d2281646297da05b5701fc5834cebdf709b7fdc59790ee5cbf27249b950b6831631f2d05c6834914d93278440350a07bc78c468612d93cedc0c30e"
    })

    const teacherIds = insertedUsers.filter((u) => u.role === "teacher").map((u) => u.id);
    const studentIds = insertedUsers.filter((u) => u.role === "student").map((u) => u.id);

    // 2. Departments, Subjects, and Classes
    const allClassIds: number[] = [];

    for (const dept of seedData.slice(0,departmentsToCreate)) {
        const deptCode = dept.name.substring(0, 3).toUpperCase();

        const [newDept] = await db.insert(departments)
            .values({
                name: dept.name,
                code: deptCode,
                description: `Official department for ${dept.name} studies.`
            })
            .returning();

        if (!newDept) {
            throw new Error('newDept cannot be null');
        }

        const noOfSubjectsToCreate = getRandomInclusive(minSubjectsPerDepartmentToCreate,maxSubjectsPerDepartmentToCreate);

        // Now iterating through subjects
        for (const subjectData of dept.subjects.slice(0,noOfSubjectsToCreate)) {
            const [newSubject] = await db.insert(subjects)
                .values({
                    name: subjectData.name,
                    departmentId: newDept.id,
                    description: subjectData.description,
                    code: subjectData.code

                })
                .returning();

            if (!newSubject) {
                throw new Error('newSubject cannot be null');
            }

            const noOfClassesToCreate = getRandomInclusive(minClassesPerSubjectToCreate,maxClassesPerDepartmentToCreate);

            const classesToInsert = subjectData.classes.slice(0,noOfClassesToCreate).map((c) => {
                const imageCloudUrl = classSeedImages[Math.floor(Math.random() * classSeedImages.length)] || 'null';
                const imageCloudIdWithExt = imageCloudUrl.substring(imageCloudUrl.lastIndexOf('/') + 1) || 'null';
                const imageCloudID = imageCloudIdWithExt.substring(0, imageCloudIdWithExt.lastIndexOf('.')) || 'null';

                return {
                    name: c.name,
                    subjectId: newSubject.id,
                    teacherId: teacherIds[Math.floor(Math.random() * teacherIds.length)] || 'null',
                    inviteCode: generateInviteCode(c.name),
                    description: c.description,
                    capacity: capacities[Math.floor(Math.random() * capacities.length)],
                    status: "active" as const,
                    bannerUrl: imageCloudUrl,
                    bannerCldPubId: imageCloudID,
                    schedules: [
                        {day: "Mon", startTime: "09:00", endTime: "11:00", room: "Lecture Hall A"}
                    ],
                };
            });

            const newClasses = await db.insert(classes).values(classesToInsert).returning();
            allClassIds.push(...newClasses.map((c) => c.id));
        }
    }

    // 3. Enrollments - for each student record, shuffle available classes and assign n to the student using slice()
    const enrollmentEntries = studentIds.flatMap((studentId) => {
        const randomClasses = [...allClassIds]
            .sort(() => 0.5 - Math.random())
            .slice(0, getRandomInclusive(minClassesPerStudent,maxClassesPerStudent));

        return randomClasses.map((classId) => ({studentId, classId}));
    });

    if (enrollmentEntries.length > 0) {
        await db.insert(enrollments).values(enrollmentEntries);
    }

    console.log("Seed complete!");

}

main().catch(console.error);
