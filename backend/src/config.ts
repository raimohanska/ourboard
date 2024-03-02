import path from "path"
import fs from "fs"
import { authProvider } from "./oauth"
import * as t from "io-ts"
import { optional } from "../../common/src/domain"
import { decodeOrThrow } from "./decodeOrThrow"

export type StorageBackend = Readonly<
    { type: "LOCAL"; directory: string; assetStorageURL: string } | { type: "AWS"; assetStorageURL: string }
>
export type Config = Readonly<{ storageBackend: StorageBackend; authSupported: boolean; crdt: CrdtConfigString }>

const CrdtConfigString = t.union([
    t.literal("opt-in"),
    t.literal("opt-in-authenticated"),
    t.literal("true"),
    t.literal("false"),
])
export type CrdtConfigString = t.TypeOf<typeof CrdtConfigString>

export const getConfig = (): Config => {
    const storageBackend: StorageBackend = process.env.AWS_ASSETS_BUCKET_URL
        ? { type: "AWS", assetStorageURL: process.env.AWS_ASSETS_BUCKET_URL }
        : { type: "LOCAL", directory: path.resolve("localfiles"), assetStorageURL: "/assets" }

    if (storageBackend.type === "LOCAL") {
        try {
            fs.mkdirSync(storageBackend.directory)
        } catch (e) {}
    }

    const crdt = decodeOrThrow(CrdtConfigString, process.env.COLLABORATIVE_EDITING ?? "opt-in")

    return {
        storageBackend,
        authSupported: authProvider !== null,
        crdt,
    }
}
