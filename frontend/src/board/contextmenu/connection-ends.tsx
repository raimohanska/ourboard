import { h } from "harmaja"
import * as L from "lonna"
import { SubmenuProps } from "./ContextMenuView"

export function connectionEndsMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    const connections = L.view(focusedItems, (items) => items.connections)
    const singleConnection = L.view(connections, (connections) => connections.length === 1 ? connections[0] : null)

    return L.view(singleConnection, (connection) => {
        if (!connection) return []
        return !connection
            ? []
            : [
                  <div className="connection-ends icon-group">
                      <span
                          className={`icon`}
                          onClick={() => {}}
                      >
                         &lt;
                      </span>
                      <span
                          className={`icon`}
                          onClick={() => {}}
                      >
                         &gt;
                      </span>
                  </div>,
              ]
    })
}