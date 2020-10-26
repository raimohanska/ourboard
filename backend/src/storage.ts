import { getSignedPutUrl as s3GetSignedPutUrl } from "./s3"
import config from "./config"

function localFSGetSignedPutUrl(Key: string): string {
    return "/images/" + Key + ".file"
}

export const getSignedPutUrl = config.STORAGE_BACKEND === "AWS" ? s3GetSignedPutUrl : localFSGetSignedPutUrl