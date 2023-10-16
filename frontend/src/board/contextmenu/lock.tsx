import { h } from "harmaja"
import * as L from "lonna"
import { LockIcon } from "../../components/Icons"
import { SubmenuProps } from "./ContextMenuView"
import { anyConnectionHasPermission, anyItemHasPermission } from "../board-permissions"

export function lockMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    const enabled = L.view(
        focusedItems,
        (items) =>
            anyItemHasPermission(items.items, (p) => p.canLock) ||
            anyConnectionHasPermission(items.connections, (p) => p.canLock),
    )
    return L.view(
        focusedItems,
        (ps) => ps.connections.length > 0 || ps.items.length > 0,
        (show) => {
            console.log(show)
            return show
                ? [
                      <div className="icon-group">
                          <span
                              className={L.view(enabled, (e) => (e ? "icon" : "icon disabled"))}
                              title="Lock item(s)"
                              onClick={() => console.log("TODO")}
                          >
                              <LockIcon />
                          </span>
                      </div>,
                  ]
                : []
        },
    )
}
