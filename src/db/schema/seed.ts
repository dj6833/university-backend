//attempt to use drizzle-seed and then overwrite descriptive fields
//possibly with inserts-via-drizzle-seed, and then update with realistic data?
import { drizzle } from "drizzle-orm/neon-http";
import "dotenv/config";
import {neon} from "@neondatabase/serverless";
import {seed, reset} from "drizzle-seed";
import * as schema from "../schema/index.js";
import {account, classes, departments, subjects, user, verification} from "../schema/index.js";
import {and, eq, sql} from "drizzle-orm";
import { faker } from '@faker-js/faker';

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
    const classImgs = [
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778254137/uploads/wdcp5b2s63rnpsn2qek6.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778254278/uploads/nidadu75sswsteekfpwj.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778254377/uploads/wtkdwgehm1nzt5ofitzi.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778254406/uploads/sydfwtkcv8bepf4pnw8t.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778254439/uploads/xijgsuhm8iubqm1clmf1.jpg"
    ];

    await seed(
        db,
        schema,
        { count: 1000}
    ).refine((funcs) => ({
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
        },
        classes: {
            count: 10,
            columns: {
                description: funcs.loremIpsum(),
                bannerUrl: funcs.valuesFromArray({ values: classImgs, isUnique: false }),
                capacity: funcs.int({minValue: 10,maxValue: 40, isUnique: false})
            }
        }
    }))

    //****SECOND PASS TO IMPROVE DATA REQUIREMENTS NOT POSSIBLE WITH DRIZZLE-SEED.REFINE()***

    //clear session (logged-in users) data, verification (2FA etc) as no benefit in drizzle seeding these; and create test user logins
    /*
    gary.benson987@outluke.com
    test1234
     */

    await db.delete(schema.session)
    await db.delete(schema.verification)

    await db.insert(schema.user).values({
        id:"LEf9ZncdKBzgxzC8fYrvHIXUimp4qWLU",name:"Gary Benson",email:"gary.benson987@outluke.com",emailVerified:false,image:"https://res.cloudinary.com/dnfko6vxu/image/upload/v1778277823/uploads/pa0ccyarnsf9qnih0jaa.jpg",role:"teacher",imageCldPubId:"uploads/pa0ccyarnsf9qnih0jaa"
    })

        // [{"id":"LEf9ZncdKBzgxzC8fYrvHIXUimp4qWLU","name":"Gary Benson","email":"gary.benson987@outluke.com","email_verified":false,"image":"https://res.cloudinary.com/dnfko6vxu/image/upload/v1778278753/uploads/cklarbrbpned3gdusklv.jpg","role":"teacher","image_cld_pub_id":"uploads/cklarbrbpned3gdusklv","created_at":"2026-05-08 22:19:49.573","updated_at":"2026-05-08 22:19:49.573"}]

    await db.insert(schema.account).values({
        id:"RdPIrXuGQYrgHTaHFXRO900ge9W0jaLw",
        userId:"LEf9ZncdKBzgxzC8fYrvHIXUimp4qWLU",
        accountId:"LEf9ZncdKBzgxzC8fYrvHIXUimp4qWLU",
        providerId:"credential",
        accessToken:null,
        refreshToken:null,
        idToken:null,
        accessTokenExpiresAt:null,
        refreshTokenExpiresAt:null,
        scope:null,
        password:"bed5c1b1398602091e3a4113a810fa44:1c9a1f9370d2281646297da05b5701fc5834cebdf709b7fdc59790ee5cbf27249b950b6831631f2d05c6834914d93278440350a07bc78c468612d93cedc0c30e"
    })

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
    //Set classes invite code 7 digits, name to be subject & teacher-name, and tidy inviteCode
    //Couldn't find a way of creating an update stmt using Drizzle & 2x joins, gave up and opted for "raw" sql:
    //The approaches taken have been kept, commented-out below this stmt
    await db.execute(`UPDATE "classes"
                      SET
                          "name" = "subjects"."name" || ' with ' || "user"."name" ,
                          "description" = "subjects"."description",
                          "invite_code" = Upper(Left("classes"."invite_code",10))
                          FROM "user", "subjects"
                      WHERE "classes"."teacher_id" = "user"."id"
                        AND "classes"."subject_id" = "subjects"."id";`)


    //read it should allow >1 table in from field, doesn't work:
    // await db
    //     .update(classes)
    //     .set({ description: subjects.description, name: sql`${user.email}`})
    //     .from(user, subjects)
    //     .where(
    //         and(
    //             eq(subjects.id, classes.subjectId),
    //             eq(user.id, classes.teacherId))
    //     )

    //using innerJoin also not working
    // if ("a" === "b") {
    // await db
    //     .update(classes)
    //     .set({ description: subjects.description, name: sql`${user.email}`})
    //     .from(user)
    //     //.innerJoin(cities, eq(users.cityId, cities.id))
    //     //.innerJoin(payments, eq(users.id, payments.userId))
    //     .innerJoin(subjects, eq(classes.teacherId, subjects.id))
    //     .where(
    //             eq(classes.teacherId, user.id)//, // Linking updated table
    //         );
    // }

    //first attempt mixing the update, from and join to achieve 3 tables, not working
    // if ("a" === "b") {
    //     await db.update(classes)
    //         .set(
    //             {
    //                 inviteCode: sql`Upper(Left(
    //                 ${classes.inviteCode},
    //                 10
    //                 )
    //                 )`,
    //                 name: sql`${subjects.name}
    //                 || ' with ' ||
    //                 ${user.name}`
    //             }
    //             //{ description: 'desc_aaa', name: 'name_aaa', banner_cld_pub_id: 'uploads/ydjlywel8pf1zbrqph39', banner_url: 'cfNVKGUYNamc3A2' },
    //             //{ description: 'desc_aaa', name: 'name_aaa', bannerCldPubId: 'uploads/ydjlywel8pf1zbrqph39'},
    //         )
    //         .from(subjects)
    //         //.leftJoin(subjects, eq(classes.subjectId, subjects.id))
    //         .leftJoin(user, eq(classes.teacherId, user.id))
    //         .where(eq(subjects.id, classes.subjectId))
    //     //.where(and(eq(subjects.id, classes.subjectId), eq(user.id, classes.teacherId)))
    // } //if a===b

    //****END - SECOND PASS TO IMPROVE DATA REQUIREMENTS NOT POSSIBLE WITH DRIZZLE-SEED.REFINE()***

    console.log("Seeding complete");
    process.exit(0);
}

main().then().catch(err => {
    console.error(err);
    process.exit(0);
});