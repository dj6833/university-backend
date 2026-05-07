//attempt to use drizzle-seed and then overwrite descriptive fields
//possibly with inserts-via-drizzle-seed, and then update with realistic data?
import { drizzle } from "drizzle-orm/neon-http";
import "dotenv/config";
import {neon} from "@neondatabase/serverless";
import {seed, reset} from "drizzle-seed";
import * as schema from "../schema/index.js";
import {departments, subjects} from "../schema/index.js";
import {eq, sql} from "drizzle-orm";

const args = process.argv.slice(2);
const retainDBData = args.includes('--retain-db-data');

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
}

const sqlCon = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sqlCon });

if(!retainDBData)
{
    console.log("Begin clearing DB data");
    await reset(db, schema);
    console.log("DB data has been cleared");
}
else{
    console.log("User requested to retain existing DB records");
}

async function mainBASIC (){
    console.log("Begin seeding");

    await seed(db, schema, { count: 1000 } );

    console.log("Seeding complete");
    process.exit(0);
}

async function main (){
    console.log("Begin seeding");
    const deptNames = ["Science", "Engineering", "Education", "Medicine", "Business", "Art", "Law"];
    const subjectNames = ["Intro to something", "Blah Blah 101", "Advanced stuff", "Foundational yadda yadda", "Really Complex things", "Principles of xyz", "Basics for basics", "Anatomy of a fing", "Key Skills", "Expert in abc"];

    await seed(db, schema).refine((funcs) => ({
        departments: {
            count: 5,
            columns: {
                code: funcs.string({
                    // `isUnique` - property that controls whether the generated values will be unique or not
                    isUnique: true
                }),
                name: funcs.valuesFromArray({ values: deptNames, isUnique: true }),
                description: funcs.loremIpsum()
            }
        },
        subjects: {
            count: 10,
            columns: {
                // name: funcs.string({
                //     // `isUnique` - property that controls whether the generated values will be unique or not
                //     isUnique: true
                // }),
                name: funcs.valuesFromArray({ values: subjectNames, isUnique: true }),
                description: funcs.loremIpsum()
            }
        }
    }))

    //****SECOND PASS TO IMPROVE DATA REQUIREMENTS NOT POSSIBLE WITH DRIZZLE-SEED.REFINE()***
    //Set departments.code to be only 6 digits
    await db.update(departments)
        .set({
            code: sql`Upper(Left(${departments.code},6))`
        })
    //Set subjects.code to be only 5 digits
    await db.update(subjects)
        .set({
            code: sql`Upper(Left(${subjects.code},5))`
        })
    //****SECOND PASS TO IMPROVE DATA REQUIREMENTS NOT POSSIBLE WITH DRIZZLE-SEED.REFINE()***

    console.log("Seeding complete");
    process.exit(0);
}

main().then().catch(err => {
    console.error(err);
    process.exit(0);
});