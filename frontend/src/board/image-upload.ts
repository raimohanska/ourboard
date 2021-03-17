import { Item, newImage, newVideo } from "../../../common/src/domain"
import { AssetStore, AssetURL } from "../store/asset-store"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus } from "./board-focus"
import * as L from "lonna"
import { Dimensions } from "./geometry"

export function imageUploadHandler(
    boardElement: HTMLElement,
    assets: AssetStore,
    coordinateHelper: BoardCoordinateHelper,
    focus: L.Atom<BoardFocus>,
    onAdd: (item: Item) => void,
    onURL: (id: string, url: AssetURL) => void,
) {
    function preventDefaults(e: any) {
        e.preventDefault()
        e.stopPropagation()
    }
    ;["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        boardElement.addEventListener(eventName, preventDefaults, false)
    })

    boardElement.addEventListener("drop", handleDrop, false)

    const pasteHandler = (e: ClipboardEvent) => {
        if (e.clipboardData) {
            const imageFile = [...e.clipboardData.files].find((file) => file.type.startsWith("image/"))
            imageFile && uploadImageFile(imageFile)
        }
    }

    document.addEventListener("paste", pasteHandler)

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

    async function uploadImageFile(file: File) {
        const info = await videoOrImageInfo(file)
        const [assetId, urlPromise] = await assets.uploadAsset(file)
        if (!info) {
            console.log("File is not an image or a video")
        } else if (info.type === "image") {
            const { width, height } = info
            const maxWidth = 10
            const w = Math.min(width, maxWidth)
            const h = (height * w) / width
            const { x, y } = coordinateHelper.currentBoardCoordinates.get()
            const image = newImage(assetId, x, y, w, h)
            onAdd(image)
            const finalUrl = await urlPromise
            onURL(assetId, finalUrl)
        } else {
            const w = 20 // Just some initial dimensions in em, user can resize
            const h = 12
            const { x, y } = coordinateHelper.currentBoardCoordinates.get()
            const video = newVideo(assetId, x, y, w, h)
            onAdd(video)
            const finalUrl = await urlPromise
            onURL(assetId, finalUrl)
        }
    }

    return () => {
        document.removeEventListener("paste", pasteHandler)
    }
}

async function videoOrImageInfo(file: File): Promise<ImageOrVideoInfo> {
    return (await imageDimensions(file)) || (await videoInfo(file))
}

type ImageInfo = { type: "image"; width: number; height: number }
type VideoInfo = { type: "video" }
type ImageOrVideoInfo = ImageInfo | VideoInfo | null

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

async function videoInfo(file: File): Promise<VideoInfo | null> {
    console.log("Assuming it's a video TODO", file.type)
    if (file.type.startsWith("video/")) {
        return { type: "video" }
    }
    return null
}
