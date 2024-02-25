import * as L from "lonna"
import { Board } from "../../../common/src/domain"
import { emptySet } from "../../../common/src/sets"
import { Dispatch } from "../store/board-store"
import { BoardFocus } from "./board-focus"
import { augmentWithCRDT, findSelectedItemsAndConnections, makeCopies } from "./item-cut-copy-paste"
import { controlKey, installKeyboardShortcut } from "./keyboard-shortcuts"
import { CRDTStore } from "../store/crdt-store"

export function itemDuplicateHandler(
    board: L.Property<Board>,
    crdtStore: CRDTStore,
    dispatch: Dispatch,
    focus: L.Atom<BoardFocus>,
) {
    installKeyboardShortcut(controlKey("d"), () => {
        dispatchDuplication(focus, board.get(), dispatch, crdtStore)
    })
}

export function dispatchDuplication(
    focus: L.Atom<BoardFocus>,
    currentBoard: Board,
    dispatch: Dispatch,
    crdtStore: CRDTStore,
) {
    const itemsAndConnections = augmentWithCRDT(
        currentBoard.id,
        findSelectedItemsAndConnections(focus.get(), currentBoard),
        crdtStore,
    )
    const { toCreate, toSelect, connections } = makeCopies(itemsAndConnections, 1, 1)
    dispatch({ action: "item.add", boardId: currentBoard.id, items: toCreate, connections })
    focus.set({ status: "selected", itemIds: new Set(toSelect.map((it) => it.id)), connectionIds: emptySet() })
}
