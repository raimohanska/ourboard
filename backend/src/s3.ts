import * as AWS from "aws-sdk";

const s3Config = {
    region: "eu-north-1",
    apiVersion: "2006-03-01",
    signatureVersion: 'v4'
}

export const s3 = new AWS.S3(s3Config);

export function getSignedPutUrl(Key: string) {
    const signedUrlExpireSeconds = 60 * 5

    const url = s3.getSignedUrl('putObject', {
        Bucket: "r-board-assets",
        Key,
        Expires: signedUrlExpireSeconds
    })

    return url
}