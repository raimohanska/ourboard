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

    const connectionsWithItemsPopulated = L.view(
        L.view(board, "items"),
        L.view(board, "connections"),
        focus,
        zoom,
        (is: Item[], cs: Connection[], f, z) => {
            return cs.flatMap((c) => {
                const fromItem: Point = is.find((i) => i.id === c.from)!
                const toItemOrPoint = isPoint(c.to) ? c.to : is.find((i) => i.id === c.to)!
                if (!fromItem || !toItemOrPoint) {
                    // TODO: should not happen. Is there something wrong with Lonna as it seems to provide a temporary view where
                    //       connections and items are out of sync.
                    return []
                }
                const from = findNearestAttachmentLocationForConnectionNode(fromItem, toItemOrPoint)
                const to = findNearestAttachmentLocationForConnectionNode(toItemOrPoint, fromItem)
                return [
                    {
                        ...c,
                        from,
                        to,
                        selected: f.status === "connection-selected" && f.id === c.id,
                    },
                ]
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
                        const curve = L.combine(L.view(conn, "from"), L.view(conn, "to"), (from, to) => {
                            return G.quadraticCurveSVGPath(
                                {
                                    x: coordinateHelper.emToPx(from.point.x),
                                    y: coordinateHelper.emToPx(from.point.y),
                                },
                                {
                                    x: coordinateHelper.emToPx(to.point.x),
                                    y: coordinateHelper.emToPx(to.point.y),
                                },
                            )
                        })
                        return (
                            <g>
                                <path
                                    id="curve"
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
        type: "to" | "from"
        selected: boolean
    }
    function ConnectionNode(key: string, cNode: L.Property<ConnectionNodeProps>) {
        function onRef(el: Element) {
            cNode.get().type === "to" &&
                existingConnectionHandler(el, cNode.get().id, coordinateHelper, board, dispatch)
        }

        const id = L.view(cNode, (cn) => `connection-${cn.id}-${cn.type}`)

        const style = L.view(cNode, (cn) => ({
            top: coordinateHelper.emToPx(cn.node.point.y),
            left: coordinateHelper.emToPx(cn.node.point.x),
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
                    let cls = ""
                    if (cn.type === "from") {
                        cls += "connection-node from-node "
                    } else {
                        cls += "connection-node to-node "
                    }

                    if (cn.selected) cls += "highlight "

                    cls += `side-${cn.node.side}`

                    return cls
                })}
                style={style}
            ></div>
        )
    }
}

function findNearestAttachmentLocationForConnectionNode(i: Point | Item, reference: Point): AttachmentLocation {
    if (!isItem(i)) return { side: "none", point: i }
    function p(x: number, y: number) {
        return { x, y }
    }
    const options = [
        { side: "top" as const, point: p(i.x + i.width / 2, i.y) },
        { side: "left" as const, point: p(i.x, i.y + i.height / 2) },
        { side: "right" as const, point: p(i.x + i.width, i.y + i.height / 2) },
        { side: "bottom" as const, point: p(i.x + i.width / 2, i.y + i.height) },
    ]
    return _.minBy(options, (p) => G.distance(p.point, reference))!
}
