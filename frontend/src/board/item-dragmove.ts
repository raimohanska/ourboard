import * as L from "lonna"
import { BoardCoordinateHelper } from "./board-coordinates"
import { Board, BOARD_ITEM_BORDER_MARGIN, Connection, Item, Point } from "../../../common/src/domain"
import { BoardFocus } from "./board-focus"
import { onBoardItemDrag } from "./item-drag"
import { maybeChangeContainer } from "./item-setcontainer"
import { Dispatch } from "../store/server-connection"
import { drawConnectionHandler } from "./item-connect"
import { Tool, ToolController } from "./tool-selection"

export function itemDragToMove(
    id: string,
    board: L.Property<Board>,
    focus: L.Atom<BoardFocus>,
    toolController: ToolController,
    coordinateHelper: BoardCoordinateHelper,
    dispatch: Dispatch,
) {
    const connector = drawConnectionHandler(board, coordinateHelper, focus, dispatch)
    return (elem: HTMLElement) =>
        onBoardItemDrag(
            elem,
            id,
            board,
            focus,
            coordinateHelper,
            (b, items, xDiff, yDiff) => {
                // Cant drag when connect tool is active
                const t = toolController.tool.get()

                // While dragging
                const f = focus.get()
                if (f.status !== "dragging") throw Error("Assertion fail")

                // TODO: disable multiple selection in connect mode

                if (t === "connect") {
                    const { current, dragStartPosition } = items[0]
                    connector.whileDragging(current, coordinateHelper.currentBoardCoordinates.get())
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
                        const container = maybeChangeContainer(current, b.items)
                        return { id: current.id, x, y, containerId: container ? container.id : undefined }
                    })

                    dispatch({ action: "item.move", boardId: b.id, items: movedItems })
                }
            },
            () => {
                connector.endDrag()
                toolController.useDefaultTool()
            },
        )
}
