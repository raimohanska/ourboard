// @ts-ignore
import { BP2D } from "binpackingjs"
const { Bin, Box, Packer, heuristics } = BP2D
import { Board, Container, Item } from "../../../common/src/domain"

type PackItemsResult =
    | {
          ok: true
          packedItems: Item[]
      }
    | {
          ok: false
          error: string
      }

const PACK_BINARY_SEARCH_DEFAULT: {
    max: number
    min: number
    multiplier: number
    attempt: number
    maxAttempts: number
    prev: (Item[] | null)[]
} = {
    max: 1,
    min: 0,
    multiplier: 0.5,
    attempt: 1,
    maxAttempts: 20,
    prev: [],
}

// This function is run recursively 'maxAttempts' times to find a good fit
export function packItems(cont: Container, board: Board, binarySearch = PACK_BINARY_SEARCH_DEFAULT): PackItemsResult {
    const is = board.items
    const values = Object.values(is)
    // Packing containers-in-containers not supported yet, and resizing text seems to cause overflow issues
    const items = values.filter((v) => v.containerId === cont.id && v.type !== "text" && v.type !== "container")

    const { width, height } = cont
    const borderTop = (cont.fontSize ?? 1) * 2
    const otherBorders = 1
    const borderBottom = otherBorders
    const borderLeft = otherBorders
    const borderRight = otherBorders
    const PADDING = 0.3

    const availableWidth = width - borderLeft - borderRight
    const availableHeight = height - borderTop - borderBottom

    const b = new Bin(availableWidth, availableHeight, new heuristics.BottomLeft())
    const p = new Packer([b])
    const avgHeight = items.reduce((acc, i) => i.height + acc, 0) / items.length

    const availableArea = availableWidth * availableHeight * binarySearch.multiplier

    function totalArea(its: { width: number; height: number }[]) {
        return its.reduce((acc, it) => it.width * it.height + acc, 0)
    }

    function scaleItems(its: { width: number; height: number }[], scale: number) {
        const multipleOfAverageHeight = (it: { width: number; height: number }) => Math.round(it.height / avgHeight)
        const widthMultiplier = (it: { width: number; height: number }) =>
            (multipleOfAverageHeight(it) * avgHeight * scale) / it.height

        const boxes = its.map((it) => {
            const width = widthMultiplier(it) * it.width + PADDING * 2
            const height = multipleOfAverageHeight(it) * avgHeight * scale + PADDING * 2
            const box = new Box(width, height, true)
            box.data = { ...it, width, height }
            return box
        })
        return boxes
    }

    let scale = 1
    let maxScale = 1
    let minScale = 0
    let itemsToPack = scaleItems(items, scale)

    if (totalArea(itemsToPack) > availableArea) {
        // binary search for a while to find a good fit
        for (let i = 0; i < 100; i++) {
            scale = minScale + (maxScale - minScale) / 2
            itemsToPack = scaleItems(items, scale)
            if (totalArea(itemsToPack) > availableArea) {
                maxScale = scale
            } else {
                minScale = scale
            }
        }
    }

    const packedBoxes = p.pack(itemsToPack)

    let newItems: Item[] | null = null
    // The maxrects algorithm was designed for packing sprites into 'n' bind,
    // we only want there to be one bin that contains all of our items
    if (items.length === packedBoxes.length) {
        newItems = items.map((it) => {
            const rect = packedBoxes.find((p: any) => p.data.id === it.id)!
            return {
                ...it,
                width: rect.width - PADDING * 2,
                height: rect.height - PADDING * 2,
                x: borderLeft + cont.x + rect.x,
                y: borderTop + cont.y + rect.y,
            }
        })
    }

    const failed = newItems === null

    if (binarySearch.attempt <= binarySearch.maxAttempts) {
        const max = failed ? binarySearch.multiplier : binarySearch.max
        const min = failed ? binarySearch.min : binarySearch.multiplier
        const multiplier = min + (max - min) / 2
        const newBinaryParams = {
            max,
            min,
            multiplier,
            attempt: binarySearch.attempt + 1,
            maxAttempts: binarySearch.maxAttempts,
            prev: [newItems, ...binarySearch.prev],
        }
        return packItems(cont, board, newBinaryParams)
    }

    const finalItems = [newItems, ...binarySearch.prev].find((candidate) => candidate !== null)

    return !finalItems
        ? {
              ok: false,
              error: "no fit",
          }
        : {
              ok: true,
              packedItems: finalItems,
          }
}
