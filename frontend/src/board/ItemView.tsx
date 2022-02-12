import { h } from "harmaja"
import * as L from "lonna"
import {
    AccessLevel,
    Board,
    BoardHistoryEntry,
    canWrite,
    getItemBackground,
    getItemIds,
    getItemShape,
    Id,
    Item,
    ItemType,
    TextItem,
} from "../../../common/src/domain"
import { HTMLEditableSpan } from "../components/HTMLEditableSpan"
import { Dispatch } from "../store/board-store"
import { autoFontSize } from "./autoFontSize"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus, getSelectedItemIds } from "./board-focus"
import { contrastingColor } from "./contrasting-color"
import { DragBorder } from "./DragBorder"
import { itemDragToMove } from "./item-dragmove"
import { itemSelectionHandler } from "./item-selection"
import { ToolController } from "./tool-selection"
import { itemZIndex } from "./zIndices"

export const ItemView = ({
    board,
    accessLevel,
    history,
    id,
    type,
    item,
    isLocked,
    focus,
    coordinateHelper,
    dispatch,
    toolController,
}: {
    board: L.Property<Board>
    accessLevel: L.Property<AccessLevel>
    history: L.Property<BoardHistoryEntry[]>
    id: string
    type: ItemType
    item: L.Property<Item>
    isLocked: L.Property<boolean>
    focus: L.Atom<BoardFocus>
    coordinateHelper: BoardCoordinateHelper
    dispatch: Dispatch
    toolController: ToolController
}) => {
    const itemHistory = findItemHistory(history.get(), id) // Purposefully fixing to the first snapshot of history instead of reacting to changes. Would be a performance disaster most likely.
    const element = L.atom<HTMLElement | null>(null)

    const ref = (el: HTMLElement) => {
        itemDragToMove(id, board, focus, toolController, coordinateHelper, dispatch, type === "container")(el)
        element.set(el)
    }

    const { itemFocus, selected, onClick } = itemSelectionHandler(
        id,
        type,
        focus,
        toolController,
        board,
        coordinateHelper,
        dispatch,
    )

    const dataTest = L.combineTemplate({
        text: L.view(item, (i) => (i.type === "note" || i.type === "text" ? i.text : "")),
        type: L.view(item, "type"),
        selected,
    }).pipe(
        L.map(({ text, selected, type }: { text: string; selected: boolean; type: ItemType }) => {
            const textSuffix = text ? "-" + text : ""
            return selected ? `${type}-selected${textSuffix}` : `${type}${textSuffix}`
        }),
    )

    function itemPadding(i: Item) {
        const shape = getItemShape(i)
        return shape == "diamond" ? `${i.width / 4}em` : shape == "round" ? `${i.width / 8}em` : undefined
    }
    const shape = L.view(item, getItemShape)

    return (
        <span
            ref={ref}
            data-test={dataTest}
            data-itemid={id}
            draggable={L.view(itemFocus, (f) => f !== "editing")}
            onClick={onClick}
            className={L.view(
                selected,
                L.view(item, getItemBackground),
                (s, b) => `${type} ${"color-" + b.replace("#", "").toLowerCase()} ${s ? "selected" : ""}`,
            )}
            style={L.view(item, (i) => {
                return {
                    top: 0,
                    left: 0,
                    height: i.height + "em",
                    width: i.width + "em",
                    transform: `translate(${i.x}em, ${i.y}em)`,
                    zIndex: itemZIndex(i),
                    position: "absolute",
                    padding: itemPadding(i),
                }
            })}
        >
            {type !== "text" && (
                <span
                    className={L.view(shape, (s) => "shape " + s)}
                    style={L.view(item, (i) => {
                        return {
                            background: getItemBackground(i),
                        }
                    })}
                />
            )}

            {(type === "note" || type === "text" || type === "container") && (
                <TextView item={item as L.Property<TextItem>} />
            )}
            {L.view(isLocked, (l) => l && <span className="lock">🔒</span>)}

            {type === "container" && (
                <DragBorder {...{ id, board, toolController, coordinateHelper, focus, dispatch }} />
            )}
        </span>
    )

    function TextView({ item }: { item: L.Property<TextItem> }) {
        const textAtom = L.atom(L.view(item, "text"), (text) =>
            dispatch({ action: "item.update", boardId: board.get().id, items: [{ ...item.get(), text }] }),
        )
        const showCoords = false
        const focused = L.view(focus, (f) => getSelectedItemIds(f).has(id))

        const setEditing = (e: boolean) => {
            dispatch({ action: "item.front", boardId: board.get().id, itemIds: [id] })
            focus.set(e ? { status: "editing", id } : { status: "selected", ids: new Set([id]) })
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
}

function findItemHistory(history: BoardHistoryEntry[], id: Id): BoardHistoryEntry[] {
    return history.filter((e) => getItemIds(e).includes(id))
}
