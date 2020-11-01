
  import * as L from "lonna"
  import { ItemLocks } from "../../../common/domain";
  import { BoardFocus } from "./BoardView"
  
  export function itemLockReconciler(locks: L.Property<ItemLocks>, focus: L.Atom<BoardFocus>, userId: L.Property<string | null>) {
    return L.combineTemplate({
      l: locks,
      f: focus,
      user: userId
    }).forEach(({ l, f, user }) => {
      if (!user && f.status !== "none") {
        focus.set({ status: "none" })
        return
      }

      /*
        Server should have authoritative answer to who is currently holding the lock to a
        particular item, so if someone else is holding it, stop editing/dragging/selecting
        that particular item. Do nothing if no-one seems to be holding the lock.
      */
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
}