import { h } from "harmaja"
import * as L from "lonna"
import { rerouteConnection } from "../../../../common/src/connection-utils"
import { ConnectionEndStyle } from "../../../../common/src/domain"
import {
    ConnectionCenterCurveDotIcon,
    ConnectionCenterCurveIcon,
    ConnectionCenterLineIcon,
    ConnectionEndLineIcon,
    ConnectionLeftArrowIcon,
    ConnectionLeftDotIcon,
    ConnectionRightArrowIcon,
    ConnectionRightDotIcon,
} from "../../components/Icons"
import { SubmenuProps } from "./ContextMenuView"

const styles: ConnectionEndStyle[] = ["arrow", "black-dot", "none"]
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
                          {connection.fromStyle === "arrow" ? (
                              <ConnectionLeftArrowIcon />
                          ) : connection.fromStyle === "black-dot" ? (
                              <ConnectionLeftDotIcon />
                          ) : (
                              <ConnectionEndLineIcon />
                          )}
                      </span>
                      <span
                          className={`icon`}
                          onClick={() =>
                              dispatch({
                                  action: "connection.modify",
                                  boardId: board.get().id,
                                  connections: [
                                      connection.controlPoints.length === 0
                                          ? rerouteConnection(
                                                {
                                                    ...connection,
                                                    controlPoints: [{ x: 0, y: 0 }],
                                                    pointStyle: "black-dot",
                                                },
                                                board.get(),
                                            )
                                          : connection.pointStyle === "black-dot"
                                          ? { ...connection, pointStyle: "none" }
                                          : { ...connection, controlPoints: [] },
                                  ],
                              })
                          }
                      >
                          {connection.controlPoints.length === 0 ? (
                              <ConnectionCenterLineIcon />
                          ) : connection.pointStyle === "black-dot" ? (
                              <ConnectionCenterCurveDotIcon />
                          ) : (
                              <ConnectionCenterCurveIcon />
                          )}
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
                          {connection.toStyle === "arrow" ? (
                              <ConnectionRightArrowIcon />
                          ) : connection.toStyle === "black-dot" ? (
                              <ConnectionRightDotIcon />
                          ) : (
                              <ConnectionEndLineIcon />
                          )}
                      </span>
                  </div>,
              ]
    })
}
