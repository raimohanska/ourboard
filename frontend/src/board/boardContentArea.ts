import _ from "lodash"
import { Board } from "../../../common/src/domain"
import { Rect } from "../../../common/src/geometry"

function combineRects(r1: Rect, r2: Rect): Rect {
    const left = Math.min(r1.x, r2.x)
    const top = Math.min(r1.y, r2.y)
    const right = Math.max(r1.x + r1.width, r2.x + r2.width)
    const bottom = Math.max(r1.y + r1.height, r2.y + r2.height)
    return { x: left, y: top, width: right - left, height: bottom - top }
}

function itemToRect(item: Rect): Rect {
    return { x: item.x, y: item.y, width: item.width, height: item.height }
}

function addMargin(rect: Rect, margin: number): Rect {
    return {
        x: rect.x - margin,
        y: rect.y - margin,
        width: rect.width + 2 * margin,
        height: rect.height + 2 * margin,
    }
}

function setMinimumSizeKeepingCenter(rect: Rect, minimumSize: { width: number; height: number }) {
    const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    const width = Math.max(rect.width, minimumSize.width)
    const height = Math.max(rect.height, minimumSize.height)
    return {
        x: center.x - width / 2,
        y: center.y - height / 2,
        width,
        height,
    }
}

function clampIntoKeepingSize(rect: Rect, bounds: Rect) {
    const minLeft = bounds.x
    const minTop = bounds.y
    const maxLeft = bounds.x + bounds.width - rect.width
    const maxTop = bounds.y + bounds.height - rect.height
    const x = _.clamp(rect.x, minLeft, maxLeft)
    const y = _.clamp(rect.y, minTop, maxTop)
    return { x, y, width: rect.width, height: rect.height }
}

export function boardContentArea(b: Board) {
    // Default / minimum size for initial view
    const width = b.width / 10
    const height = b.height / 10

    const items = Object.values(b.items)

    if (!items.length) {
        console.log("No items in board, centering view")
        return addMargin({ x: b.width / 2 - width / 2, y: b.height / 2 - height / 2, width, height }, height * 0.1)
    }
    console.log(`${items.length} items on board, calculating view area`)
    let itemsArea = itemToRect(items[0])
    items.forEach((item) => {
        itemsArea = combineRects(itemsArea, itemToRect(item))
    })

    // Now we have the area of all items, let's add some margin
    itemsArea = addMargin(itemsArea, width * 0.2)

    // Grow to at least the default size keeping center point
    itemsArea = setMinimumSizeKeepingCenter(itemsArea, { width, height })

    // Clamp to board limits
    itemsArea = clampIntoKeepingSize(itemsArea, { x: 0, y: 0, width: b.width, height: b.height })
    return itemsArea
}
