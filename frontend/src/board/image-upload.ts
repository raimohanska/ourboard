import * as L from "lonna"
import { Item, newImage, newVideo } from "../../../common/src/domain"
import { AssetStore, AssetURL } from "../store/asset-store"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus } from "./board-focus"

export function imageDropHandler(
    boardElement: L.Atom<HTMLElement | null>,
    assets: AssetStore,
    focus: L.Atom<BoardFocus>,
    uploadImageFile: (file: File) => Promise<void>,
) {
    boardElement.forEach((el) => {
        if (el) {
            function preventDefaults(e: any) {
                e.preventDefault()
                e.stopPropagation()
            }
            ;["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
                el.addEventListener(eventName, preventDefaults, false)
            })

            el.addEventListener("drop", handleDrop, false)
            async function handleDrop(e: DragEvent) {
                if (focus.get().status === "dragging") {
                    return // was dragging an item
                }

                const url = e.dataTransfer?.getData("URL")
                if (url) {
                    // Try direct fetch first, and on CORS error fall back to letting the server request it
                    const res = await fetch(url).catch(() => assets.getExternalAssetAsBytes(url))
                    const blob = await res.blob()
                    await uploadImageFile(blob as any)
                } else {
                    let dt = e.dataTransfer
                    let files = dt!.files
                    if (files.length === 0) {
                        return
                    }
                    if (files.length != 1) {
                        throw Error("Unexpected number of files: " + files.length)
                    }
                    const file = files[0]
                    await uploadImageFile(file)
                }
            }
        }
    })
}

export type ImageUploadFunction = (file: File) => Promise<void>
export function imageUploadHandler(
    assets: AssetStore,
    coordinateHelper: BoardCoordinateHelper,
    onAdd: (item: Item) => void,
    onURL: (id: string, url: AssetURL) => void,
): ImageUploadFunction {
    return async (file: File): Promise<void> => {
        const info = await imageDimensions(file)
        if (!info) {
            console.log("File is not an image")
        } else if (info.type === "image") {
            const [assetId, urlPromise] = await assets.uploadAsset(file)
            const { width, height } = info
            const maxWidth = 10
            const w = Math.min(width, maxWidth)
            const h = (height * w) / width
            const { x, y } = coordinateHelper.currentBoardCoordinates.get()
            const image = newImage(assetId, x, y, w, h)
            onAdd(image)
            const finalUrl = await urlPromise
            onURL(assetId, finalUrl)
        }
    }
}

type ImageInfo = { type: "image"; width: number; height: number }

function imageDimensions(file: File): Promise<ImageInfo | null> {
    return new Promise((resolve, reject) => {
        const img = new Image()

        // the following handler will fire after the successful loading of the image
        img.onload = () => {
            const { naturalWidth: width, naturalHeight: height } = img
            resolve({ type: "image", width, height })
        }

        // and this handler will fire if there was an error with the image (like if it's not really an image or a corrupted one)
        img.onerror = () => {
            resolve(null)
        }

        img.src = URL.createObjectURL(file)
    })
}
