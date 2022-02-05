import * as L from "lonna"
import {
    Board,
    Connection,
    Item,
    Point,
    isContainedBy,
    Id,
    isItem,
    ConnectionEndPoint,
    getItem,
} from "../../../common/src/domain"
import { BoardCoordinateHelper } from "./board-coordinates"
import { Dispatch } from "../store/board-store"
import * as uuid from "uuid"
import { containedBy, findNearestAttachmentLocationForConnectionNode } from "./geometry"
import _ from "lodash"
import { ToolController } from "./tool-selection"
import { BoardFocus } from "./board-focus"
import { globalScope } from "lonna"

export const DND_GHOST_HIDING_IMAGE = new Image()
// https://png-pixel.com/
DND_GHOST_HIDING_IMAGE.src =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

let currentConnectionHandler = L.atom<ConnectionHandler | null>(null)

export function startConnecting(
    board: L.Property<Board>,
    coordinateHelper: BoardCoordinateHelper,
    dispatch: Dispatch,
    toolController: ToolController,
    focus: L.Atom<BoardFocus>,
    item: Item,
) {
    const h = currentConnectionHandler.get()
    if (h) {
        endConnection()
    } else {
        const h = drawConnectionHandler(board, coordinateHelper, focus, dispatch)
        currentConnectionHandler.set(h)
        focus.set({ status: "connection-adding" })
        h.whileDragging(item, coordinateHelper.currentBoardCoordinates.get())
        const toWatch = [currentConnectionHandler, toolController.tool, focus] as L.Property<any>[]
        const stop = L.merge(toWatch.map((p) => p.pipe(L.changes))).pipe(L.take(1, globalScope))
        coordinateHelper.currentBoardCoordinates.pipe(L.takeUntil(stop)).forEach((pos) => {
            h.whileDragging(item, pos)
        })
        stop.forEach(endConnection)
    }

    function endConnection() {
        const h = currentConnectionHandler.get()
        if (h) {
            h.endDrag()
            toolController.useDefaultTool()
            currentConnectionHandler.set(null)
        }
    }
}

type ConnectionHandler = ReturnType<typeof drawConnectionHandler>

export function drawConnectionHandler(
    board: L.Property<Board>,
    coordinateHelper: BoardCoordinateHelper,
    focus: L.Atom<BoardFocus>,
    dispatch: Dispatch,
) {
    let localConnection: Connection | null = null

    function whileDragging(item: Item, currentBoardCoords: Point) {
        const b = board.get()
        const boardId = b.id

        const targetExistingItem = findTarget(b.items, item, currentBoardCoords)

        if (targetExistingItem === item) {
            if (localConnection !== null) {
                // Remove current connection, because connect-to-self is not allowed at least for now
                dispatch({ action: "connection.delete", boardId, connectionId: localConnection.id })
                localConnection = null
            }
        } else {
            if (localConnection === null) {
                // Start new connection
                localConnection = newConnection(item)
                dispatch({ action: "connection.add", boardId, connection: localConnection })
            } else {
                // Change current connection endpoint
                const destinationPoint = targetExistingItem ?? currentBoardCoords
                const midpoint = findMidpoint(item, destinationPoint, b)

                // console.log({ item, midpoint, to: targetExistingItem ?? currentPos })

                localConnection = {
                    ...localConnection,
                    controlPoints: [midpoint],
                    to: targetExistingItem ? targetExistingItem.id : currentBoardCoords,
                }

                dispatch({ action: "connection.modify", boardId: b.id, connection: localConnection })
            }
        }
    }

    function newConnection(from: Item): Connection {
        return {
            id: uuid.v4(),
            from: from.id,
            controlPoints: [],
            to: coordinateHelper.currentBoardCoordinates.get(),
        }
    }

    const endDrag = () => {
        focus.set(localConnection ? { status: "connection-selected", id: localConnection.id } : { status: "none" })
        localConnection = null
    }

    return {
        endDrag,
        whileDragging,
        getCurrentConnection: () => localConnection,
    }
}

export function existingConnectionHandler(
    endNode: Element,
    connectionId: string,
    type: "from" | "to" | "control",
    coordinateHelper: BoardCoordinateHelper,
    board: L.Property<Board>,
    dispatch: Dispatch,
) {
    endNode.addEventListener("drag", (e) => e.stopPropagation())
    endNode.addEventListener(
        "drag",
        _.throttle(() => {
            const b = board.get()
            const connection = b.connections.find((c) => c.id === connectionId)!
            const items = b.items
            const coords = coordinateHelper.currentBoardCoordinates.get()
            if (type === "to") {
                const hitsItem = findTarget(items, connection.from, coords)
                const to = hitsItem && hitsItem.id !== connection.from ? hitsItem.id : coords
                dispatch({
                    action: "connection.modify",
                    boardId: b.id,
                    connection: { ...connection, to, controlPoints: [findMidpoint(connection.from, to, b)] },
                })
            } else if (type === "from") {
                const hitsItem = findTarget(items, connection.to, coords)
                const from = hitsItem && hitsItem.id !== connection.to ? hitsItem.id : coords
                dispatch({
                    action: "connection.modify",
                    boardId: b.id,
                    connection: { ...connection, from, controlPoints: [findMidpoint(connection.to, from, b)] },
                })
            } else {
                dispatch({
                    action: "connection.modify",
                    boardId: b.id,
                    connection: { ...connection, controlPoints: [coords] },
                })
            }
        }, 20),
    )
}

function findTarget(items: Record<Id, Item>, from: Item | Id | Point, currentPos: Point) {
    const fromItem = typeof from === "string" ? items[from] : isItem(from) ? from : null

    return Object.values(items)
        .filter((i) => containedBy({ ...currentPos, width: 0, height: 0 }, i)) // match coordinates
        .sort((a, b) => (isContainedBy(items, a)(b) ? 1 : -1)) // most innermost first (containers last)
        .find((i) => !fromItem || !isContainedBy(items, i)(fromItem)) // does not contain the "from" item
}

function resolveEndpoint(e: Point | Item | ConnectionEndPoint, b: Board): Point | Item {
    if (typeof e === "string") {
        return getItem(b)(e)
    }
    return e
}

function findMidpoint(from: Point | Item | ConnectionEndPoint, to: Point | Item | ConnectionEndPoint, b: Board) {
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
