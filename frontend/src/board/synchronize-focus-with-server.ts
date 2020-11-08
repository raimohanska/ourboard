
import * as L from "lonna"
import { Board, Id, ItemLocks } from "../../../common/src/domain";
import { Dispatch } from "./board-store";
  
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

export type BoardFocus = 
  { status: "none" } | 
  { status: "selected", ids: Set<Id> } | 
  { status: "dragging", ids: Set<Id> } | 
  { status: "editing", id: Id }

export function synchronizeFocusWithServer(board: L.Property<Board>, locks: L.Property<ItemLocks>, userId: L.Property<string | null>, dispatch: Dispatch) {
  const lock = (itemId: Id) => dispatch({ action: "item.lock", boardId: board.get().id, itemId })
  const unlock = (itemId: Id) => dispatch({ action: "item.unlock", boardId: board.get().id, itemId })

  function dispatchLocksIfNecessary(f: BoardFocus) {
    const user = userId.get()
    if (!user) return
    const l = locks.get()
    const locksHeld = Object.keys(l).filter(itemId => l[itemId] === user)

    switch (f.status) {
      case "none": {
        locksHeld.forEach(unlock)
        break
      }
      case "editing": {
        const lockHeld = locksHeld.includes(f.id)
        !lockHeld && lock(f.id)
        break
      }
      case "selected":
      case "dragging": {
        locksHeld.filter(id => !f.ids.has(id)).forEach(unlock);
        [...f.ids].filter(id => !locksHeld.includes(id)).forEach(lock)
        break
      }
    }
  }

  function allowFocusIfAtLeastOneItemNotLockedBySomeoneElse_AndThenNastilyMutateSelectedIDsConditionallyToOnlyIncludeTheAllowedOnes(f: BoardFocus) {
    const user = userId.get()!

    if (f.status === "none") return true
    
    const l = locks.get()

    const itemsWhereSomeoneElseHasLock = new Set(Object.keys(l).filter(itemId => l[itemId] !== user))

    switch (f.status) {
      case "editing":
        return !itemsWhereSomeoneElseHasLock.has(f.id)
      case "selected":
      case "dragging": {
        const notLockedItems = new Set([...f.ids].filter(id => !itemsWhereSomeoneElseHasLock.has(id)))
        if (notLockedItems.size === 0) {
          return false
        }

        // MUTATION IN FILTER ALERT -- which function should I add to 'pipe' to first return true here
        // but then map the result, while still returning an Atom?
        f.ids = notLockedItems
        return true
      }
    }
  }

  const focus = L.atom<BoardFocus>({status: "none" })
    .pipe(
      L.filter(allowFocusIfAtLeastOneItemNotLockedBySomeoneElse_AndThenNastilyMutateSelectedIDsConditionallyToOnlyIncludeTheAllowedOnes, L.globalScope)
    )

  focus.forEach(dispatchLocksIfNecessary)

  locks.forEach(l => {
    const user = userId.get()
    const f = focus.get()
    if (!user && f.status !== "none") {
      focus.set({ status: "none" })
      return
    }

    const itemsWhereSomeoneElseHasLock = new Set(Object.keys(l).filter(itemId => l[itemId] !== user))

    if (f.status === "none") {
      return
    }

    if (f.status === "editing" && itemsWhereSomeoneElseHasLock.has(f.id)) {
      focus.set({ status: "none" })
      return
    }

    if (f.status === "dragging" || f.status === "selected") {
      const notLockedBySomeoneElse = [...f.ids].filter(id => !itemsWhereSomeoneElseHasLock.has(id))

      const notChanged = notLockedBySomeoneElse.length === f.ids.size && notLockedBySomeoneElse.every(id => f.ids.has(id))
      if (notChanged) return

      focus.set(
        notLockedBySomeoneElse.length > 0
        ? { status: f.status, ids: new Set(notLockedBySomeoneElse) }
        : { status: "none" }
      )
    }    
  })

  return focus
}