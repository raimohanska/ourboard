import * as uuid from "uuid";
import * as L from "lonna";
import { AppEvent, AssetPutUrlResponse, Image as BoardImage, UpdateItem } from "../../../common/domain";
import { BoardStore } from "./board-store";
import md5 from "md5"

export type AssetId = string
export type AssetURL = string

export function assetStore(socket: typeof io.Socket, store: BoardStore) {
    let dataURLs: Record<AssetId, AssetURL> = {}


    function uploadAsset(file: File): Promise<[AssetId, Promise<AssetURL>]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.addEventListener("loadend", async x => {
                if (typeof reader.result !== "string") {
                    throw Error("Unexpected result type " + reader.result)
                }
                const dataURL = reader.result
                const assetId = md5(dataURL) 
                dataURLs[assetId] = dataURL
                
                resolve([assetId, (async () => {
                    const exists = await assetExists(assetId)
                    const url = assetURL(assetId)
                    if (exists) {
                        return url
                    }
                    socket.send("app-event", { action: "asset.put.request", assetId })
                    const signedUrl = await getAssetPutResponse(assetId, store.events)

                    const response = await fetch(signedUrl, {
                        method: "PUT",
                        body: file,
                    })
                    if (response.ok) {                                
                        return url                               
                    } else {
                        console.error("Asset PUT failed", response)
                        throw Error("Asset PUT failed with " + response.status)
                    }
                })()]) 
            })
            reader.addEventListener("error", x => {
                console.error("File import fail" + x)
                reject(x)
            })    
        })
    }

    function getAsset(assetId: string, src?: string): AssetURL {
        if (src) return src
        const local = dataURLs[assetId]
        if (local) return local
        return `/assets/${assetId}` // TODO: some Progress Indicator
    }

    return {
        getAsset,
        uploadAsset
    }
}

function getAssetPutResponse(assetId: string, events: L.EventStream<AppEvent>): Promise<AssetURL> {
    return new Promise((resolve, reject) => {
        events.pipe(L.filter((e: AppEvent) => e.action == "asset.put.response"), L.take(1))
                    .forEach(async e => { // TODO: filter with type narrowing in Lonna would be super nice
                        const signedUrl = (e as AssetPutUrlResponse).signedUrl
                        resolve(signedUrl)
                    })
    })
}

export type AssetStore = ReturnType<typeof assetStore>

function assetExists(assetId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)        
        img.src = assetURL(assetId)
    })
}

function assetURL(assetId: string) {
    // TODO: hardcoded URL
    return `https://r-board-assets.s3.eu-north-1.amazonaws.com/${assetId}`
}