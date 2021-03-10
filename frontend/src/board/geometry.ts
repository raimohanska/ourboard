export type Coordinates = { x: number; y: number }
export type Dimensions = { width: number; height: number }
export type Rect = { x: number; y: number; width: number; height: number }

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
    if (b.x > a.x + a.width) return false
    if (b.x + b.width < a.x) return false
    if (b.y > a.y + a.height) return false
    if (b.y + b.height < a.y) return false
    return true
}

export function containedBy(a: Rect, b: Rect) {
    return a.x > b.x && a.y > b.y && a.x + a.width < b.x + b.width && a.y + a.height < b.y + b.height
}

export function rectFromPoints(a: Coordinates, b: Coordinates) {
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)

    const width = Math.abs(a.x - b.x)
    const height = Math.abs(a.y - b.y)

    return { x, y, width, height }
}

export function quadraticCurveSVGPath(a: Coordinates, b: Coordinates) {
    const p1x = a.x
    const p1y = a.y
    const p2x = b.x
    const p2y = b.y

    // mid-point of line:
    var mpx = (p2x + p1x) * 0.5
    var mpy = (p2y + p1y) * 0.5

    // angle of perpendicular to line:
    var theta = Math.atan2(p2y - p1y, p2x - p1x) - Math.PI / 2

    // distance of control point from mid-point of line:
    var offset = 30

    // location of control point:
    var c1x = mpx + offset * Math.cos(theta)
    var c1y = mpy + offset * Math.sin(theta)

    // construct the command to draw a quadratic curve
    return "M" + p1x + " " + p1y + " Q " + c1x + " " + c1y + " " + p2x + " " + p2y
}
