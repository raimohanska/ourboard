import * as H from "harmaja"
import { Fragment, h, ListView } from "harmaja"
import _ from "lodash"
import * as L from "lonna"
import {
    AttachmentLocation,
    Board,
    Connection,
    isItem,
    isPoint,
    Item,
    Point,
    RenderableConnection,
} from "../../../common/src/domain"
import { Dispatch } from "../store/server-connection"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus } from "./board-focus"
import * as G from "./geometry"
import { existingConnectionHandler } from "./item-connect"

export const ConnectionsView = ({
    board,
    dispatch,
    zoom,
    coordinateHelper,
    focus,
}: {
    board: L.Property<Board>
    dispatch: Dispatch
    zoom: L.Property<number>
    coordinateHelper: BoardCoordinateHelper
    focus: L.Atom<BoardFocus>
}) => {
    // Item position might change but connection doesn't -- need to rerender connections anyway
    // Connection objects normally only hold the ID to the "from" and "to" items
    // This populates the actual object in place of the ID

    // TODO FIXME too tired to figure out why some points have stringified numbers as coordinates
    function coerceCoordsToNumber(p: Point) {
        if (typeof p.x === "number" && typeof p.y === "number") return p
        return {
            ...p,
            x: Number(p.x),
            y: Number(p.y),
        }
    }

    const connectionsWithItemsPopulated = L.view(
        L.view(board, (b) => ({ is: b.items, cs: b.connections })),
        focus,
        zoom,
        ({ is, cs }, f, z) => {
            return cs.map((c) => {
                const fromItem: Point = isPoint(c.from) ? c.from : is[c.from]
                const toItemOrPoint = isPoint(c.to) ? c.to : is[c.to]
                const firstControlPoint = c.controlPoints[0] || fromItem
                const lastControlPoint = c.controlPoints[c.controlPoints.length - 1] || toItemOrPoint
                const from = G.findNearestAttachmentLocationForConnectionNode(fromItem, firstControlPoint)
                const to = G.findNearestAttachmentLocationForConnectionNode(toItemOrPoint, lastControlPoint)
                return {
                    ...c,
                    controlPoints: c.controlPoints.map(coerceCoordsToNumber),
                    from,
                    to,
                    selected: f.status === "connection-selected" && f.id === c.id,
                }
            })
        },
    )

    // We want to render round draggable nodes at the end of edges (paths),
    // But SVG elements are not draggable by default, so get a flat list of
    // nodes and render them as regular HTML elements
    const connectionNodes = L.view(connectionsWithItemsPopulated, (cs) =>
        cs.flatMap((c) => [
            { id: c.id, type: "from" as const, node: c.from, selected: c.selected },
            { id: c.id, type: "to" as const, node: c.to, selected: c.selected },
            ...c.controlPoints.map((cp) => ({
                id: c.id,
                type: "control" as const,
                node: { point: cp, side: "none" as const },
                selected: c.selected,
            })),
        ]),
    )

    const svgElementStyle = L.combineTemplate({
        width: L.view(board, (b) => b.width + "em"),
        height: L.view(board, (b) => b.height + "em"),
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
    })

    return (
        <>
            <ListView<ConnectionNodeProps, string>
                observable={connectionNodes}
                renderObservable={ConnectionNode}
                getKey={(c) => c.id + c.type}
            />
            <svg style={svgElementStyle}>
                <ListView<RenderableConnection, string>
                    observable={connectionsWithItemsPopulated}
                    renderObservable={(key, conn: L.Property<RenderableConnection>) => {
                        const curve = L.combine(
                            L.view(conn, "from"),
                            L.view(conn, "to"),
                            L.view(conn, "controlPoints"),
                            (from, to, cps) => {
                                return G.quadraticCurveSVGPath(
                                    {
                                        x: coordinateHelper.emToPx(from.point.x),
                                        y: coordinateHelper.emToPx(from.point.y),
                                    },
                                    {
                                        x: coordinateHelper.emToPx(to.point.x),
                                        y: coordinateHelper.emToPx(to.point.y),
                                    },
                                    cps.map((cp) => ({
                                        x: coordinateHelper.emToPx(cp.x),
                                        y: coordinateHelper.emToPx(cp.y),
                                    })),
                                )
                            },
                        )
                        return (
                            <g>
                                <path
                                    d={curve}
                                    stroke="black"
                                    stroke-width="1"
                                    stroke-linecap="round"
                                    fill="transparent"
                                ></path>
                            </g>
                        )
                    }}
                    getKey={(c) => c.id}
                />
            </svg>
        </>
    )

    type ConnectionNodeProps = {
        id: string
        node: AttachmentLocation
        type: "to" | "from" | "control"
        selected: boolean
    }
    function ConnectionNode(key: string, cNode: L.Property<ConnectionNodeProps>) {
        function onRef(el: Element) {
            const { id, type } = cNode.get()
            existingConnectionHandler(el, id, type, coordinateHelper, board, dispatch)
        }

        const id = L.view(cNode, (cn) => `connection-${cn.id}-${cn.type}`)

        const angle = L.view(cNode, (cn) => {
            if (cn.type !== "to") return null
            const conn = connectionsWithItemsPopulated.get().find((c) => c.id === cn.id)
            if (!conn?.controlPoints.length) {
                return null
            }

            const bez = G.bezierCurveFromPoints(conn.from.point, conn.controlPoints[0], conn.to.point)
            const derivative = bez.derivative(1) // tangent vector at the very end of the curve
            const angleInDegrees =
                ((Math.atan2(derivative.y, derivative.x) - Math.atan2(0, Math.abs(derivative.x))) * 180) / Math.PI
            return Math.round(angleInDegrees)
        })

        const style = L.combine(cNode, angle, (cn, ang) => ({
            top: coordinateHelper.emToPx(cn.node.point.y),
            left: coordinateHelper.emToPx(cn.node.point.x),
            transform: ang !== null ? `translate(-50%, -50%) rotate(${ang}deg)` : undefined,
        }))

        const selectThisConnection = () => {
            focus.set({ status: "connection-selected", id: cNode.get().id })
        }

        return (
            <div
                ref={onRef}
                draggable={true}
                onClick={selectThisConnection}
                onDragStart={selectThisConnection}
                id={id}
                className={L.view(cNode, (cn) => {
                    let cls = "connection-node "

                    cls += `${cn.type}-node `

                    if (cn.selected) cls += "highlight "

                    cls += cn.node.side === "none" ? "unattached" : "attached"

                    return cls
                })}
                style={style}
            ></div>
        )
    }
}
