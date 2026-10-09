import { S3Client } from "@aws-sdk/client-s3";

const r2Endpoint = process.env.R2_ENDPOINT_URL;
const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY;

if (!r2Endpoint || !r2AccessKey || !r2SecretKey) {
    throw new Error("R2 parameters are not defined");
}

export const s3Client = new S3Client({
    region: "auto", //Cloudflare R2 automatically manages region scopes internally
    endpoint: r2Endpoint,
    credentials: {
        accessKeyId: r2AccessKey || "",
        secretAccessKey: r2SecretKey || "",
    },
    forcePathStyle: true, //Mandatory configuration parameter required by Cloudflare R2 layer
});
