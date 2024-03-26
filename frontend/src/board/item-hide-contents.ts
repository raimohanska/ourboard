import { Board, isContainer, Item, Note } from "../../../common/src/domain"
import { Dispatch } from "../store/board-store"
import { BoardFocus, getSelectedItems } from "./board-focus"
import { getIfSame } from "./contextmenu/textAlignments"
import * as L from "lonna"
import { installKeyboardShortcut, plainKey } from "./keyboard-shortcuts"

export function itemHideContentsHandler(board: L.Property<Board>, focus: L.Property<BoardFocus>, dispatch: Dispatch) {
    installKeyboardShortcut(plainKey("h"), () =>
        toggleContentsHidden(getSelectedItems(board.get())(focus.get()), board.get(), dispatch),
    )
}

export function hasContentHidden(items: Item[]) {
    return getIfSame(items, (item) => (isContainer(item) && item.contentsHidden) ?? false, false)
}

export function toggleContentsHidden(items: Item[], board: Board, dispatch: Dispatch) {
    const hidden = hasContentHidden(items)

    dispatch({
        action: "item.update",
        boardId: board.id,
        items: findContainers(items, board).map((c) => ({
            id: c.id,
            contentsHidden: !hidden,
        })),
    })
}

function findContainers(items: Item[], board: Board): Item[] {
    const containers = items.filter(isContainer)
    const leftOverItems = items.filter((i) => !isContainer(i) && !containers.some((c) => c.id === i.containerId))
    const containersForLeftOverItems = leftOverItems
        .map((i) => board.items[i.containerId ?? ""])
        .filter((i) => i && !containers.some((c) => c.id === i.id))
    return [...containers, ...containersForLeftOverItems]
}
