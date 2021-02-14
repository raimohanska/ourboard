import { getSignedPutUrl as s3GetSignedPutUrl } from "./s3"
import config from "./config"

function localFSGetSignedPutUrl(Key: string): string {
    return "/assets/" + Key
}

export const getSignedPutUrl: (key: string) => string =
    config.STORAGE_BACKEND === "AWS" ? s3GetSignedPutUrl : localFSGetSignedPutUrl
