import * as L from "lonna"
import { Board, Connection, Item, Point, isContainedBy, Id, isItem } from "../../../common/src/domain"
import { BoardCoordinateHelper } from "./board-coordinates"
import { Dispatch } from "../store/server-connection"
import * as uuid from "uuid"
import { containedBy, findNearestAttachmentLocationForConnectionNode } from "./geometry"
import _ from "lodash"

export const DND_GHOST_HIDING_IMAGE = new Image()
// https://png-pixel.com/
DND_GHOST_HIDING_IMAGE.src =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

export function drawConnectionHandler(
    board: L.Property<Board>,
    coordinateHelper: BoardCoordinateHelper,
    dispatch: Dispatch,
) {
    let localConnection: Connection | null = null

    function whileDragging(item: Item, currentPos: Point) {
        const b = board.get()
        const boardId = b.id

        const targetExistingItem = findTarget(b.items, item, currentPos)

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
                const destinationPoint = targetExistingItem ?? currentPos

                const midpointFromReference = findNearestAttachmentLocationForConnectionNode(item, destinationPoint)
                const midpointToReference = findNearestAttachmentLocationForConnectionNode(destinationPoint, item)
                const midpoint = {
                    x: (midpointFromReference.point.x + midpointToReference.point.x) * 0.5,
                    y: (midpointFromReference.point.y + midpointToReference.point.y) * 0.5,
                }

                // console.log({ item, midpoint, to: targetExistingItem ?? currentPos })

                localConnection = {
                    ...localConnection,
                    controlPoints: [midpoint],
                    to: targetExistingItem ? targetExistingItem.id : currentPos,
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
        localConnection = null
    }

    return {
        endDrag,
        whileDragging,
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
    endNode.addEventListener("drag", (e) => {
        e.stopPropagation()
        const b = board.get()
        const connection = b.connections.find((c) => c.id === connectionId)!
        const items = b.items
        const coords = coordinateHelper.currentBoardCoordinates.get()
        if (type === "to") {
            const hitsItem = findTarget(items, connection.from, coords)
            const to = hitsItem && hitsItem.id !== connection.from ? hitsItem.id : coords
            dispatch({ action: "connection.modify", boardId: b.id, connection: { ...connection, to } })
        } else if (type === "from") {
            const hitsItem = findTarget(items, connection.to, coords)
            const from = hitsItem && hitsItem.id !== connection.to ? hitsItem.id : coords
            dispatch({ action: "connection.modify", boardId: b.id, connection: { ...connection, from } })
        } else {
            dispatch({
                action: "connection.modify",
                boardId: b.id,
                connection: { ...connection, controlPoints: [coords] },
            })
        }
    })
}

function findTarget(items: Record<Id, Item>, from: Item | Id | Point, currentPos: Point) {
    const fromItem = typeof from === "string" ? items[from] : isItem(from) ? from : null

    return Object.values(items)
        .filter((i) => containedBy({ ...currentPos, width: 0, height: 0 }, i)) // match coordinates
        .sort((a, b) => (isContainedBy(items, a)(b) ? 1 : -1)) // most innermost first (containers last)
        .find((i) => !fromItem || !isContainedBy(items, i)(fromItem)) // does not contain the "from" item
}
