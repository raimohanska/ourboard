import {
    Board,
    ConnectionEndPoint,
    getItem,
    Item,
    Point,
    isItem,
    Connection,
    AttachmentLocation,
    getEndPointItemId,
    isItemEndPoint,
    AttachmentSide,
    ConnectionEndPointToItem,
    ItemAttachmentLocation,
} from "./domain"
import { distance } from "./geometry"
import * as _ from "lodash"

export function resolveEndpoint(e: Point | Item | ConnectionEndPoint, b: Board | Record<string, Item>): Point | Item {
    if (isItemEndPoint(e)) {
        return resolveItemEndpoint(e, b)
    }
    return e
}

export function resolveItemEndpoint(e: ConnectionEndPointToItem, b: Board | Record<string, Item>): Item {
    return getItem(b)(getEndPointItemId(e))
}

export function findNearestAttachmentLocationForConnectionNode(i: Point | Item, reference: Point | Item): AttachmentLocation {
    if (!isItem(i)) return { side: "none", point: i }
    const options: ItemAttachmentLocation[] = Object.entries(findAttachmentLocations(i)).map(([side, point]) => ({
        side: side as AttachmentSide,
        point,
        item: i,
    }))
    return _.minBy(options, (p) => distance(p.point, middlePoint(reference)))!
}

function middlePoint(i: Point | Item) {
    if (isItem(i)) {
        return {
            x: i.x + i.width / 2,
            y: i.y + i.height / 2
        }
    }
    return i
}

function findAttachmentLocations(i: Item): Record<AttachmentSide, Point> {
    const margin = 0.1
    function p(x: number, y: number) {
        return { x, y }
    }
    const options = {
        top: p(i.x + i.width / 2, i.y - margin),
        left: p(i.x - margin, i.y + i.height / 2),
        right: p(i.x + i.width + margin, i.y + i.height / 2),
        bottom: p(i.x + i.width / 2, i.y + i.height + margin),
    }
    return options
}

export function findAttachmentLocation(i: Item, side: AttachmentSide): ItemAttachmentLocation {
    return { side, point: findAttachmentLocations(i)[side], item: i }
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

    const from = findNearestAttachmentLocationForConnectionNode(resolvedFrom, resolvedTo)
    const to = findNearestAttachmentLocationForConnectionNode(resolvedTo, from.point)

    const withNewMidPoint = {
        ...c,
        from: attachmentLocation2EndPoint(from),
        to: attachmentLocation2EndPoint(to),
        controlPoints: [findMidpoint(from, to)],
    }
    return withNewMidPoint
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
