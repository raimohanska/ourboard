import { h } from "harmaja"
import * as L from "lonna"
import { LockIcon } from "../../components/Icons"
import { SubmenuProps } from "./ContextMenuView"
import { anyConnectionHasPermission, anyItemHasPermission } from "../board-permissions"
import { LockState } from "../../../../common/src/domain"

export function lockMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    const canLock = L.view(
        focusedItems,
        (items) =>
            anyItemHasPermission(items.items, (p) => p.canLock) ||
            anyConnectionHasPermission(items.connections, (p) => p.canLock),
    )

    const canUnlock = L.view(
        focusedItems,
        (items) =>
            anyItemHasPermission(items.items, (p) => p.canUnlock) ||
            anyConnectionHasPermission(items.connections, (p) => p.canUnlock),
    )

    const showUnlock = L.view(canLock, canUnlock, (l, u) => !l && u)
    const enabled = L.view(canLock, canUnlock, (l, u) => l || u)

    const hasItems = L.view(focusedItems, (ps) => ps.connections.length > 0 || ps.items.length > 0)
    const nextLockState = L.view(showUnlock, (unlock): "locked" | undefined => (unlock ? undefined : "locked"))

    // TODO: show unlock icon
    // TODO: lock connections too

    function setLocked() {
        const b = board.get()
        if (!enabled.get()) return
        const updated = focusedItems.get().items.map((item) => ({ id: item.id, locked: nextLockState.get() }))
        dispatch({ action: "item.update", boardId: b.id, items: updated })
    }

    return L.view(hasItems, nextLockState, (hasItems, nextState) => {
        return hasItems
            ? [
                  <div className="icon-group">
                      <span
                          className={L.view(enabled, (e) => (e ? "icon" : "icon disabled"))}
                          title={nextState === "locked" ? "Lock item(s)" : "Unlock item(s)"}
                          onClick={setLocked}
                      >
                          <LockIcon />
                      </span>
                  </div>,
              ]
            : []
    })
}
