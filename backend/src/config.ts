import path from "path"
import fs from "fs"

export type StorageBackend = Readonly<{ type: "LOCAL"; directory: string } | { type: "AWS" }>

export const STORAGE_BACKEND: StorageBackend = process.env.AWS_ASSETS_BUCKET_URL
    ? { type: "AWS" }
    : { type: "LOCAL", directory: path.resolve("localfiles") }

if (STORAGE_BACKEND.type === "LOCAL") {
    try {
        fs.mkdirSync(STORAGE_BACKEND.directory)
    } catch (e) {}
}
