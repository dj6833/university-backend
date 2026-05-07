
console.log("Script started...");

//import cors from "cors";
//import express from "express";
//import { toNodeHandler } from "better-auth/node";

//import subjectsRouter from "./routes/subjects.js";
// import usersRouter from "./routes/users.js";
// import classesRouter from "./routes/classes.js";
// import departmentsRouter from "./routes/departments.js";
// import statsRouter from "./routes/stats.js";
// import enrollmentsRouter from "./routes/enrollments.js";

// import securityMiddleware from "./middleware/security.js";
//import {auth} from "./lib/auth.js";

//import { drizzle } from "drizzle-orm/node-postgres";

//import { Pool } from "pg";
//import {departments} from "./app";

import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
//import {departments} from "./app";

import * as schema from "../schema/index.js";
import {seed, reset} from "drizzle-seed";
//import {faker} from "@faker-js/faker/locale/en";
//import { simpleFaker } from '@faker-js/faker';
import { faker } from '@faker-js/faker';

//import { relations } from "drizzle-orm";
//import {integer, pgTable, text, timestamp, varchar} from "drizzle-orm/pg-core";

const randomName = faker.person.fullName();
console.log(randomName);

const randomName2 = 'dave'

const args = process.argv.slice(2);
const retainDBData = args.includes('--retain-db-data');

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

if(!retainDBData)
{
    console.log("Begin clearing DB data");
    await reset(db, schema);
    console.log("DB data has been cleared");
}
else{
    console.log("User requested to retain existing DB records");
}

//await seed(db, { departments }, { count: 1 } );
//await seed(db, schema, { count: 1 } );

// await seed(db, schema).refine((f) => ({
//     departments: {
//         count: 5,
//         columns: {
//             description: f.valuesFromArray({
//                 values: [
//                     "The sun set behind the mountains, painting the sky in hues of orange and purple",
//                     "I can't believe how good this homemade pizza turned out!",
//                     "Sometimes, all you need is a good book and a quiet corner.",
//                     "Who else thinks rainy days are perfect for binge-watching old movies?",
//                     "Tried a new hiking trail today and found the most amazing waterfall!"
//                 ],
//             })
//         }
//     }
// }));
//process.exit(1);

async function main() {
    console.log("Begin seeding");
    const deptNames = ["Science", "Engineering", "Education", "Medicine", "Business", "Art", "Law"];


    // for (let index = 0; index < 5; index++) {
    //     const department = await db.insert(departments).values({
    //         //code: `DEP${index}`,
    //         code: faker.string.alphanumeric({ length: 6, casing: 'upper' }),
    //         name: `seed-insert-code${index}`,
    //         description: "seed-insert-description"
    //         //description:
    //     }).returning();
    // }

    await seed(db, schema, { count: 1 }).refine((f) => ({
        departments: {
            count: 1,
            columns: {
                //name: f.valuesFromArray({ values: deptNames }),
                //name: faker.lorem.words({ min: 10, max: 20 }),
                //name: randomName2,
                //description: f.valuesFromArray({ values: deptNames }),
                //description: faker.lorem.words({ min: 10, max: 20 })
                //description: simpleFaker.string.alpha()
                //description: randomName2
                description: 'hi'
            }
        }
    }));

    // await seed(db, schema, { count: 0 }).refine((funcs) => ({
    //     departments: {
    //         columns: {
    //             code: faker.string.alphanumeric({ length: 6, casing: 'upper' }),
    //             name: faker.string.alphanumeric({ length: 6, casing: 'upper' }),
    //             // name: funcs.valuesFromArray({
    //             //     // Array of values you want to generate (can be an array of weighted values)
    //             //     values: ["DeptName1", "DeptName2", "DeptName3", "DeptName4", "DeptName5"],
    //             //     // Property that controls whether the generated values will be unique or not
    //             //     isUnique: false,
    //             //
    //             //     // number of elements in each one-dimensional array.
    //             //     // (If specified, arrays will be generated.)
    //             //     //arraySize: 3
    //             // }),
    //             description: faker.string.alphanumeric({ length: 6, casing: 'upper' }),
    //             //description: faker.lorem.words({ min: 10, max: 20 }),
    //             // hashedPassword: funcs.string({
    //             //     // `isUnique` - property that controls whether the generated values will be unique or not
    //             //     isUnique: true,
    //             //
    //             //     // number of elements in each one-dimensional array.
    //             //     // (If specified, arrays will be generated.)
    //             //     //arraySize: 3
    //             // }),
    //         },
    //     },
    // }));

    console.log("Seeding complete");
    //process.exit(0); // < demo code uses this, but I get Assertion failed: !(handle->flags & UV_HANDLE_CLOSING) (relates to sockets closing possibly)
}

main().then().catch(err => {
    console.error(err);
    process.exit(0);
});




// console.log("seeding with driz-seed finished!");
// process.exit(0);

//console.log("Gets here!");

// @ts-ignore
// if ("SEED-APPROACH-1" == "SKIP") {
//
//     async function main2() {
//         console.log("seeding started!");
//         for (let index = 0; index < 10; index++) {
//             const department = await db.insert(departments).values({
//                 code: `DEP${index}`,
//                 name: `seed-insert-code${index}`,
//                 description: "seed-insert-description"
//                 //description: faker
//             }).returning();
//         }
//
//         console.log("seeding finished!");
//         process.exit(0);
//     }
//
//     main2().then().catch(err => {
//         console.error(err);
//         process.exit(0);
//     });
//
// } //"SEED-APPROACH-1"


