
export type Coordinates = { x: number, y: number }
export type Rect = { x: number, y: number, width: number, height: number }

export function add(a: Coordinates, b: Coordinates) {
    return { x: a.x + b.x, y: a.y + b.y }
}

export function multiply(a: Coordinates, factor: number) {
    return { x: a.x * factor, y: a.y * factor }
}

export function overlaps(a: Rect, b: Rect) {
    if (b.x > a.x + a.width) return false
    if (b.x + b.width < a.x) return false
    if (b.y > a.y + a.height) return false
    if (b.y + b.height < a.y) return false
    return true
}

export function containedBy(a: Rect, b: Rect) {
    if (a.x < b.x) return false
    if (a.x + a.width > b.x + b.width) return false
    if (a.y < b.y) return false
    if (a.y + a.height > b.y + b.height) return false
    return true
}

export function rectFromPoints(a: Coordinates, b: Coordinates) {
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)

    const width = Math.abs(a.x - b.x)
    const height = Math.abs(a.y - b.y)

    return {x, y, width, height }    
}