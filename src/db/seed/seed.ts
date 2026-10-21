/*
run using cmd:
 npm run build && node dist/db/seed/seed.js
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
import {auth} from "../../lib/auth.js";
import crypto from "crypto";
import readline from "readline"; // Native Node.js module for terminal interaction
import { type InferInsertModel } from "drizzle-orm";

//region seeding-constants > >
const usersToCreate: number = 1500; //200
const adminsToCreate: number = 3
const teacherPercentageToCreate: number = 0.05
const departmentsToCreate: number = 10; // 2 //max 10 supported currently
//Randomise No. of Subjects per department using min & max here
const minSubjectsPerDepartmentToCreate: number = 10; //3 //max 10 supported currently
const maxSubjectsPerDepartmentToCreate: number = 10 //max 10 supported currently
//Randomise No. of classes per subject using min & max here
const minClassesPerSubjectToCreate: number = 5; //1 //max 5 supported currently
const maxClassesPerSubjectToCreate: number = 5 //max 5 supported currently
//Randomise No. of class enrollments per student using min & max here
const minClassesPerStudent: number = 5
const maxClassesPerStudent: number = 8
//endregion

// =========================================================================
// TARGET CONFIGURATION VALUE
// Manually change this value here to switch seed password environment targets
// Valid options: "DEV" | "STAGING" | "PROD"
// =========================================================================
const SEED_TARGET: "DEV" | "STAGING" | "PROD" = "PROD";


const generateInviteCode = (name: string) => {
    const prefix = name.substring(0, 3).toUpperCase().replace(" ", "");
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `${prefix}-${random}`;
};

function confirmExecution(target: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(`The script is set to create users for [${target}] environment (ensure you have set the DATABASE_URL to match this) - Do you want to continue? (y/n): `, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase() === "y");
        });
    });
}

const args = process.argv.slice(2);
const retainDBData = args.includes('--retain-db-data');

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
}

const sqlCon = neon(process.env.DATABASE_URL);
const db = drizzle({client: sqlCon});

async function main() {
    const isConfirmed = await confirmExecution(SEED_TARGET);
    if (!isConfirmed) {
        console.log("Execution aborted by user.");
        return;
    }

    if (!retainDBData) {
        console.log("Begin clearing DB data");
        await reset(db, schema);
        console.log("DB data has been cleared");
    } else {
        console.log("User requested to retain existing DB records");
    }

    console.log("Begin seeding");

    const capacities = [
        20, 25, 30, 35, 40, 45, 50
    ];

    // Use Better Auth's cryptographic runtime context for creating hashed passwords
    const ctx = await auth.$context;
    const hasher = ctx.password;

    const usersToInsert = generateSeedUsers(usersToCreate, adminsToCreate, teacherPercentageToCreate);

    const insertedUsers = await db.insert(user).values(usersToInsert).returning();

    type NewUser = InferInsertModel<typeof user>;
    const additionalUsersToInsert: NewUser[] = []

    /*
    add test users (pwds stored privately in .env file)
     */

    var additionalUser = {
        id: crypto.randomUUID(),
        name: "Laura Wilcox",
        email: "laura_wilcox_73@fakeserver.io",
        emailVerified: true,
        image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674830/afrian-e-prasetyo-t3ityxHmCNY-unsplash_p49ltf_48x48.jpg",
        role: "admin" as UserRoles,
        imageCldPubId: "uploads/placeholder_value"
    };
    additionalUsersToInsert.push(additionalUser);
    additionalUser = {
        id: crypto.randomUUID(),
        name: "Gary Benson",
        email: "gary.benson987@outluke.com",
        emailVerified: true,
        image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778671736/afrian-e-prasetyo-vsqboehwiaw-unsplash_yzunmk_48_2e0a75.jpg",
        role: "teacher" as UserRoles,
        imageCldPubId: "uploads/placeholder_value"
    };
    additionalUsersToInsert.push(additionalUser);
    additionalUser = {
        id: crypto.randomUUID(),
        name: "Edward Haley",
        email: "edward.haley@dummybox.net",
        emailVerified: true,
        image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674873/vedant-bathia-T4F2tMFFzZc-unsplash_i5pgwo_48x48.jpg",
        role: "teacher" as UserRoles,
        imageCldPubId: "uploads/placeholder_value"
    };
    additionalUsersToInsert.push(additionalUser);
    additionalUser = {
        id: crypto.randomUUID(),
        name: "Bob Dean",
        email: "bob.dean115@abcmail.com",
        emailVerified: true,
        image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674932/nicolas-MUYQsvtlw98-unsplash_lkmeka_48x48.jpg",
        role: "student" as UserRoles,
        imageCldPubId: "uploads/placeholder_value"
    };
    additionalUsersToInsert.push(additionalUser);
    additionalUser = {
        id: crypto.randomUUID(),
        name: "Joanna Oconnell",
        email: "joannaoconnell3975@testmail.dev",
        emailVerified: true,
        image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674837/gilang-yuda-alyahya-66DFSxybtQ8-unsplash_c7rskn_48x48.jpg",
        role: "student" as UserRoles,
        imageCldPubId: "uploads/placeholder_value"
    };
    additionalUsersToInsert.push(additionalUser);

    /*
    add [account] records so we can login as our test users:
     */

    for (const mockUser of additionalUsersToInsert) {
        try {
            // Build the dynamic env key using the hardcoded script config value
            const formattedName = mockUser.name.replace(/\s+/g, '_').toUpperCase();
            const expectedEnvKey = `SEED_USER_${formattedName}_${SEED_TARGET}_PWD`;

            const plainTextPassword = process.env[expectedEnvKey];
            if (!plainTextPassword) {
                console.warn(`Warning: Expected environment variable "${expectedEnvKey}" is missing. Skipping user.`);
                continue;
            }
            // Generate dynamic scrypt hash natively
            const dynamicHash = await hasher.hash(plainTextPassword);
            // Insert User Record
            const mockUserInserted = await db.insert(user).values(mockUser).returning();

            //add additional user to insertedUsers array, so these users are included in the remainder of the seed process
            insertedUsers.push(...mockUserInserted);

            // Insert Account Record
            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: mockUser.id,
                accountId: mockUser.id,
                providerId: "credential",
                accessToken: null,
                refreshToken: null,
                idToken: null,
                accessTokenExpiresAt: null,
                refreshTokenExpiresAt: null,
                scope: null,
                password: dynamicHash
            }).returning();

        } catch (error) {
            console.error(`Creation failure for user ${mockUser.email}:`, error);
        }
    }

    const teacherIds = insertedUsers.filter((u) => u.role === "teacher").map((u) => u.id);
    const studentIds = insertedUsers.filter((u) => u.role === "student").map((u) => u.id);

    // Departments, Subjects, and Classes
    const allClassIds: number[] = [];
    const classCapacityMap: Record<number, number> = {};
    const seededClassesTracker: Array<{ id: number; name: string }> = [];

    for (const dept of seedData.slice(0, departmentsToCreate)) {
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

        const noOfSubjectsToCreate = getRandomInclusive(minSubjectsPerDepartmentToCreate, maxSubjectsPerDepartmentToCreate);

        // Now iterating through subjects
        for (const subjectData of dept.subjects.slice(0, noOfSubjectsToCreate)) {
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

            const noOfClassesToCreate = getRandomInclusive(minClassesPerSubjectToCreate, maxClassesPerSubjectToCreate);

            const classesToInsert = subjectData.classes.slice(0, noOfClassesToCreate).map((c) => {
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

            newClasses.forEach((c) => {
                allClassIds.push(c.id);
                classCapacityMap[c.id] = c.capacity;
            });

            seededClassesTracker.push(...newClasses.map((c) => ({id: c.id, name: c.name})));
        }
    }

    const classEnrollmentCounts: Record<number, number> = {};
    allClassIds.forEach(id => {
        classEnrollmentCounts[id] = 0;
    });

    const enrollmentEntries = studentIds.flatMap((studentId) => {
        const targetsToEnroll = getRandomInclusive(minClassesPerStudent, maxClassesPerStudent);
        const availableClasses = allClassIds.filter((classId) => {
            const currentCount = classEnrollmentCounts[classId] ?? 0;
            const maxCapacity = classCapacityMap[classId] ?? 0;
            return currentCount < maxCapacity; // Only allow if a seat is physically free
        });

        const selectedClasses = availableClasses
            .sort(() => 0.5 - Math.random())
            .slice(0, targetsToEnroll);

        selectedClasses.forEach((classId) => {
            classEnrollmentCounts[classId] = (classEnrollmentCounts[classId] ?? 0) + 1;
        });

        return selectedClasses.map((classId) => ({
            studentId,
            classId
        }));
    });

    if (enrollmentEntries.length > 0) {
        await db.insert(enrollments).values(enrollmentEntries);
    }

    console.log("\n=======================================================");
    console.log("   SEEDING COMPLETE: CLASS CAPACITY REPORT");
    console.log("=======================================================");

    const capacityAuditReport = allClassIds.map((classId) => {
        const maxCapacity = classCapacityMap[classId] ?? 0;
        const seatsFilled = classEnrollmentCounts[classId] ?? 0;
        const spacesLeft = maxCapacity - seatsFilled;

        const matchingClass = seededClassesTracker.find((c) => c.id === classId);

        return {
            "Class ID": classId,
            "Class Name": matchingClass?.name || "Unknown Module",
            "Max Capacity": maxCapacity,
            "Seats Filled": seatsFilled,
            "Remaining Spaces": spacesLeft,
            "Status": spacesLeft === 0 ? "FULL" : spacesLeft <= 3 ? "ALMOST FULL" : "AVAILABLE"
        };
    });

    console.table(capacityAuditReport);

    console.log(`Total Enrolment Records Generated: ${enrollmentEntries.length}`);
    console.log("=======================================================\n");

    console.log("Seed complete!");

}


main().catch(console.error);

