import * as L from "lonna"
import * as _ from "lodash"
import { Board, Id, ItemLocks } from "../../../common/src/domain"
import { Dispatch } from "../store/server-connection"
import { BoardFocus, getSelectedIds, removeFromSelection, removeNonExistingFromSelection } from "./board-focus"
import { componentScope } from "harmaja"

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
    sessionId: L.Property<string | null>,
    dispatch: Dispatch,
): L.Atom<BoardFocus> {
    // TODO: not sure if good: item.lock is never dispatched. Instead locker.ts locks items based on
    // PersistableBoardItemEvents, i.e. relies on the client to send an item.front or similar on selection

    // represents the raw user selection, including possible illegal selections
    const focusRequest = L.bus<BoardFocus>()
    type CircumStances = { locks: ItemLocks; sessionId: string | null; board: Board }

    // Circumstances that limit the possible focused selection set
    const circumstances: L.Property<CircumStances> = L.combineTemplate({
        locks,
        sessionId,
        board,
    })

    // update focus on new request as well as change to circumstances
    const events = L.merge(focusRequest, circumstances.pipe(L.changes))

    // selection where illegal (locked) items are removed
    const resolvedFocus = events.pipe(
        L.scan({ status: "none" } as BoardFocus, (currentFocus, event) => {
            return narrowFocus("status" in event ? event : currentFocus, circumstances.get())
        }),
        L.skipDuplicates<BoardFocus>(_.isEqual, componentScope()),
    )

    function narrowFocus(focus: BoardFocus, { locks, sessionId: sessionId, board }: CircumStances): BoardFocus {
        if (!sessionId) return { status: "none" }

        // TODO consider selected connection in locking as well maybe
        if (focus.status === "connection-selected") {
            return removeNonExistingFromSelection(focus, new Set(board.connections.map((c) => c.id)))
        }

        const itemsWhereSomeoneElseHasLock = new Set(Object.keys(locks).filter((itemId) => locks[itemId] !== sessionId))

        return removeNonExistingFromSelection(
            removeFromSelection(focus, itemsWhereSomeoneElseHasLock),
            new Set(Object.keys(board.items)),
        )
    }

    resolvedFocus.forEach(unlockUnselectedItems)

    // Result atom that allows setting arbitrary focus, but reflects valid selections only
    return L.atom(resolvedFocus, focusRequest.push)

    function unlockUnselectedItems(f: BoardFocus) {
        const user = sessionId.get()
        if (!user) return
        const l = locks.get()
        const locksHeld = Object.keys(l).filter((itemId) => l[itemId] === user)
        const selectedIds = getSelectedIds(f)
        locksHeld.filter((id) => !selectedIds.has(id)).forEach(unlock)
    }

    function unlock(itemId: Id) {
        dispatch({ action: "item.unlock", boardId: board.get().id, itemId })
    }
}
