import * as uuid from "uuid";

export type AssetId = string
export type AssetURL = string

export function assetStore(socket: typeof io.Socket) {
    function uploadAsset(file: File): Promise<AssetId> {
        return new Promise<AssetId>((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.addEventListener("loadend", x => {
                if (typeof reader.result !== "string") {
                    throw Error("Unexpected result type " + reader.result)
                }
                const assetId = uuid.v4()
                localStorage[localKey(assetId)] = reader.result

                // TODO: upload assert to server, send a notification event to others that this assetId is now available.

                resolve(assetId)    
            })
            reader.addEventListener("error", x => {
                console.error("File import fail" + x)
                reject(x)
            })    
        })
    }

    const localKey = (id: AssetId) => `asset-${id}`

    function getAsset(id: AssetId): AssetURL {
        const local = localStorage[localKey(id)] as string
        if (local) return local
        return `/assets/${id}`
    }

    return {
        uploadAsset,
        getAsset
    }
}
export type AssetStore = ReturnType<typeof assetStore>