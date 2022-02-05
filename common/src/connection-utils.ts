import { findNearestAttachmentLocationForConnectionNode } from "../../frontend/src/board/geometry"
import { Board, ConnectionEndPoint, getItem, Item, Point } from "./domain"

function resolveEndpoint(e: Point | Item | ConnectionEndPoint, b: Board): Point | Item {
    if (typeof e === "string") {
        return getItem(b)(e)
    }
    return e
}

export function findMidpoint(from: Point | Item | ConnectionEndPoint, to: Point | Item | ConnectionEndPoint, b: Board) {
    const fromCoords = findNearestAttachmentLocationForConnectionNode(resolveEndpoint(from, b), resolveEndpoint(to, b))
    const toCoords = findNearestAttachmentLocationForConnectionNode(resolveEndpoint(to, b), resolveEndpoint(from, b))
    const midpoint = {
        x: mid(fromCoords.point.x, toCoords.point.x),
        y: mid(fromCoords.point.y, toCoords.point.y),
    }
    if (toCoords.side === "left" || toCoords.side === "right")
        return {
            x: midpoint.x,
            y: mid(midpoint.y, toCoords.point.y),
        }
    if (toCoords.side === "top" || toCoords.side === "bottom")
        return {
            x: mid(midpoint.x, toCoords.point.x),
            y: midpoint.y,
        }
    if (fromCoords.side === "left" || fromCoords.side === "right")
        return {
            x: midpoint.x,
            y: mid(midpoint.y, fromCoords.point.y),
        }
    if (fromCoords.side === "top" || fromCoords.side === "bottom")
        return {
            x: mid(midpoint.x, fromCoords.point.x),
            y: midpoint.y,
        }
    return midpoint
}

function mid(x: number, y: number) {
    return (x + y) * 0.5
}
