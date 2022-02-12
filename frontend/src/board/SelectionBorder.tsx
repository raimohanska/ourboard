import { h } from "harmaja"
import * as L from "lonna"
import { BoardCoordinateHelper } from "./board-coordinates"
import { Board, Container } from "../../../common/src/domain"
import { BoardFocus } from "./board-focus"
import { onBoardItemDrag } from "./item-drag"
import { Dispatch } from "../store/board-store"

type Horizontal = "left" | "right"
type Vertical = "top" | "bottom"
const borderOffset = 0.25

export const SelectionBorder = ({
    id,
    board,
    coordinateHelper,
    focus,
    dispatch,
}: {
    id: string
    coordinateHelper: BoardCoordinateHelper
    focus: L.Atom<BoardFocus>
    board: L.Property<Board>
    dispatch: Dispatch
}) => {
    const item = L.view(board, (b) => b.items[id])
    const style = L.view(item, (i) => {
        return {
            top: -borderOffset + "rem",
            left: -borderOffset + "rem",
            height: `calc(${i.height}em + 2 * ${borderOffset}rem)`,
            width: `calc(${i.width}em + 2 * ${borderOffset}rem)`,
            transform: `translate(${i.x}em, ${i.y}em)`,
        }
    })

    return (
        <span className="selection-control" style={style}>
            <span className="corner-resize-drag top left"></span>
            <DragCorner {...{ horizontal: "left", vertical: "top" }} />
            <DragCorner {...{ horizontal: "left", vertical: "bottom" }} />
            <DragCorner {...{ horizontal: "right", vertical: "top" }} />
            <DragCorner {...{ horizontal: "right", vertical: "bottom" }} />
        </span>
    )

    function DragCorner({ vertical, horizontal }: { vertical: Vertical; horizontal: Horizontal }) {
        const ref = (e: HTMLElement) =>
            onBoardItemDrag(
                e,
                id,
                board,
                focus,
                coordinateHelper,
                false,
                (b, startPos, items, connections, xDiff, yDiff) => {
                    const updatedItems = items.map(({ current, dragStartPosition }) => {
                        const maintainAspectRatio =
                            current.type === "image" || (current.type === "note" && current.shape !== "rect")
                        if (maintainAspectRatio) {
                            let minDiff = Math.min(Math.abs(xDiff), Math.abs(yDiff))
                            if (minDiff < 0.1) {
                                xDiff = 0
                                yDiff = 0
                            } else {
                                const aspectRatio = dragStartPosition.width / dragStartPosition.height
                                const invert =
                                    (horizontal == "left" && vertical == "bottom") ||
                                    (horizontal == "right" && vertical == "top")
                                const factor = invert ? -1 : 1

                                if (Math.abs(xDiff) == minDiff) {
                                    // x is the smaller adjustment, use that as basis
                                    yDiff = (minDiff / aspectRatio) * factor * sign(xDiff)
                                } else {
                                    xDiff = minDiff * aspectRatio * factor * sign(yDiff)
                                }
                            }
                        }

                        const x = horizontal === "left" ? dragStartPosition.x + xDiff : dragStartPosition.x
                        const y = vertical === "top" ? dragStartPosition.y + yDiff : dragStartPosition.y
                        const width = Math.max(
                            0.5,
                            horizontal === "left" ? dragStartPosition.width - xDiff : dragStartPosition.width + xDiff,
                        )

                        const height = Math.max(
                            0.5,
                            vertical === "top" ? dragStartPosition.height - yDiff : dragStartPosition.height + yDiff,
                        )
                        const updatedItem = {
                            ...current,
                            x,
                            y,
                            width,
                            height,
                        }
                        return updatedItem
                    })

                    dispatch({ action: "item.update", boardId: b.id, items: updatedItems })

                    function sign(x: number) {
                        return x / Math.abs(x)
                    }
                },
            )

        return <span ref={ref} draggable={true} className={`corner-resize-drag ${horizontal} ${vertical}`} />
    }
}
