import * as uuid from "uuid";
import * as L from "lonna";
import { AppEvent, AssetPutUrlResponse, Image, UpdateItem } from "../../../common/domain";
import { BoardStore } from "./board-store";

export type AssetId = string
export type AssetURL = string

export function assetStore(socket: typeof io.Socket, store: BoardStore) {
    // TODO: detect duplicate assets somehow (checksums?)
    const localKey = (id: AssetId) => `asset-${id}`


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
                socket.send("app-event", { action: "asset.put.request", assetId })
                store.events.pipe(L.filter((e: AppEvent) => e.action == "asset.put.response"), L.take(1))
                    .forEach(async e => { // TODO: filter with type narrowing in Lonna would be super nice
                        const signedUrl = (e as AssetPutUrlResponse).signedUrl
                        console.log("Got signed url", signedUrl)
                        const response = await fetch(signedUrl, {
                            method: "PUT",
                            body: file,
                        })
                        if (response.ok) {
                            const board = store.state.get().board!
                            const image = board.items.find(i => i.type === "image" && i.assetId === assetId) as Image
                            if (!image) {
                                throw Error("Image with assetId " + assetId + " not on board")
                            }
                            const imageURL = signedUrl.split("?")[0]
                            store.dispatch({ action: "item.update", boardId: board.id, item: { ...image, src: imageURL }  })
                        } else {
                            console.error("Asset PUT failed", response)
                            throw Error("Asset PUT failed with " + response.status)
                        }
                        delete localStorage[localKey(assetId)]
                    })
                resolve(assetId)    
            })
            reader.addEventListener("error", x => {
                console.error("File import fail" + x)
                reject(x)
            })    
        })
    }

    function getAsset(assetId: string, src?: string): AssetURL {
        if (src) return src
        const local = localStorage[localKey(assetId)] as string
        if (local) return local
        return `/assets/${assetId}`
    }

    return {
        uploadAsset,
        getAsset
    }
}
export type AssetStore = ReturnType<typeof assetStore>