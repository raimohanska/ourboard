import path from "path"
import fs from "fs"

export type StorageBackend = "LOCAL" | "AWS"

const LOCAL_FILES_DIR = path.resolve("localfiles")
const STORAGE_BACKEND: StorageBackend = process.env.STORAGE_BACKEND === "local" ? "LOCAL" : "AWS"

if (STORAGE_BACKEND === "LOCAL") {
    try {
        fs.mkdirSync(LOCAL_FILES_DIR)
    } catch (e) {}
}

export default {
    STORAGE_BACKEND,
    LOCAL_FILES_DIR
}