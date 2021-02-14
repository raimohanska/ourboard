import { getSignedPutUrl as s3GetSignedPutUrl } from "./s3"
import * as config from "./config"

function localFSGetSignedPutUrl(Key: string): string {
    return "/assets/" + Key
}

export const getSignedPutUrl: (key: string) => string =
    config.STORAGE_BACKEND.type === "AWS" ? s3GetSignedPutUrl : localFSGetSignedPutUrl
