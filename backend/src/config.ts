import path from "path"
import fs from "fs"

export type StorageBackend = Readonly<{ type: "LOCAL"; directory: string } | { type: "AWS" }>
export type Config = Readonly<{ storageBackend: StorageBackend }>

export const getConfig = (): { storageBackend: StorageBackend } => {
    const storageBackend: StorageBackend = process.env.AWS_ASSETS_BUCKET_URL
        ? { type: "AWS" }
        : { type: "LOCAL", directory: path.resolve("localfiles") }

    if (storageBackend.type === "LOCAL") {
        try {
            fs.mkdirSync(storageBackend.directory)
        } catch (e) {}
    }

    return {
        storageBackend,
    }
}
