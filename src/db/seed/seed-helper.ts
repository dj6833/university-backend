import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import {user} from "../schema/index.js";
import {faker} from '@faker-js/faker';
import {userSeedImages, fakeEmailDomains} from "./seed-data.js";

type newUser = InferInsertModel<typeof user>;

let userRolesPool:any[] = [];

function randomiseEmailDomain(email:string) {
    if (!email.includes('@')) {
        return "Invalid email format";
    }
    const [username] = email.split('@');
    const randomDomain = fakeEmailDomains[Math.floor(Math.random() * fakeEmailDomains.length)];
    return `${username}@${randomDomain}`;
}

const createRandomUser = (): newUser => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
        id: faker.string.uuid(),
        name: faker.person.fullName({ firstName, lastName }),
        email: randomiseEmailDomain(faker.internet.email({ firstName, lastName, })),
        emailVerified: true,
        role: userRolesPool.pop(),
        image: userSeedImages[Math.floor(Math.random() * userSeedImages.length)],
        imageCldPubId: "uploads/placeholder_value"
    };
};

export const generateSeedUsers = (usersToCreate: number, adminsToCreate: number, teacherPercentageToCreate: number): newUser[] => {
    const nonAdminUsersToCreate:number = usersToCreate-adminsToCreate
    userRolesPool = [
        ...Array(adminsToCreate).fill("admin"),
        ...Array(Math.floor(nonAdminUsersToCreate * teacherPercentageToCreate)).fill("teacher"),
        ...Array(nonAdminUsersToCreate - Math.floor(nonAdminUsersToCreate * 0.01) - Math.floor(nonAdminUsersToCreate * teacherPercentageToCreate)).fill("student")
    ];
    userRolesPool.sort(() => Math.random() - 0.5); //shuffle pool

    return faker.helpers.multiple(createRandomUser, {
        count: usersToCreate,
    });
};