import "dotenv/config";
import {neon} from "@neondatabase/serverless";
import {seed, reset, lastNames} from "drizzle-seed";
import * as schema from "../schema/index.js";
import {account, classes, departments, enrollments, subjects, user} from "../schema/index.js";
import {faker} from '@faker-js/faker';
import {generateSeedUsers} from "./seed-helper.js";
import {getRandomInclusive} from "../../lib/utils.js";

//region seeding-constants
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

    const classSeedImages = [
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778681018/salman-ahmad-felR0PqEqLM-unsplash_aikcte_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778681015/studio-humi-6dlOgFhHYZ8-unsplash_vsjivu_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778681011/sayyam-abbasi-m0hPqbPPrtM-unsplash_a0cg6v_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778681006/luky-triohandoko-eecTcKqXpz8-unsplash_u440sk_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778681001/luky-triohandoko-ugGd6GTRYcQ-unsplash_cmmlvd_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680997/vectorelements-yRqlDIz_Bbs-unsplash_hqfm9i_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680993/alghozy-YzLyge9ioO0-unsplash_ots8tj_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680989/rizki-kurniawan-Ycrcqbv4DD4-unsplash_vl3ntd_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680985/luky-triohandoko-vpsyXCvVT7Y-unsplash_omfazw_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680981/alghozy-d4EmRoplmf0-unsplash_ckaz9x_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680978/free-to-dive-AsM1O4dspWM-unsplash_l8ltjc_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680974/vectorelements-UI9uldv8S3c-unsplash_x4cuyn_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680970/alghozy-zlhicWfdYvQ-unsplash_gzjiyr_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680967/maulana-ahmad-JSvhPfmanAE-unsplash_vhfcrn_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680962/alghozy-lb2d4fffntE-unsplash_bluish_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680959/alghozy-nx4YXK8g2Wo-unsplash_jh7g27_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680955/marco-E0NzRN0P-kI-unsplash_v4jjht_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680951/remapstudio-NIRbWfpKhQ8-unsplash_nk8aps_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680948/free-to-dive-Qv_z-brUKoE-unsplash_xqd6fu_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680944/irvan-maulana-dvm3ujMot60-unsplash_jrk8l5_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680940/erone-stuff-BAchx1hvFiw-unsplash_zzmezf_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680936/alghozy-B1JfBtPq3iA-unsplash_pw4vjb_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680932/alghozy-eozqULtN00A-unsplash_yqtnen_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680927/muhammad-afandi-8ZEGmMZIQIM-unsplash_dy4cf9_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680924/free-to-dive-XNn9YFCjoiA-unsplash_xgetol_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680921/erone-stuff-JJq8SUNWTcA-unsplash_ppov6c_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680917/irvan-maulana-xF3spCnKUps-unsplash_wq14vx_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680914/irvan-maulana-H2mcXb2NOc8-unsplash_kiw8ko_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680910/salman-ahmad-CL-jQ9CVq6A-unsplash_dof3ty_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680906/ubaid-e-alyafizi-GLo363VtDr0-unsplash_ordty2_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680904/graficon-stuff-zGTvZ5TaCc4-unsplash_ek9gep_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680899/maulana-ahmad-7jK1X2yk-kc-unsplash_lb5ytx_8e0d99.jpg",
        "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778680895/open-clip-art-kB2sfouB07A-unsplash_fsulik_8e0d99.jpg"
        ];

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
    //const

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
                //const randomClassSeedImage = classSeedImages[Math.floor(Math.random() * classSeedImages.length)];
                const imageCloudUrl = classSeedImages[Math.floor(Math.random() * classSeedImages.length)] || 'null';
                //const imageCloudUrl = randomClassSeedImage?.imageCloudUrl || 'null';
                //const imageCloudID = randomClassSeedImage?.imageCloudID || 'null';
                //const imageCloudUrl2 = 'https://res.cloudinary.com/dnfko6vxu/image/upload/v1778679214/salman-ahmad-cl-jq9cvq6a-unsplash_mkrlos_054936_1000x_6cd31b.jpg';

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

    // 3. Enrollments
    const enrollmentEntries = studentIds.flatMap((studentId) => {
        const randomClasses = [...allClassIds]
            .sort(() => 0.5 - Math.random())
            .slice(0, getRandomInclusive(minClassesPerStudent,maxClassesPerStudent));

        return randomClasses.map((classId) => ({studentId, classId}));
    });

    if (enrollmentEntries.length > 0) {
        await db.insert(enrollments).values(enrollmentEntries);
    }

    console.log("✨ Seed complete! Users, Departments, Subjects, Classes, and Enrollments inserted.");

}

main().catch(console.error);
