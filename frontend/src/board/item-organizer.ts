import { Board, Container, Item } from "../../../common/src/domain"
import * as G from "../../../common/src/geometry"
import _ from "lodash"

const rowResolution = 1
export const ITEM_MARGIN = 1
export const CONTAINER_MARGIN = 1

// This function is run recursively 'maxAttempts' times to find a good fit
export function contentRect(cont: Container): G.Rect {
    const { width, height } = cont
    const borderTop = (cont.fontSize ?? CONTAINER_MARGIN) * 2
    const otherBorders = CONTAINER_MARGIN
    const borderBottom = otherBorders
    const borderLeft = otherBorders
    const borderRight = otherBorders
    return {
        x: cont.x + borderLeft,
        y: cont.y + borderTop,
        width: cont.width - borderLeft - borderRight,
        height: cont.height - borderTop - borderBottom,
    }
}

export function packableItems(cont: Container, board: Board): Item[] {
    const is = board.items
    const values = Object.values(is)
    // Packing containers-in-containers not supported yet, and resizing text seems to cause overflow issues
    const items = values.filter((v) => v.containerId === cont.id && v.type !== "text" && v.type !== "container")
    return items
}

export function organizeItems(itemsToPack: Item[], itemsToAvoid: Item[], rect: G.Rect): Item[] {
    if (itemsToPack.length === 0) return itemsToPack
    const results: Item[] = []
    let rowY = rect.y
    let colX = rect.x
    const rowNumber = (i: Item) => Math.floor((i.y * rect.width) / rowResolution)
    const colNumber = (i: Item) => i.x

    itemsToPack = _.orderBy(itemsToPack, [rowNumber, colNumber])
    for (let itemToPlace of itemsToPack) {
        let item: Item
        ;({ item, colX, rowY } = placeItem(itemToPlace, itemsToAvoid, rect, rowY, colX))
        itemsToAvoid = [...itemsToAvoid, item]
        if (item.x !== itemToPlace.x || item.y !== itemToPlace.y) {
            results.push(item)
        }
    }
    return results
}

export function placeItem(
    item: Item,
    itemsToAvoid: Item[],
    rect: G.Rect,
    rowY: number,
    colX: number,
): { item: Item; rowY: number; colX: number } {
    for (let i = 0; i < 1000000; i++) {
        let place = { x: colX, y: rowY, width: item.width, height: item.height }
        //console.log(place)
        const toAvoidWithMargin = itemsToAvoid.map((i) => marginRect(ITEM_MARGIN, i))
        let overlapping = toAvoidWithMargin.filter((r) => G.overlaps(place, r))
        if (overlapping.length === 0) {
            return { item: { ...item, ...place }, rowY, colX }
        } else {
            //console.log("Overlaps", overlapping)
            let nextX = _.max(overlapping.map((r) => r.x + r.width))!
            if (nextX + item.width <= rect.x + rect.width) {
                // try same row
                colX = nextX
            } else {
                colX = rect.x
                const rowArea = { x: rect.x, y: rowY, width: rect.width, height: place.height }
                const rowItemsWithMargin = toAvoidWithMargin.filter((i) => G.overlaps(i, rowArea))
                const maxY = _.max(rowItemsWithMargin.map((i) => i.y + i.height))!
                rowY = maxY
            }
        }
    }
    throw Error("Failed to pack")
}

function marginRect(margin: number, r: G.Rect): G.Rect {
    return { x: r.x - margin, y: r.y - margin, width: r.width + 2 * margin, height: r.height + 2 * margin }
}
