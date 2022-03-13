import { h, HarmajaOutput, ListView } from "harmaja"
import _ from "lodash"
import * as L from "lonna"
import { Board, Connection, findItem, Id, Item } from "../../../../common/src/domain"
import { Dispatch } from "../../store/board-store"
import { BoardFocus, getSelectedConnections, getSelectedItems } from "../board-focus"
import { Rect } from "../../../../common/src/geometry"
import { alignmentsMenu } from "./alignments"
import { areaTilingMenu } from "./areaTiling"
import { colorsAndShapesMenu } from "./colorsAndShapes"
import { fontSizesMenu } from "./fontSizes"
import { resolveEndpoint } from "../../../../common/src/connection-utils"
import { connectionEndsMenu } from "./connection-ends"

export type SubmenuProps = {
    focusedItems: L.Property<{ items: Item[]; connections: Connection[] }>
    board: L.Property<Board>
    dispatch: Dispatch
    submenu: L.Atom<SubMenuCreator | null>
}

export type SubMenuCreator = (props: SubmenuProps) => HarmajaOutput

export const connectionPos = (b: Board | Record<string, Item>) => (c: Connection): Rect => {
    if (c.controlPoints.length === 0) {
        const start = resolveEndpoint(c.from, b)
        const end = resolveEndpoint(c.to, b)
        return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2, width: 0, height: 0 }
    }
    const p = c.controlPoints[0]
    return { ...p, width: 0, height: 0 }
}

type ItemsAndConnections = { items: Item[]; connections: Connection[] }
type Bounds = { minX: number; maxX: number; minY: number; maxY: number } | null

const getSelectionBounds = (items: ItemsAndConnections, b: Board): Bounds => {
    if (items.items.length === 0 && items.connections.length === 0) {
        return null
    }
    const rects = [...items.items, ...items.connections.map(connectionPos(b))]
    const minY = _.min(rects.map((i) => i.y)) || 0
    const minX = _.min(rects.map((i) => i.x)) || 0
    const maxY = _.max(rects.map((i) => i.y + i.height)) || 0
    const maxX = _.max(rects.map((i) => i.x + i.width)) || 0
    return { minX, maxX, minY, maxY }
}

const getStyleAndClass = (bounds: Bounds) => (vr: Rect) => {
    const cn = "context-menu-positioner"
    if (bounds === null) {
        return {
            style: null,
            className: cn,
        }
    }
    const { minX, maxX, minY, maxY } = bounds
    const alignRight = minX > vr.x + vr.width / 2
    const topOfItem = minY - vr.y > vr.height / 3
    return {
        style: {
            left: alignRight ? undefined : `max(${minX}em, ${vr.x}em)`,
            right: alignRight ? `calc(100% - min(${maxX}em, ${vr.x + vr.width}em))` : undefined,
            top: topOfItem ? `${minY}em` : `${maxY}em`,
        },
        className: cn + (topOfItem ? " item-top" : " item-bottom"),
    }
}

export const ContextMenuView = ({
    dispatch,
    board,
    focus,
    viewRect,
}: {
    dispatch: Dispatch
    board: L.Property<Board>
    focus: L.Property<BoardFocus>
    viewRect: L.Property<Rect>
}) => {
    const focusedItems = L.view(focus, board, (f, b) => {
        if (f.status === "dragging" || f.status === "connection-adding" || f.status === "adding")
            return { items: [], connections: [] }
        return { items: getSelectedItems(b)(f), connections: getSelectedConnections(b)(f) }
    })

    const submenu = L.atom<SubMenuCreator | null>(null)
    L.view(
        focusedItems,
        (items) => items.items[0],
        (i) => i?.id,
    ).forEach(() => submenu.set(null))

    const props = { board, focusedItems, dispatch, submenu }
    const widgetCreators = [
        alignmentsMenu("x", props),
        alignmentsMenu("y", props),
        colorsAndShapesMenu(props),
        fontSizesMenu(props),
        areaTilingMenu(props),
        connectionEndsMenu(props),
    ]
    const activeWidgets = L.view(L.combineAsArray(widgetCreators), (arrays) => arrays.flat())
    const captureEvents = (e: JSX.MouseEvent) => {
        e.stopPropagation()
    }
    return L.view(
        activeWidgets,
        (ws) => ws.length === 0,
        (hide) => {
            if (hide) return null
            const bounds = L.view(focus, () => getSelectionBounds(focusedItems.get(), board.get()))
            const styleAndClass = L.view(viewRect, bounds, (vr, b) => getStyleAndClass(b)(vr))

            return (
                <div
                    className={L.view(styleAndClass, "className")}
                    style={L.view(styleAndClass, "style")}
                    onDoubleClick={captureEvents}
                    onClick={captureEvents}
                >
                    <div className="context-menu">
                        <ListView observable={activeWidgets} renderItem={(x) => x} getKey={(x) => x} />
                    </div>
                    {L.view(submenu, (show) => (show ? show(props) : null))}
                </div>
            )
        },
    )
}
