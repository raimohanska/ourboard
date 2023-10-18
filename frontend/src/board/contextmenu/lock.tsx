import { h } from "harmaja"
import * as L from "lonna"
import { LockIcon, UnlockIcon } from "../../components/Icons"
import * as P from "../board-permissions"
import { SubmenuProps } from "./ContextMenuView"
import { LockState } from "../../../../common/src/domain"

export function lockMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    const canLock = L.view(focusedItems, (items) => items.items.some(P.canLock) || items.connections.some(P.canLock))

    const canUnlock = L.view(
        focusedItems,
        (items) => items.items.some(P.canUnlock) || items.connections.some(P.canUnlock),
    )

    const showUnlock = L.view(canLock, canUnlock, (l, u) => !l && u)
    const enabled = L.view(canLock, canUnlock, (l, u) => l || u)

    const hasItems = L.view(focusedItems, (ps) => ps.connections.length > 0 || ps.items.length > 0)
    const nextLockState: L.Property<"locked" | false> = L.view(showUnlock, (unlock): "locked" | false =>
        unlock ? false : "locked",
    )

    function setLocked() {
        const b = board.get()
        if (!enabled.get()) return
        const all = focusedItems.get()
        const locked = nextLockState.get()
        const items = all.items.map((item) => ({ id: item.id, locked }))
        const connections = all.connections.map((connection) => ({ id: connection.id, locked }))
        dispatch({ action: "item.update", boardId: b.id, items, connections })
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
                          {nextState === "locked" ? <LockIcon /> : <UnlockIcon />}
                      </span>
                  </div>,
              ]
            : []
    })
}
