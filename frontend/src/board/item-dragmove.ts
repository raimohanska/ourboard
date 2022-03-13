import * as L from "lonna"
import { BoardCoordinateHelper } from "./board-coordinates"
import { Board, BOARD_ITEM_BORDER_MARGIN, Connection, isItemEndPoint, Item, Point } from "../../../common/src/domain"
import { BoardFocus } from "./board-focus"
import { onBoardItemDrag } from "./item-drag"
import { maybeChangeContainerForItem } from "./item-setcontainer"
import { Dispatch } from "../store/board-store"
import { newConnectionCreator, isConnectionAttachmentPoint } from "./item-connect"
import { Tool, ToolController } from "./tool-selection"
import { connectionRect } from "../../../common/src/connection-utils"

export function itemDragToMove(
    id: string,
    board: L.Property<Board>,
    focus: L.Atom<BoardFocus>,
    toolController: ToolController,
    coordinateHelper: BoardCoordinateHelper,
    latestConnection: L.Property<Connection | null>,
    dispatch: Dispatch,
    onlyWhenSelected: boolean,
) {
    const connector = newConnectionCreator(board, focus, latestConnection, dispatch)
    return (elem: HTMLElement) =>
        onBoardItemDrag(
            elem,
            id,
            board,
            focus,
            coordinateHelper,
            onlyWhenSelected,
            (b, startPos, items, connections, xDiff, yDiff) => {
                // Cant drag when connect tool is active
                const t = toolController.tool.get()

                // While dragging
                const f = focus.get()
                if (f.status !== "dragging") throw Error("Assertion fail")

                // TODO: disable multiple selection in connect mode

                if (t === "connect") {
                    const { current, dragStartPosition } = items[0]
                    const from = isConnectionAttachmentPoint(startPos, current) ? current : startPos
                    connector.whileDragging(from, coordinateHelper.currentBoardCoordinates.get())
                } else {
                    const margin = BOARD_ITEM_BORDER_MARGIN
                    const movedItems = items.map(({ dragStartPosition, current }) => {
                        const x = Math.min(
                            Math.max(dragStartPosition.x + xDiff, margin),
                            b.width - current.width - margin,
                        )
                        const y = Math.min(
                            Math.max(dragStartPosition.y + yDiff, margin),
                            b.height - current.height - margin,
                        )
                        const container = maybeChangeContainerForItem(current, b.items)
                        return { id: current.id, x, y, containerId: container ? container.id : undefined }
                    })

                    const movedConnections = connections.flatMap(({ dragStartPosition, current }) => {
                        if (
                            isItemEndPoint(current.from) ||
                            isItemEndPoint(current.to) ||
                            isItemEndPoint(dragStartPosition.from) ||
                            isItemEndPoint(dragStartPosition.to)
                        )
                            return []
                        const currentRect = connectionRect(b)(current)
                        const x = Math.min(
                            Math.max(dragStartPosition.from.x + xDiff, margin),
                            b.width - currentRect.width - margin,
                        )
                        const y = Math.min(
                            Math.max(dragStartPosition.from.y + yDiff, margin),
                            b.height - currentRect.height - margin,
                        )
                        return { id: current.id, x, y }
                    })

                    dispatch({ action: "item.move", boardId: b.id, items: movedItems, connections: movedConnections })
                }
            },
            () => {
                connector.endDrag()
                toolController.useDefaultTool()
            },
        )
}
