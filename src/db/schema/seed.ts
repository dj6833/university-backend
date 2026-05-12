//static changes from gemini
//todo-rename "data" file from gemini to something more specific
import "dotenv/config";
import {neon} from "@neondatabase/serverless";
import {seed, reset, lastNames} from "drizzle-seed";
import * as schema from "../schema/index.js";
import {account, classes, departments, enrollments, subjects, user} from "../schema/index.js";
import {faker} from '@faker-js/faker';
import {generateSeedUsers} from "./seed-helper.js";

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

// ^^ static changes outside gemini

import {seedData} from "./seed-data.js";
import {drizzle} from "drizzle-orm/neon-http";
import {integer} from "drizzle-orm/pg-core";

const generateInviteCode = (name: string) => {
    const prefix = name.substring(0, 3).toUpperCase().replace(" ", "");
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `${prefix}-${random}`;
};

async function main() {
    console.log("Begin seeding");

    const classImgs = [
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778254137/uploads/wdcp5b2s63rnpsn2qek6.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778254278/uploads/nidadu75sswsteekfpwj.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778254377/uploads/wtkdwgehm1nzt5ofitzi.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778254406/uploads/sydfwtkcv8bepf4pnw8t.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778254439/uploads/xijgsuhm8iubqm1clmf1.jpg"
    ];
    const capacities = [
        20, 25, 30, 35, 40, 45, 50
    ];

    const usersToCreate:number = 100
    const adminsToCreate:number = 3
    const teacherPercentageToCreate:number = 0.15

    // Usage: Adjust this number to change the number of records
    //const usersToInsert = generateUsers2(usersToCreate);
    const usersToInsert = generateSeedUsers(usersToCreate,adminsToCreate,teacherPercentageToCreate);

    //console.log(usersToInsert);

    const skipRest = false

    if (!skipRest)
    {


        // // 1. Users
        // const usersToInsertOLD = Array.from({length: 100}).map((_, i) => ({
        //     id: faker.string.uuid(),
        //     //name: `User ${i + 1}`,
        //     name: faker.person.fullName(),
        //     //email: `user${i + 1}@university.edu`,
        //     //email: faker.internet.email(firstName: faker.person.firstName(), lastNames: faker.person.lastName()),
        //     email: faker.internet.exampleEmail(),
        //     emailVerified: true,
        //     //role: (i === 0 ? "admin" : i < 15 ? "teacher" : "student") as "admin" | "teacher" | "student",
        //     role: (i === 0 ? "admin" : i < 15 ? "teacher" : "student") as UserRoles,
        //     image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778277823/uploads/pa0ccyarnsf9qnih0jaa.jpg",
        //     imageCldPubId: "uploads/pa0ccyarnsf9qnih0jaa"
        // }));

        /*
        add test user:
        gary.benson987@outluke.com
        test1234
         */
        const additionalUser = {
            id: "517c733b-7c19-478d-8011-b8668ccd827d",
            name: "Gary Benson",
            email: "gary.benson987@outluke.com",
            emailVerified: false,
            image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778277823/uploads/pa0ccyarnsf9qnih0jaa.jpg",
            role: "teacher" as UserRoles,
            imageCldPubId: "uploads/pa0ccyarnsf9qnih0jaa"
        };

        usersToInsert.push(additionalUser);

        const insertedUsers = await db.insert(user).values(usersToInsert).returning();
        /*
        add an account record so we can login as our test user:
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

        for (const dept of seedData) {
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

            // Now iterating through subjects
            for (const subjectData of dept.subjects) {
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

                const classesToInsert = subjectData.classes.map((c) => ({
                    name: c.name,
                    subjectId: newSubject.id, // Linked to the new Subject record
                    teacherId: teacherIds[Math.floor(Math.random() * teacherIds.length)] || 'null',
                    inviteCode: generateInviteCode(c.name),
                    description: c.description,
                    //capacity: 50,
                    capacity: capacities[Math.floor(Math.random() * capacities.length)],
                    status: "active" as const,
                    bannerUrl: classImgs[Math.floor(Math.random() * classImgs.length)] || 'null',
                    bannerCldPubId: 'b',
                    schedules: [
                        {day: "Mon", startTime: "09:00", endTime: "11:00", room: "Lecture Hall A"}
                    ],
                }));

                const newClasses = await db.insert(classes).values(classesToInsert).returning();
                allClassIds.push(...newClasses.map((c) => c.id));
            }
        }

        // 3. Enrollments
        const enrollmentEntries = studentIds.flatMap((studentId) => {
            const randomClasses = [...allClassIds]
                .sort(() => 0.5 - Math.random())
                .slice(0, 4);

            return randomClasses.map((classId) => ({studentId, classId}));
        });

        if (enrollmentEntries.length > 0) {
            await db.insert(enrollments).values(enrollmentEntries);
        }

        console.log("✨ Seed complete! Users, Departments, Subjects, Classes, and Enrollments inserted.");

    }





}

main().catch(console.error);
