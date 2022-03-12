import * as _ from "lodash"
import { maybeChangeContainerForConnection } from "../../frontend/src/board/item-setcontainer"
import {
    AttachmentLocation,
    AttachmentSide,
    Board,
    Connection,
    ConnectionEndPoint,
    ConnectionEndPointToItem,
    getEndPointItemId,
    getItem,
    isItem,
    isItemEndPoint,
    Item,
    ItemAttachmentLocation,
    Point,
} from "./domain"
import { centerPoint, containedBy, Rect, subtract } from "./geometry"
import { getAngleDeg, Vector2 } from "./vector2"

export function resolveEndpoint(e: Point | Item | ConnectionEndPoint, b: Board | Record<string, Item>): Point | Item {
    if (isItemEndPoint(e)) {
        return resolveItemEndpoint(e, b)
    }
    return e
}

export function resolveItemEndpoint(e: ConnectionEndPointToItem, b: Board | Record<string, Item>): Item {
    return getItem(b)(getEndPointItemId(e))
}

export function findNearestAttachmentLocationForConnectionNode(
    i: Point | Item,
    reference: Point | Item,
): AttachmentLocation {
    if (!isItem(i)) return { side: "none", point: i }
    const options: ItemAttachmentLocation[] = findItemAttachmentLocations(i)
    const from = centerPoint(reference)
    return withStraightestAngle(options, from)!
}

function angleDiff(option: ItemAttachmentLocation, from: Point) {
    const directionFromEndPoint: Vector2 = subtract(from, option.point)
    const endpointDirection = getEndPointDirection(option.side)
    const diff = Math.abs(getAngleDeg(directionFromEndPoint) - getAngleDeg(endpointDirection))
    if (diff > 180) return 360 - diff
    return diff
}

function withStraightestAngle(options: ItemAttachmentLocation[], to: Point) {
    return _.minBy(options, (p) => angleDiff(p, to))
}

function getEndPointDirection(side: AttachmentSide): Vector2 {
    switch (side) {
        case "top":
            return Vector2(0, -1)
        case "right":
            return Vector2(1, 0)
        case "bottom":
            return Vector2(0, 1)
        case "left":
            return Vector2(-1, 0)
    }
}

const sides: AttachmentSide[] = ["top", "left", "bottom", "right"]

function findItemAttachmentLocations(i: Item): ItemAttachmentLocation[] {
    return sides.map((side) => findAttachmentLocation(i, side))
}

function p(x: number, y: number) {
    return { x, y }
}

export function findAttachmentLocation(i: Item, side: AttachmentSide): ItemAttachmentLocation {
    const margin = 0.1
    switch (side) {
        case "top":
            return { item: i, side, point: p(i.x + i.width / 2, i.y - margin) }
        case "left":
            return { item: i, side, point: p(i.x - margin, i.y + i.height / 2) }
        case "right":
            return { item: i, side, point: p(i.x + i.width + margin, i.y + i.height / 2) }
        case "bottom":
            return { item: i, side, point: p(i.x + i.width / 2, i.y + i.height + margin) }
    }
}

function findMidpoint(fromCoords: AttachmentLocation, toCoords: AttachmentLocation) {
    const midpoint = {
        x: mid(fromCoords.point.x, toCoords.point.x),
        y: mid(fromCoords.point.y, toCoords.point.y),
    }
    if (toCoords.side === "left" || toCoords.side === "right") {
        return {
            x: midpoint.x,
            y: mid(midpoint.y, toCoords.point.y),
        }
    }
    if (toCoords.side === "top" || toCoords.side === "bottom") {
        return {
            x: mid(midpoint.x, toCoords.point.x),
            y: midpoint.y,
        }
    }
    if (fromCoords.side === "left" || fromCoords.side === "right") {
        return {
            x: midpoint.x,
            y: mid(midpoint.y, fromCoords.point.y),
        }
    }
    if (fromCoords.side === "top" || fromCoords.side === "bottom") {
        return {
            x: mid(midpoint.x, fromCoords.point.x),
            y: midpoint.y,
        }
    }
    return midpoint
}

function attachmentLocation2EndPoint(l: AttachmentLocation): ConnectionEndPoint {
    if (l.side === "none") {
        return l.point
    }
    return { side: l.side, id: l.item.id }
}

export function rerouteConnection(c: Connection, b: Board): Connection {
    const resolvedFrom = resolveEndpoint(c.from, b)
    const resolvedTo = resolveEndpoint(c.to, b)

    let to = findNearestAttachmentLocationForConnectionNode(resolvedTo, resolvedFrom)
    const from = findNearestAttachmentLocationForConnectionNode(resolvedFrom, to.point)
    to = findNearestAttachmentLocationForConnectionNode(resolvedTo, from.point)

    const rerouted: Connection = {
        ...c,
        from: attachmentLocation2EndPoint(from),
        to: attachmentLocation2EndPoint(to),
        controlPoints: c.controlPoints.length ? [findMidpoint(from, to)] : [],
    }

    const container = maybeChangeContainerForConnection(rerouted, b.items)

    return { ...rerouted, containerId: container ? container.id : undefined }
}

function rerouteEndPoint(e: ConnectionEndPoint, from: ConnectionEndPoint, b: Board) {
    return attachmentLocation2EndPoint(
        findNearestAttachmentLocationForConnectionNode(resolveEndpoint(e, b), resolveEndpoint(from, b)),
    )
}

export function rerouteByNewControlPoints(c: Connection, controlPoints: Point[], b: Board): Connection {
    const first = controlPoints[0]

    return {
        ...c,
        from: rerouteEndPoint(c.from, controlPoints[0] || c.to, b),
        to: rerouteEndPoint(c.to, controlPoints[controlPoints.length - 1] || c.from, b),
        controlPoints,
    }
}

function mid(x: number, y: number) {
    return (x + y) * 0.5
}

export const connectionRect = (b: Board | Record<string, Item>) => (c: Connection): Rect => {
    const start = resolveEndpoint(c.from, b)
    const end = resolveEndpoint(c.to, b)
    const allPoints = [start, ...c.controlPoints, end]
    const minX = _.min(allPoints.map((p) => p.x))!
    const maxX = _.max(allPoints.map((p) => p.x))!
    const minY = _.min(allPoints.map((p) => p.y))!
    const maxY = _.max(allPoints.map((p) => p.y))!
    const x = minX
    if (isNaN(x)) {
        throw Error("Assertion fail")
    }
    const y = minY
    const width = maxX - minX
    const height = maxY - minY
    return { x, y, width, height }
}

export function isFullyContainedConnection(connection: Connection, item: Item, context: Record<string, Item> | Board) {
    const start = resolveEndpoint(connection.from, context)
    const end = resolveEndpoint(connection.to, context)
    return !isItem(start) && !isItem(end) && containedBy(start, item) && containedBy(end, item)
}
