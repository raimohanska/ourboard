// @ts-ignore
import { BP2D } from "binpackingjs"
const { Bin, Box, Packer, heuristics } = BP2D
import { Board, Container, Item } from "../../../common/src/domain"
import { Rect } from "../../../common/src/geometry"
import { ITEM_MARGIN } from "./item-organizer"

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

export function packItems(targetRect: Rect, items: Item[], binarySearch = PACK_BINARY_SEARCH_DEFAULT): PackItemsResult {
    const availableWidth = targetRect.width
    const availableHeight = targetRect.height

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
            const width = widthMultiplier(it) * it.width + ITEM_MARGIN
            const height = multipleOfAverageHeight(it) * avgHeight * scale + ITEM_MARGIN
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
                width: rect.width - ITEM_MARGIN,
                height: rect.height - ITEM_MARGIN,
                x: targetRect.x + rect.x,
                y: targetRect.y + rect.y,
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
        return packItems(targetRect, items, newBinaryParams)
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
