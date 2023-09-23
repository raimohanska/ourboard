import { h } from "harmaja"
import * as L from "lonna"
import { LockIcon } from "../../components/Icons"
import { SubmenuProps } from "./ContextMenuView"

export function lockMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    return L.view(
        focusedItems,
        (ps) => ps.connections.length > 0 || ps.items.length > 0,
        (show) => {
            console.log(show)
            return show
                ? [
                      <div className="icon-group">
                          <span className="icon" title="Lock item(s)" onClick={() => console.log("TODO")}>
                              <LockIcon />
                          </span>
                      </div>,
                  ]
                : []
        },
    )
}
