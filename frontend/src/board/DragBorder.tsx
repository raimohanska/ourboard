import { h, Fragment } from "harmaja"
import * as L from "lonna"
import { Board } from "../../../common/src/domain"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus } from "./board-focus"
import { Dispatch } from "../store/server-connection"
import { itemDragToMove } from "./item-dragmove"
import { Tool } from "./BoardView"

type Position = "left" | "right" | "top" | "bottom"

export const DragBorder = ({
    id,
    board,
    coordinateHelper,
    focus,
    tool,
    dispatch,
}: {
    id: string
    coordinateHelper: BoardCoordinateHelper
    focus: L.Atom<BoardFocus>
    board: L.Property<Board>
    tool: L.Atom<Tool>
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
        const ref = (e: HTMLElement) => itemDragToMove(id, board, focus, tool, coordinateHelper, dispatch)(e)

        return <span ref={ref} draggable={true} className={`edge-drag ${position}`} />
    }
}
