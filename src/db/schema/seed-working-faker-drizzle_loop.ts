import { drizzle } from "drizzle-orm/neon-http";
import "dotenv/config";
import {neon} from "@neondatabase/serverless";
import {reset} from "drizzle-seed";
import { faker } from '@faker-js/faker';
import * as schema from "../schema/index.js";

const args = process.argv.slice(2);
const retainDBData = args.includes('--retain-db-data');

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

if(!retainDBData)
{
    console.log("Begin clearing DB data");
    await reset(db, schema);
    console.log("DB data has been cleared");
}
else{
    console.log("User requested to retain existing DB records");
}

async function main (){
    console.log("Begin seeding");
    const deptNames = ["Science", "Engineering", "Education", "Medicine", "Business", "Art", "Law"];
    for (let index = 0; index < 10; index++) {
        const department = await db.insert(schema.departments).values({
            code: `DEP${index}`,
            name: faker.helpers.arrayElement(deptNames),
            description: faker.lorem.words({ min: 10, max: 20 })
        }).returning();
        const deptId = department[0]?.id;
    }

    console.log("Seeding complete");
    process.exit(0);
}

main().then().catch(err => {
    console.error(err);
    process.exit(0);
});