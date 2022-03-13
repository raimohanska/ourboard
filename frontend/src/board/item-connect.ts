import _ from "lodash"
import * as L from "lonna"
import { globalScope } from "lonna"
import * as uuid from "uuid"
import { rerouteByNewControlPoints, rerouteConnection, resolveEndpoint } from "../../../common/src/connection-utils"
import {
    Board,
    Connection,
    ConnectionEndPoint,
    getEndPointItemId,
    Id,
    isContainedBy,
    isItem,
    isItemEndPoint,
    Item,
    Point,
} from "../../../common/src/domain"
import { Dispatch } from "../store/board-store"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus, noFocus } from "./board-focus"
import { centerPoint, containedBy } from "../../../common/src/geometry"
import { ToolController } from "./tool-selection"
import { emptySet } from "../../../common/src/sets"
import { IS_TOUCHSCREEN, onSingleTouch } from "./touchScreen"

export const DND_GHOST_HIDING_IMAGE = new Image()
// https://png-pixel.com/
DND_GHOST_HIDING_IMAGE.src =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

let currentConnectionHandler = L.atom<ConnectionHandler | null>(null)

export function startConnecting(
    board: L.Property<Board>,
    coordinateHelper: BoardCoordinateHelper,
    latestConnection: L.Property<Connection | null>,
    dispatch: Dispatch,
    toolController: ToolController,
    focus: L.Atom<BoardFocus>,
    from: Item | Point,
) {
    const h = currentConnectionHandler.get()
    if (h) {
        endConnection()
    } else {
        const h = newConnectionCreator(board, focus, latestConnection, dispatch)
        currentConnectionHandler.set(h)
        focus.set({ status: "connection-adding" })
        const toWatch = [currentConnectionHandler, toolController.tool, focus] as L.Property<any>[]
        const stop = L.merge(toWatch.map((p) => p.pipe(L.changes))).pipe(L.take(1, globalScope))

        h.whileDragging(from, coordinateHelper.currentBoardCoordinates.get())
        coordinateHelper.currentBoardCoordinates.pipe(L.takeUntil(stop)).forEach((pos) => {
            h.whileDragging(from, pos)
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

type ConnectionHandler = ReturnType<typeof newConnectionCreator>

export function newConnectionCreator(
    board: L.Property<Board>,
    focus: L.Atom<BoardFocus>,
    latestConnection: L.Property<Connection | null>,
    dispatch: Dispatch,
) {
    let localConnection: Connection | null = null

    function whileDragging(from: Item | Point, currentBoardCoords: Point) {
        const b = board.get()
        const boardId = b.id
        const startPoint: ConnectionEndPoint = isItem(from) ? from.id : from
        const item = isItem(from) ? from : null

        const targetExistingItem = findTarget(b, startPoint, currentBoardCoords, localConnection)

        if (targetExistingItem === item) {
            if (localConnection !== null) {
                // Remove current connection, because connect-to-self is not allowed at least for now
                if (!IS_TOUCHSCREEN)
                    dispatch({ action: "connection.delete", boardId, connectionIds: [localConnection.id] })
                localConnection = null
            }
        } else {
            if (localConnection === null) {
                // Start new connection
                localConnection = newConnection(startPoint)
                if (!IS_TOUCHSCREEN) dispatch({ action: "connection.add", boardId, connections: [localConnection] })
            } else {
                // Change current connection endpoint
                // console.log({ item, midpoint, to: targetExistingItem ?? currentPos })

                localConnection = rerouteConnection(
                    {
                        ...localConnection,
                        to: targetExistingItem ? targetExistingItem.id : currentBoardCoords,
                    },
                    b,
                )

                if (!IS_TOUCHSCREEN)
                    dispatch({ action: "connection.modify", boardId: b.id, connections: [localConnection] })
            }
        }

        function newConnection(from: ConnectionEndPoint): Connection {
            const l = latestConnection.get()
            return rerouteConnection(
                {
                    id: uuid.v4(),
                    from: from,
                    controlPoints: l && l.controlPoints.length === 0 ? [] : [{ x: 0, y: 0 }],
                    to: targetExistingItem ? targetExistingItem.id : currentBoardCoords,
                    fromStyle: (l && l.fromStyle) ?? "none",
                    toStyle: (l && l.toStyle) ?? "arrow",
                    pointStyle: (l && l.pointStyle) ?? "black-dot",
                },
                b,
            )
        }
    }

    const endDrag = () => {
        if (localConnection) {
            const addedConnection = localConnection
            localConnection = null
            if (IS_TOUCHSCREEN) {
                dispatch({ action: "connection.add", boardId: board.get().id, connections: [addedConnection] })
            }
            focus.set({ status: "selected", itemIds: emptySet(), connectionIds: new Set(addedConnection.id) })
        } else {
            focus.set(noFocus)
        }
    }

    return {
        endDrag,
        whileDragging,
        getCurrentConnection: () => localConnection,
    }
}

export function existingConnectionHandler(
    endNode: HTMLElement,
    connectionId: string,
    type: "from" | "to" | "control",
    coordinateHelper: BoardCoordinateHelper,
    board: L.Property<Board>,
    dispatch: Dispatch,
) {
    endNode.addEventListener("drag", (e) => e.stopPropagation())
    endNode.addEventListener(
        "drag",
        _.throttle((e: DragEvent) => {
            const preventAttach = e.shiftKey || e.altKey || e.ctrlKey || e.metaKey
            modifyConnection(preventAttach)
        }, 20) as any,
    )

    endNode.addEventListener("touchmove", (e: TouchEvent) => {
        onSingleTouch(e, (touch) => {
            e.preventDefault()
            e.stopPropagation()
            coordinateHelper.currentPageCoordinates.set({ x: touch.pageX, y: touch.pageY })
            modifyConnection(false)
        })
    })

    function modifyConnection(preventAttach: boolean) {
        const b = board.get()
        const connection = b.connections.find((c) => c.id === connectionId)!
        const coords = coordinateHelper.currentBoardCoordinates.get()
        if (type === "to") {
            const hitsItem = !preventAttach && findTarget(b, connection.from, coords, connection)
            const to = hitsItem && hitsItem.id !== connection.from ? hitsItem.id : coords
            dispatch({
                action: "connection.modify",
                boardId: b.id,
                connections: [rerouteConnection({ ...connection, to }, b)],
            })
        } else if (type === "from") {
            const hitsItem = !preventAttach && findTarget(b, connection.to, coords, connection)
            const from = hitsItem && hitsItem.id !== connection.to ? hitsItem.id : coords
            dispatch({
                action: "connection.modify",
                boardId: b.id,
                connections: [rerouteConnection({ ...connection, from }, b)],
            })
        } else {
            dispatch({
                action: "connection.modify",
                boardId: b.id,
                connections: [rerouteByNewControlPoints(connection, [coords], b)],
            })
        }
    }
}

function findTarget(
    b: Board,
    from: Item | ConnectionEndPoint,
    currentPos: Point,
    currentConnection: Connection | null,
) {
    const items = b.items
    const resolvedFromPoint = resolveEndpoint(from, items)
    const fromItem = isItem(resolvedFromPoint) ? resolvedFromPoint : null

    return Object.values(items)
        .filter((i) => containedBy({ ...currentPos, width: 0, height: 0 }, i)) // match coordinates
        .filter((i) => isConnectionAttachmentPoint(currentPos, i))
        .filter((i) =>
            isItem(resolvedFromPoint)
                ? !isConnected(b, i, resolvedFromPoint, currentConnection)
                : !containedBy(resolvedFromPoint, i),
        )
        .sort((a, b) => (isContainedBy(items, a)(b) ? 1 : -1)) // most innermost first (containers last)
        .find((i) => !fromItem || !isContainedBy(items, i)(fromItem)) // does not contain the "from" item
}

function isConnected(b: Board, x: Item, y: Item, connectionToIgnore: Connection | null) {
    return b.connections.some((c) => connectionToIgnore != c && isConnectionRelated(x, c) && isConnectionRelated(y, c))
}

function isConnectionRelated(i: Item, c: Connection) {
    return isEndPointRelated(i, c.from) || isEndPointRelated(i, c.to)
}

function isEndPointRelated(i: Item, c: ConnectionEndPoint) {
    return isItemEndPoint(c) && getEndPointItemId(c) === i.id
}

export function isConnectionAttachmentPoint(point: Point, item: Item) {
    if (item.type !== "container") return true
    const center = centerPoint(item)
    const factor = 0.9
    return (
        Math.abs(point.x - center.x) > (item.width / 2) * factor ||
        Math.abs(point.y - center.y) > (item.height / 2) * factor
    )
}
