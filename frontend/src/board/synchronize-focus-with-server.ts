import * as L from "lonna"
import * as _ from "lodash"
import { Board, Id, ItemLocks } from "../../../common/src/domain"
import { Dispatch } from "../store/board-store"
import { BoardFocus, getSelectedIds, removeFromSelection, removeNonExistingFromSelection } from "./board-focus"

/*
  Centralized module to handle locking/unlocking items, i.e. disallow operating on
  items on the board when someone else is already doing so.

  Server should have authoritative answer to who is currently holding the lock to a
  particular item, so if someone else is holding it, stop editing/dragging/selecting
  that particular item.

  Dispatch lock/unlock requests to server as selection changes: items not selected
  anymore should be unlocked, and new selected items should be locked.

  item.lock and item.unlock events can be tycitteld freely because the server decides
  whether to allow the action or not.
*/
export function synchronizeFocusWithServer(
    board: L.Property<Board>,
    locks: L.Property<ItemLocks>,
    userId: L.Property<string | null>,
    dispatch: Dispatch,
): L.Atom<BoardFocus> {
    // represents the raw user selection, including possible illegal selections
    const rawFocus = L.atom<BoardFocus>({ status: "none" })

    // selection where illegal (locked) items are removed
    const resolvedFocus = L.pipe(
        L.combine(
            locks,
            rawFocus,
            userId,
            board,
            (locks: ItemLocks, focus: BoardFocus, user: string | null, b: Board): BoardFocus => {
                if (!user) return { status: "none" }
                const itemsWhereSomeoneElseHasLock = new Set(
                    Object.keys(locks).filter((itemId) => locks[itemId] !== user),
                )

                return removeNonExistingFromSelection(
                    removeFromSelection(focus, itemsWhereSomeoneElseHasLock),
                    new Set(b.items.map((i) => i.id)),
                )
            },
        ),
        L.skipDuplicates<BoardFocus>(_.isEqual, L.globalScope),
    )

    resolvedFocus.forEach(dispatchLocksIfNecessary)

    // Result atom that allows setting arbitrary focus, but reflects valid selections only
    return L.atom(resolvedFocus, rawFocus.set)

    function dispatchLocksIfNecessary(f: BoardFocus) {
        const user = userId.get()
        if (!user) return
        const l = locks.get()
        const locksHeld = Object.keys(l).filter((itemId) => l[itemId] === user)
        const selectedIds = getSelectedIds(f)
        locksHeld.filter((id) => !selectedIds.has(id)).forEach(unlock)
        ;[...selectedIds].filter((id) => !locksHeld.includes(id)).forEach(lock)
    }

    function lock(itemId: Id) {
        dispatch({ action: "item.lock", boardId: board.get().id, itemId })
    }
    function unlock(itemId: Id) {
        dispatch({ action: "item.unlock", boardId: board.get().id, itemId })
    }
}
