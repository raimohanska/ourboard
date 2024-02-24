import { h } from "harmaja"
import * as L from "lonna"
import { AccessLevel, Board, canWrite, getItemBackground, TextItem } from "../../../common/src/domain"
import { emptySet } from "../../../common/src/sets"
import { HTMLEditableSpan } from "../components/HTMLEditableSpan"
import { Dispatch } from "../store/board-store"
import { autoFontSize } from "./autoFontSize"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus, getSelectedItemIds } from "./board-focus"
import { contrastingColor } from "./contrasting-color"
import { ToolController } from "./tool-selection"

interface TextViewProps {
    id: string
    item: L.Property<TextItem>
    dispatch: Dispatch
    board: L.Property<Board>
    toolController: ToolController
    accessLevel: L.Property<AccessLevel>
    focus: L.Atom<BoardFocus>
    itemFocus: L.Property<"none" | "selected" | "dragging" | "editing">
    coordinateHelper: BoardCoordinateHelper
    element: L.Property<HTMLElement | null>
}

export function TextView({
    id,
    item,
    dispatch,
    board,
    toolController,
    focus,
    coordinateHelper,
    itemFocus,
    accessLevel,
    element,
}: TextViewProps) {
    const textAtom = L.atom(L.view(item, "text"), (text) =>
        dispatch({ action: "item.update", boardId: board.get().id, items: [{ id, text }] }),
    )
    const showCoords = false
    const focused = L.view(focus, (f) => getSelectedItemIds(f).has(id))

    const setEditing = (e: boolean) => {
        if (toolController.tool.get() === "connect") return // Don't switch to editing in middle of connecting
        dispatch({ action: "item.front", boardId: board.get().id, itemIds: [id] })
        focus.set(
            e
                ? { status: "editing", itemId: id }
                : { status: "selected", itemIds: new Set([id]), connectionIds: emptySet() },
        )
    }
    const color = L.view(item, getItemBackground, contrastingColor)
    const fontSize = autoFontSize(
        item,
        L.view(item, (i) => (i.fontSize ? i.fontSize : 1)),
        L.view(item, "text"),
        focused,
        coordinateHelper,
        element,
    )
    return (
        <span
            className="text"
            onDoubleClick={(e) => e.stopPropagation()}
            style={L.combineTemplate({ fontSize, color })}
        >
            <HTMLEditableSpan
                {...{
                    value: textAtom,
                    editingThis: L.atom(
                        L.view(itemFocus, (f) => f === "editing"),
                        setEditing,
                    ),
                    editable: L.view(accessLevel, canWrite),
                }}
            />
            {showCoords && <small>{L.view(item, (p) => Math.floor(p.x) + ", " + Math.floor(p.y))}</small>}
        </span>
    )
}
