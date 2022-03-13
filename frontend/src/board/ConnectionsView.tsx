import * as H from "harmaja"
import { Fragment, h, ListView } from "harmaja"
import _ from "lodash"
import * as L from "lonna"
import {
    AttachmentLocation,
    Board,
    ConnectionEndPoint,
    ConnectionEndStyle,
    isDirectedItemEndPoint,
    isPoint,
    Item,
    Point,
    RenderableConnection,
} from "../../../common/src/domain"
import { findAttachmentLocation, resolveItemEndpoint } from "../../../common/src/connection-utils"
import { Dispatch } from "../store/board-store"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus, getSelectedConnectionIds } from "./board-focus"
import * as G from "../../../common/src/geometry"
import { existingConnectionHandler } from "./item-connect"
import { Z_CONNECTIONS } from "./zIndices"

export const ConnectionsView = ({
    board,
    dispatch,
    zoom,
    coordinateHelper,
    focus,
}: {
    board: L.Property<Board>
    dispatch: Dispatch
    zoom: L.Property<BoardZoom>
    coordinateHelper: BoardCoordinateHelper
    focus: L.Atom<BoardFocus>
}) => {
    // Item position might change but connection doesn't -- need to rerender connections anyway
    // Connection objects normally only hold the ID to the "from" and "to" items
    // This populates the actual object in place of the ID

    function determineAttachmenLocation(
        e: ConnectionEndPoint,
        control: Point,
        is: Record<string, Item>,
    ): AttachmentLocation {
        if (isDirectedItemEndPoint(e)) {
            return findAttachmentLocation(resolveItemEndpoint(e, is), e.side)
        }
        const fromItem: Point = resolveEndpoint(e, is)
        // Support legacy routing (side not fixed)
        return findNearestAttachmentLocationForConnectionNode(fromItem, control)
    }
    const connectionsWithItemsPopulated = L.view(
        L.view(board, (b) => ({ is: b.items, cs: b.connections })),
        focus,
        L.view(zoom, "zoom"),
        ({ is, cs }, f, z) => {
            return cs.map((c) => {
                const fromItem: Point = resolveEndpoint(c.from, is)
                const toItemOrPoint = resolveEndpoint(c.to, is)
                const firstControlPoint = c.controlPoints[0] || fromItem
                const lastControlPoint = c.controlPoints[c.controlPoints.length - 1] || toItemOrPoint
                return {
                    ...c,
                    from: determineAttachmenLocation(c.from, firstControlPoint, is),
                    to: determineAttachmenLocation(c.to, lastControlPoint, is),
                    selected: getSelectedConnectionIds(f).has(c.id),
                }
            })
        },
    )

    // We want to render round draggable nodes at the end of edges (paths),
    // But SVG elements are not draggable by default, so get a flat list of
    // nodes and render them as regular HTML elements
    const connectionNodes = L.view(connectionsWithItemsPopulated, (cs) =>
        cs.flatMap((c) => [
            { id: c.id, type: "from" as const, node: c.from, selected: c.selected, style: c.fromStyle },
            { id: c.id, type: "to" as const, node: c.to, selected: c.selected, style: c.toStyle },
            ...c.controlPoints.map((cp) => ({
                id: c.id,
                type: "control" as const,
                node: { point: cp, side: "none" as const },
                selected: c.selected,
                style: c.pointStyle,
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
        zIndex: Z_CONNECTIONS,
    })

    return (
        <>
            <ListView<ConnectionNodeProps, string>
                observable={connectionNodes}
                renderObservable={ConnectionNode}
                getKey={(c) => c.id + c.type}
            />
            <svg className="connections" style={svgElementStyle}>
                <ListView
                    observable={connectionsWithItemsPopulated}
                    renderObservable={(key, conn) => {
                        const curve = L.combine(
                            L.view(conn, "from"),
                            L.view(conn, "to"),
                            L.view(conn, "controlPoints"),
                            (from, to, cps) => {
                                return quadraticCurveSVGPath(
                                    {
                                        x: coordinateHelper.emToBoardPx(from.point.x),
                                        y: coordinateHelper.emToBoardPx(from.point.y),
                                    },
                                    {
                                        x: coordinateHelper.emToBoardPx(to.point.x),
                                        y: coordinateHelper.emToBoardPx(to.point.y),
                                    },
                                    cps.map((cp) => ({
                                        x: coordinateHelper.emToBoardPx(cp.x),
                                        y: coordinateHelper.emToBoardPx(cp.y),
                                    })),
                                )
                            },
                        )
                        return (
                            <g>
                                <path
                                    className={L.view(conn, (c) => (c.selected ? "connection selected" : "connection"))}
                                    d={curve}
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
        style: ConnectionEndStyle
        selected: boolean
    }
    function ConnectionNode(key: string, cNode: L.Property<ConnectionNodeProps>) {
        function onRef(el: HTMLDivElement) {
            const { id, type } = cNode.get()
            existingConnectionHandler(el, id, type, coordinateHelper, board, dispatch)
        }

        const id = L.view(cNode, (cn) => `connection-${cn.id}-${cn.type}`)

        const angle = L.view(cNode, (cn) => {
            if (cn.style !== "arrow" || cn.type === "control") return null
            const conn = connectionsWithItemsPopulated.get().find((c) => c.id === cn.id)
            if (!conn) {
                return null
            }
            const [thisEnd, otherEnd] = cn.type === "from" ? [conn.from, conn.to] : [conn.to, conn.from]
            const bez = bezierCurveFromPoints(
                otherEnd.point,
                getControlPoint(otherEnd.point, thisEnd.point, conn.controlPoints),
                thisEnd.point,
            )
            const derivative = bez.derivative(1) // tangent vector at the very end of the curve
            const angleInDegrees =
                ((Math.atan2(derivative.y, derivative.x) - Math.atan2(0, Math.abs(derivative.x))) * 180) / Math.PI
            return Math.round(angleInDegrees)
        })

        const wrapperStyle = L.view(cNode, (cn) => ({
            top: `${cn.node.point.y}em`,
            left: `${cn.node.point.x}em`,
            zIndex: Z_CONNECTIONS + 1,
        }))

        const nodeStyle = L.view(angle, (ang) => ({
            transform: ang !== null ? `rotate(${ang}deg)` : undefined,
        }))

        const selectThisConnection = (e: JSX.MouseEvent) => {
            const id = cNode.get().id
            const f = focus.get()
            if (e.shiftKey && f.status === "selected") {
                focus.set({ ...f, connectionIds: toggleInSet(id, f.connectionIds) })
            } else {
                focus.set({ status: "selected", connectionIds: new Set([id]), itemIds: emptySet() })
            }
        }

        return (
            <div
                ref={onRef}
                draggable={true}
                onClick={selectThisConnection}
                onDragStart={selectThisConnection}
                style={wrapperStyle}
                className="connection-node-grabber-helper"
            >
                <div
                    id={id}
                    className={L.view(cNode, (cn) => {
                        let cls = `connection-node ${cn.type}-node ${cn.style}-style `

                        if (cn.selected) cls += "highlight "

                        cls += cn.node.side === "none" ? "unattached" : "attached"

                        return cls
                    })}
                    style={nodeStyle}
                ></div>
            </div>
        )
    }
}

// @ts-ignore
import { Bezier } from "bezier-js"
import { BoardZoom } from "./board-scroll-and-zoom"
import { findNearestAttachmentLocationForConnectionNode, resolveEndpoint } from "../../../common/src/connection-utils"
import { emptySet, toggleInSet } from "../../../common/src/sets"

function quadraticCurveSVGPath(from: Point, to: Point, controlPoints: Point[]) {
    if (!controlPoints.length) {
        // fallback if no control points: straight line
        const midPoint = getControlPoint(from, to, controlPoints)
        return "M" + from.x + " " + from.y + " Q " + midPoint.x + " " + midPoint.y + " " + to.x + " " + to.y
    } else {
        const peakPointOfCurve = controlPoints[0]
        const bez = bezierCurveFromPoints(from, peakPointOfCurve, to)
        return bez
            .getLUT()
            .reduce(
                (acc: string, p: Point, i: number) =>
                    i === 0 ? (acc += `M ${p.x} ${p.y}`) : (acc += `L ${p.x} ${p.y}`),
                "",
            )
    }
}

function getControlPoint(from: Point, to: Point, controlPoints: Point[]) {
    if (controlPoints.length > 0) return controlPoints[0]
    // fallback if no control points: midpoint
    return { x: (to.x + from.x) * 0.5, y: (to.y + from.y) * 0.5 }
}

function bezierCurveFromPoints(from: Point, middle: Point, to: Point): any {
    return Bezier.quadraticFromPoints(from, middle, to)
}
