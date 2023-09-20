import path from "path"
import fs from "fs"
import { googleConfig } from "./google-auth"

export type StorageBackend = Readonly<
    { type: "LOCAL"; directory: string; assetStorageURL: string } | { type: "AWS"; assetStorageURL: string }
>
export type Config = Readonly<{ storageBackend: StorageBackend; authSupported: boolean }>

export const getConfig = (): Config => {
    const storageBackend: StorageBackend = process.env.AWS_ASSETS_BUCKET_URL
        ? { type: "AWS", assetStorageURL: process.env.AWS_ASSETS_BUCKET_URL }
        : { type: "LOCAL", directory: path.resolve("localfiles"), assetStorageURL: "/assets" }

    if (storageBackend.type === "LOCAL") {
        try {
            fs.mkdirSync(storageBackend.directory)
        } catch (e) {}
    }

    return {
        storageBackend,
        authSupported: googleConfig !== null,
    }
}
