import { h } from "harmaja"
import * as L from "lonna"
import { rerouteConnection } from "../../../../common/src/connection-utils"
import { ConnectionEndStyle } from "../../../../common/src/domain"
import { SubmenuProps } from "./ContextMenuView"

const styles: ConnectionEndStyle[] = ["arrow", "white-dot", "black-dot", "none"]
function nextStyle(style: ConnectionEndStyle) {
    const i = styles.indexOf(style)
    return styles[(i + 1) % styles.length]
}

export function connectionEndsMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    const connections = L.view(focusedItems, (items) => items.connections)
    const singleConnection = L.view(connections, (connections) => (connections.length === 1 ? connections[0] : null))
    return L.view(singleConnection, (connection) => {
        if (!connection) return []
        return !connection
            ? []
            : [
                  <div className="connection-ends icon-group">
                      <span
                          className={`icon`}
                          onClick={() =>
                              dispatch({
                                  action: "connection.modify",
                                  boardId: board.get().id,
                                  connections: [{ ...connection, fromStyle: nextStyle(connection.fromStyle) }],
                              })
                          }
                      >
                          &lt;
                      </span>
                      <span
                          className={`icon`}
                          onClick={() =>
                              dispatch({
                                  action: "connection.modify",
                                  boardId: board.get().id,
                                  connections: [
                                      connection.controlPoints.length
                                          ? { ...connection, controlPoints: [] }
                                          : rerouteConnection(
                                                { ...connection, controlPoints: [{ x: 0, y: 0 }] },
                                                board.get(),
                                            ),
                                  ],
                              })
                          }
                      >
                          o
                      </span>
                      <span
                          className={`icon`}
                          onClick={() =>
                              dispatch({
                                  action: "connection.modify",
                                  boardId: board.get().id,
                                  connections: [{ ...connection, toStyle: nextStyle(connection.toStyle) }],
                              })
                          }
                      >
                          &gt;
                      </span>
                  </div>,
              ]
    })
}
