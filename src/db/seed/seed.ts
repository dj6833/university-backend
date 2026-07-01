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

//region seeding-constants > >
const usersToCreate:number = 2000; //200
const adminsToCreate:number = 3
const teacherPercentageToCreate:number = 0.05
const departmentsToCreate:number = 10 ; // 2 //max 10 supported currently
//Randomise No. of Subjects per department using min & max here
const minSubjectsPerDepartmentToCreate:number = 10 ; //3 //max 10 supported currently
const maxSubjectsPerDepartmentToCreate:number = 10 //max 10 supported currently
//Randomise No. of classes per subject using min & max here
const minClassesPerSubjectToCreate:number = 5 ; //1 //max 5 supported currently
const maxClassesPerSubjectToCreate:number = 5 //max 5 supported currently
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
    add test users (pwd stored separately off github as site now in Prod)
     */

    var additionalUser = {
        id: "PKjBSRLYnEoe3Y5F6gHNEhn0rJEfQLGP",
        name: "Laura Wilcox",
        email: "laura_wilcox_73@fakeserver.io",
        emailVerified: false,
        image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674830/afrian-e-prasetyo-t3ityxHmCNY-unsplash_p49ltf_48x48.jpg",
        role: "admin" as UserRoles,
        imageCldPubId: "uploads/placeholder_value"
    };
    usersToInsert.push(additionalUser);
    additionalUser = {
        id: "5CuJqyne90XsAkqZHT9iqz2g2utF7vQq",
        name: "Gary Benson",
        email: "gary.benson987@outluke.com",
        emailVerified: false,
        image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778671736/afrian-e-prasetyo-vsqboehwiaw-unsplash_yzunmk_48_2e0a75.jpg",
        role: "teacher" as UserRoles,
        imageCldPubId: "uploads/placeholder_value"
    };
    usersToInsert.push(additionalUser);
    additionalUser = {
        id: "EXslqUsnjguOBURhn61fheG94EZj46UD",
        name: "Edward Haley",
        email: "edward.haley@dummybox.net",
        emailVerified: false,
        image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674873/vedant-bathia-T4F2tMFFzZc-unsplash_i5pgwo_48x48.jpg",
        role: "teacher" as UserRoles,
        imageCldPubId: "uploads/placeholder_value"
    };
    usersToInsert.push(additionalUser);
    additionalUser = {
        id: "NodSIAbjXrk83GxsQ2WdEaqlPkoL42gI",
        name: "Bob Dean",
        email: "bob.dean115@abcmail.com",
        emailVerified: false,
        image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674932/nicolas-MUYQsvtlw98-unsplash_lkmeka_48x48.jpg",
        role: "student" as UserRoles,
        imageCldPubId: "uploads/placeholder_value"
    };
    usersToInsert.push(additionalUser);
    additionalUser = {
        id: "CHvF5Z2AQhg7HNgguKbW8RD5uQT4wKQS",
        name: "Joanna Oconnell",
        email: "joannaoconnell3975@testmail.dev",
        emailVerified: false,
        image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674837/gilang-yuda-alyahya-66DFSxybtQ8-unsplash_c7rskn_48x48.jpg",
        role: "student" as UserRoles,
        imageCldPubId: "uploads/placeholder_value"
    };
    usersToInsert.push(additionalUser);

    const insertedUsers = await db.insert(user).values(usersToInsert).returning();
    /*
    add [account] records so we can login as our test users:
     */
    //Laura_wilcox_73@fakeserver.io
    await db.insert(account).values({
        id: "Ol32C61ZBb7oiYkWIvKPIDTerTbdCHf3",
        userId: "PKjBSRLYnEoe3Y5F6gHNEhn0rJEfQLGP",
        accountId: "PKjBSRLYnEoe3Y5F6gHNEhn0rJEfQLGP",
        providerId: "credential",
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: "91db292961fc4bad0c40f8ea87a35635:0526c007ba4eb0e15a7db11bab9a3ad2b4bda20f9c9422ec1a37035f6f733f597085396ff62af22211512df1d4411f073f8d44eaa1e9fed26338f005050108e8"
    })
    //gary.benson987@outluke.com
    await db.insert(account).values({
        id: "6llYyzkAYOUvPTMQ1S8J48bNcQauujxz",
        userId: "5CuJqyne90XsAkqZHT9iqz2g2utF7vQq",
        accountId: "5CuJqyne90XsAkqZHT9iqz2g2utF7vQq",
        providerId: "credential",
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: "2c6d6a62fe0bb1e4095cf37c610dd111:553e910f9461cc9a20da816bad79eb4cb38916de2d3e397e1c6cddd29fa367b3100940fcad4059d2fc21a594439b36d8fdaa2763e5e42dba9bd85e592285031d"
    })
    //Edward.Haley@dummybox.net
    await db.insert(account).values({
        id: "Lla92bSMHVmPos5YBR5CovB8rgVYNx5u",
        userId: "EXslqUsnjguOBURhn61fheG94EZj46UD",
        accountId: "EXslqUsnjguOBURhn61fheG94EZj46UD",
        providerId: "credential",
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: "8a8024ac88f071b12bbbf2cec190c2fb:5f492c92471d59f0a90ba4da65868cbf985c73d993670e7fbeecafb6e8061d78e6cb775dac58784dec5dbf67eaeb2da67939f03f2dee79a90090c8278ff0dc6c"
    })
    //Bob.Dean115@abcmail.com
    await db.insert(account).values({
        id: "UEXGza56U8WolcOSCWoKWwHuBjcUrw9J",
        userId: "NodSIAbjXrk83GxsQ2WdEaqlPkoL42gI",
        accountId: "NodSIAbjXrk83GxsQ2WdEaqlPkoL42gI",
        providerId: "credential",
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: "8a10ac6c6814676fa0bb84048890168d:5f9518787bba30c12cd4fd002bf848001928e04779db544ca2281be8c5acb45140c6dda2bd2f72d437182a412a9c521458f120448ded5b0bbbc172f3cec0a6f9"
    })
    // joannaoconnell3975@testmail.dev
    await db.insert(account).values({
        id: "LrWPBY4mMW8J1qGSYsTK0uxDgdTBMlBc",
        userId: "CHvF5Z2AQhg7HNgguKbW8RD5uQT4wKQS",
        accountId: "CHvF5Z2AQhg7HNgguKbW8RD5uQT4wKQS",
        providerId: "credential",
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: "f06efb853e14bdbdf437a0509e365e35:629fee68f6baeee933c15020639ac6e163cc6bcd62d8ed598fe4308ddfa51532acbf51d334f2257130e80fa6be2768b7a8881a9f081e74c5aecf1c50e32e4ce6"
    })

    const teacherIds = insertedUsers.filter((u) => u.role === "teacher").map((u) => u.id);
    const studentIds = insertedUsers.filter((u) => u.role === "student").map((u) => u.id);

    // 2. Departments, Subjects, and Classes
    const allClassIds: number[] = [];
    const classCapacityMap: Record<number, number> = {};
    const seededClassesTracker: Array<{ id: number; name: string }> = [];

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

            const noOfClassesToCreate = getRandomInclusive(minClassesPerSubjectToCreate,maxClassesPerSubjectToCreate);

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

            newClasses.forEach((c) => {
                allClassIds.push(c.id);
                classCapacityMap[c.id] = c.capacity;
            });

            seededClassesTracker.push(...newClasses.map((c) => ({ id: c.id, name: c.name })));
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
