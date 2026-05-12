import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import {user} from "../schema/index.js";
import {faker} from '@faker-js/faker';

type newUser = InferInsertModel<typeof user>;

let userRolesPool:any[] = [];

const fakeEmailDomains = [
    "mockmail.test",
    "testmail.dev",
    "dummybox.net",
    "fakeserver.io",
    "placeholder.org",
    "geemail.xyz",
    "outluke.com",
    "yawhoo.com"
];

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
    const random = Math.random();

    return {
        id: faker.string.uuid(),
        name: faker.person.fullName({ firstName, lastName }),
        //email: faker.internet.email({ firstName, lastName, provider:["test.com","rrr.com"] }),
        email: randomiseEmailDomain(faker.internet.email({ firstName, lastName, })),
        emailVerified: true,
        role: userRolesPool.pop(),
        image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778277823/uploads/pa0ccyarnsf9qnih0jaa.jpg",
        imageCldPubId: "uploads/pa0ccyarnsf9qnih0jaa"
    };
};

export const generateSeedUsers = (usersToCreate: number, adminsToCreate: number, teacherPercentageToCreate: number): newUser[] => {
    //const adminsToCreate:number = 3
    //const teacherPercentageToCreate:number = 0.15
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