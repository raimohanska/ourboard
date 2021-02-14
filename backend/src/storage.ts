import { getSignedPutUrl as s3GetSignedPutUrl } from "./s3"
import { StorageBackend } from "./config"

function localFSGetSignedPutUrl(Key: string): string {
    return "/assets/" + Key
}

export const createGetSignedPutUrl = (storageBackend: StorageBackend): ((key: string) => string) =>
    storageBackend.type === "AWS" ? s3GetSignedPutUrl : localFSGetSignedPutUrl
