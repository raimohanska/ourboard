import { Item, newImage } from "../../../common/domain"
import { AssetStore, AssetURL } from "./asset-store"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus } from "./synchronize-focus-with-server"
import * as L from "lonna"

export function imageUploadHandler(boardElement: HTMLElement, assets: AssetStore, coordinateHelper: BoardCoordinateHelper, focus: L.Atom<BoardFocus>, onAdd: (item: Item) => void, onURL: (id: string, url: AssetURL) => void) {    
    function preventDefaults(e: any) {
        e.preventDefault()
        e.stopPropagation()
    }
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        boardElement.addEventListener(eventName, preventDefaults, false)
    })

    boardElement.addEventListener('drop', handleDrop, false)

    async function handleDrop(e: DragEvent) {
        if (focus.get().status === "dragging") {
            return // was dragging an item
        }
        const url = e.dataTransfer?.getData('URL')
        if (url) {
            const res = await assets.getExternalAssetAsBytes(url)
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
        const { width, height } = await imageDimensions(file)
        const [assetId, urlPromise] = await assets.uploadAsset(file)
        const maxWidth = 10
        const w = Math.min(width, maxWidth)
        const h = height * w / width
        const { x, y } = coordinateHelper.currentBoardCoordinates.get()
        const image = newImage(assetId, x, y, w, h)
        onAdd(image)
        const finalUrl = await urlPromise
        onURL(assetId, finalUrl)
    }
}

function imageDimensions(file: File): Promise<{ width: number, height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image()

        // the following handler will fire after the successful loading of the image
        img.onload = () => {
            const { naturalWidth: width, naturalHeight: height } = img
            resolve({ width, height })
        }

        // and this handler will fire if there was an error with the image (like if it's not really an image or a corrupted one)
        img.onerror = () => {
            reject('There was some problem with the image.')
        }

        img.src = URL.createObjectURL(file)
    })
}