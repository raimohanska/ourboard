import * as H from "harmaja"
import { Fragment, h, ListView } from "harmaja"
import _ from "lodash"
import * as L from "lonna"
import { AttachmentLocation, Board, isPoint, Point, RenderableConnection } from "../../../common/src/domain"
import { Dispatch } from "../store/board-store"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus } from "./board-focus"
import * as G from "./geometry"
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
    zoom: L.Property<{ zoom: number; quickZoom: number }>
    coordinateHelper: BoardCoordinateHelper
    focus: L.Atom<BoardFocus>
}) => {
    // Item position might change but connection doesn't -- need to rerender connections anyway
    // Connection objects normally only hold the ID to the "from" and "to" items
    // This populates the actual object in place of the ID

    const connectionsWithItemsPopulated = L.view(
        L.view(board, (b) => ({ is: b.items, cs: b.connections })),
        focus,
        L.view(zoom, "zoom"),
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
                <ListView<RenderableConnection, string>
                    observable={connectionsWithItemsPopulated}
                    renderObservable={(key, conn: L.Property<RenderableConnection>) => {
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
                                <path className="connection" d={curve}></path>
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

            const bez = bezierCurveFromPoints(conn.from.point, conn.controlPoints[0], conn.to.point)
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

        const selectThisConnection = () => {
            focus.set({ status: "connection-selected", id: cNode.get().id })
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
                        let cls = "connection-node "

                        cls += `${cn.type}-node `

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

function quadraticCurveSVGPath(from: Point, to: Point, controlPoints: Point[]) {
    if (!controlPoints || !controlPoints.length) {
        // fallback if no control points, just create a curve with a hardcoded offset
        const midpointX = (to.x + from.x) * 0.5
        const midpointY = (to.y + from.y) * 0.5

        // angle of perpendicular to line:
        const theta = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2

        // distance of control point from mid-point of line:
        const offset = 30

        // location of control point:
        const controlPoint = { x: midpointX + offset * Math.cos(theta), y: midpointY + offset * Math.sin(theta) }
        return "M" + from.x + " " + from.y + " Q " + controlPoint.x + " " + controlPoint.y + " " + to.x + " " + to.y
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

function bezierCurveFromPoints(from: Point, middle: Point, to: Point): any {
    return Bezier.quadraticFromPoints(from, middle, to)
}
