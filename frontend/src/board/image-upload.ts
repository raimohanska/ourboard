import { Item, newImage } from "../../../common/domain"
import { AssetStore } from "./asset-store"
import { BoardCoordinateHelper } from "./board-coordinates"

export function imageUploadHandler(boardElement: HTMLElement, assets: AssetStore, coordinateHelper: BoardCoordinateHelper, onAdd: (item: Item) => void) {
    function preventDefaults(e: any) {
        e.preventDefault()
        e.stopPropagation()
    }
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        boardElement.addEventListener(eventName, preventDefaults, false)
    })

    boardElement.addEventListener('drop', handleDrop, false)

    async function handleDrop(e: DragEvent) {
        let dt = e.dataTransfer
        let files = dt!.files
        if (files.length === 0) {
            return
        }
        if (files.length != 1) {
            throw Error("Unexpected number of files: " + files.length)
        }
        const file = files[0]
        const assetId = await assets.uploadAsset(file)
        console.log("Asset id", assetId)
        const url = assets.getAsset(assetId)
        console.log("Asset URL", url)
        const {x, y} = coordinateHelper.currentBoardCoordinates.get()
        onAdd(newImage(assetId, x, y))
    }
}