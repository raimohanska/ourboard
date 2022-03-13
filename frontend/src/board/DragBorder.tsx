import { h, Fragment } from "harmaja"
import * as L from "lonna"
import { Board, Connection } from "../../../common/src/domain"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus } from "./board-focus"
import { Dispatch } from "../store/board-store"
import { itemDragToMove } from "./item-dragmove"
import { Tool, ToolController } from "./tool-selection"

type Position = "left" | "right" | "top" | "bottom"

export const DragBorder = ({
    id,
    board,
    coordinateHelper,
    latestConnection,
    focus,
    toolController,
    dispatch,
}: {
    id: string
    coordinateHelper: BoardCoordinateHelper
    latestConnection: L.Property<Connection | null>
    focus: L.Atom<BoardFocus>
    board: L.Property<Board>
    toolController: ToolController
    dispatch: Dispatch
}) => {
    return (
        <>
            <DragHandle {...{ position: "left" }} />
            <DragHandle {...{ position: "right" }} />
            <DragHandle {...{ position: "top" }} />
            <DragHandle {...{ position: "bottom" }} />
        </>
    )

    function DragHandle({ position }: { position: Position }) {
        const ref = (e: HTMLElement) =>
            itemDragToMove(id, board, focus, toolController, coordinateHelper, latestConnection, dispatch, false)(e)

        return <span ref={ref} draggable={true} className={`edge-drag ${position}`} />
    }
}
