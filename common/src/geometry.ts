import { Point } from "./domain"
export const origin = { x: 0, y: 0 }
export type Coordinates = { x: number; y: number }
export type Dimensions = { width: number; height: number }
export type Rect = { x: number; y: number; width: number; height: number }
export const ZERO_RECT = { x: 0, y: 0, height: 0, width: 0 }
export function add(a: Coordinates, b: Coordinates) {
    return { x: a.x + b.x, y: a.y + b.y }
}

export function subtract(a: Coordinates, b: Coordinates) {
    return { x: a.x - b.x, y: a.y - b.y }
}

export function negate(a: Coordinates) {
    return { x: -a.x, y: -a.y }
}

export function multiply(a: Coordinates, factor: number) {
    return { x: a.x * factor, y: a.y * factor }
}

export function overlaps(a: Rect, b: Rect) {
    if (b.x >= a.x + a.width) return false
    if (b.x + b.width <= a.x) return false
    if (b.y >= a.y + a.height) return false
    if (b.y + b.height <= a.y) return false
    return true
}

export function equalRect(a: Rect, b: Rect) {
    return a.x == b.x && a.y == b.y && a.width == b.width && a.height == b.height
}

export function distance(a: Coordinates, b: Coordinates) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

export function containedBy(a: Point, b: Rect): boolean
export function containedBy(a: Rect, b: Rect): boolean
export function containedBy(a: Rect | Point, b: Rect) {
    if ("width" in a) {
        return a.x > b.x && a.y > b.y && a.x + a.width < b.x + b.width && a.y + a.height < b.y + b.height
    } else {
        return a.x > b.x && a.y > b.y && a.x < b.x + b.width && a.y < b.y + b.height
    }
}

export function rectFromPoints(a: Coordinates, b: Coordinates) {
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)

    const width = Math.abs(a.x - b.x)
    const height = Math.abs(a.y - b.y)

    return { x, y, width, height }
}

export function isRect(i: Point | Rect): i is Rect {
    return "width" in i
}

export function centerPoint(i: Point | Rect) {
    if (isRect(i)) {
        return {
            x: i.x + i.width / 2,
            y: i.y + i.height / 2,
        }
    }
    return i
}
