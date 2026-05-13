import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import {user} from "../schema/index.js";
import {faker} from '@faker-js/faker';

type newUser = InferInsertModel<typeof user>;

const userSeedImages = [
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674935/muhammad-afandi-zaBpWuMMy5k-unsplash_lydaok_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674932/nicolas-MUYQsvtlw98-unsplash_lkmeka_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674929/gilang-yuda-alyahya-twlc92kxa30-unsplash_kfhobt_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674924/public-domain-vectors-e2MI7N0cmss-unsplash_vhxfwo_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674920/round-icons-f0u64MXHqAg-unsplash_lgbvr7_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674916/deep-wYEBIbmrJ4E-unsplash_jbnhmo_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674913/public-domain-vectors-qo743_3jgjk-unsplash_lexhix_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674909/round-icons-jCYzIA9F2sY-unsplash_etwfch_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674904/muhammad-afandi-YpMkWvDilLo-unsplash_zhrbec_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674900/round-icons-MrVyoiMHUxA-unsplash_mpetwt_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674896/round-icons-NmclRfgEmhQ-unsplash_txxt3d_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674891/round-icons-MFawtnWa6ow-unsplash_upshbk_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674887/round-icons-HqQ_iP519Yk-unsplash_zo23pj_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674883/round-icons-yRbTBLETRzE-unsplash_jrcyul_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674879/round-icons-Bj6C0qEH8Hc-unsplash_e7r32m_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674876/round-icons-BEAojQGMW5Q-unsplash_gg63qx_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674873/vedant-bathia-T4F2tMFFzZc-unsplash_i5pgwo_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674870/round-icons-iG7WYaUYcig-unsplash_nhbkx3_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674866/round-icons-7HKmEN9Rglg-unsplash_lzrzdu_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674863/artby-hensi-ELsHxUox7OU-unsplash_qeuq9w_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674859/muhammad-afandi-XgORLJeJasY-unsplash_eql7iz_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674855/boxicons-f1tW5UFodP0-unsplash_jam5h6_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674851/tatiana-olina-HKXO50H-XPw-unsplash_dwy6fm_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674848/tatiana-olina-4aqM3cSnqS0-unsplash_in3cmx_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674845/artby-hensi-tTcZ607X66Q-unsplash_jwxvfa_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674841/annie-spratt-K-zBHztVWSo-unsplash_qtyzda_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674837/gilang-yuda-alyahya-66DFSxybtQ8-unsplash_c7rskn_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674834/annie-spratt-6E4P-x_yQME-unsplash_rhk1bm_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778674830/afrian-e-prasetyo-t3ityxHmCNY-unsplash_p49ltf_48x48.jpg",
    "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778671736/afrian-e-prasetyo-vsqboehwiaw-unsplash_yzunmk_48_2e0a75.jpg"
];

let userRolesPool:any[] = [];

const fakeEmailDomains = [
    "mockmail.test",
    "testmail.dev",
    "dummybox.net",
    "fakeserver.io",
    "placeholder.org",
    "geemail.xyz",
    "outluke.com",
    "yawhoo.com",
    "abcmail.com",
    "example.com",
    "example.net",
    "@example.org"
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
        //image: "https://res.cloudinary.com/dnfko6vxu/image/upload/v1778277823/uploads/pa0ccyarnsf9qnih0jaa.jpg",
        image: userSeedImages[Math.floor(Math.random() * userSeedImages.length)],
        imageCldPubId: "uploads/placeholder_value"
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