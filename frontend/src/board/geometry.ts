import * as _ from "lodash"
import { AttachmentLocation, isItem, Item, Point } from "../../../common/src/domain"
// @ts-ignore
import { Bezier } from "bezier-js"

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

export function distance(a: Coordinates, b: Coordinates) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
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

export function quadraticCurveSVGPath(from: Coordinates, to: Coordinates, controlPoints: Coordinates[]) {
    if (!controlPoints || !controlPoints.length) {
        // fallback if no control points, just create a curve with a hardcoded offset
        const midpointX = (to.x + from.x) * 0.5
        const midpointY = (to.y + from.y) * 0.5

        // angle of perpendicular to line:
        const theta = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2

        // distance of control point from mid-point of line:
        const offset = 30

        // location of control point:
        const controlPoint = { x: midpointX + offset * Math.cos(theta), y: midpointY + offset * Math.sin(theta) }
        return "M" + from.x + " " + from.y + " Q " + controlPoint.x + " " + controlPoint.y + " " + to.x + " " + to.y
    } else {
        const peakPointOfCurve = controlPoints[0]
        const bez = Bezier.quadraticFromPoints(from, peakPointOfCurve, to)
        return bez
            .getLUT()
            .reduce(
                (acc: string, p: Point, i: number) =>
                    i === 0 ? (acc += `M ${p.x} ${p.y}`) : (acc += `L ${p.x} ${p.y}`),
                "",
            )
    }
}

export function findNearestAttachmentLocationForConnectionNode(i: Point | Item, reference: Point): AttachmentLocation {
    if (!isItem(i)) return { side: "none", point: i }
    function p(x: number, y: number) {
        return { x, y }
    }
    const options = [
        { side: "top" as const, point: p(i.x + i.width / 2, i.y) },
        { side: "left" as const, point: p(i.x, i.y + i.height / 2) },
        { side: "right" as const, point: p(i.x + i.width, i.y + i.height / 2) },
        { side: "bottom" as const, point: p(i.x + i.width / 2, i.y + i.height) },
    ]
    return _.minBy(options, (p) => distance(p.point, reference))!
}
