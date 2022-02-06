import { h, HarmajaOutput, ListView } from "harmaja"
import _ from "lodash"
import * as L from "lonna"
import { Board, findItem, Id, Item } from "../../../../common/src/domain"
import { Dispatch } from "../../store/board-store"
import { BoardFocus } from "../board-focus"
import { Rect } from "../geometry"
import { alignmentsMenu } from "./alignments"
import { areaTilingMenu } from "./areaTiling"
import { colorsAndShapesMenu } from "./colorsAndShapes"
import { fontSizesMenu } from "./fontSizes"

export type SubmenuProps = {
    focusedItems: L.Property<Item[]>
    board: L.Property<Board>
    dispatch: Dispatch
    submenu: L.Atom<SubMenuCreator | null>
}

export type SubMenuCreator = (props: SubmenuProps) => HarmajaOutput

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
    function itemIdsForContextMenu(f: BoardFocus): Id[] {
        switch (f.status) {
            case "none":
            case "adding":
            case "connection-adding":
            case "connection-selected":
            case "dragging":
                return []
            case "editing":
                return [f.id]
            case "selected":
                return [...f.ids]
        }
    }

    const focusedItems = L.view(focus, board, (f, b) => {
        const itemIds = itemIdsForContextMenu(f)
        return itemIds.flatMap((id) => findItem(b)(id) || [])
    })

    const styleAndClass = L.view(focusedItems, viewRect, (items, vr) => {
        const cn = "context-menu-positioner"
        if (items.length === 0)
            return {
                style: null,
                className: cn,
            }
        const minY = _.min(items.map((i) => i.y)) || 0
        const minX = _.min(items.map((i) => i.x)) || 0
        const maxY = _.max(items.map((i) => i.y + i.height)) || 0
        const maxX = _.max(items.map((i) => i.x + i.width)) || 0
        const alignRight = minX > vr.x + vr.width / 2
        const topOfItem = minY - vr.y > vr.height / 3
        return {
            style: {
                left: alignRight ? undefined : `max(${minX}em, ${vr.x}em)`,
                right: alignRight ? `calc(100% - min(${maxX}em, ${vr.x + vr.width}em))` : undefined,
                top: topOfItem ? minY + "em" : `calc(${maxY}em + 4rem)`,
            },
            className: cn + (topOfItem ? " item-top" : " item-bottom"),
        }
    })

    const submenu = L.atom<SubMenuCreator | null>(null)
    L.view(
        focusedItems,
        (items) => items[0],
        (i) => i?.id,
    ).forEach(() => submenu.set(null))

    const props = { board, focusedItems, dispatch, submenu }
    const widgetCreators = [
        alignmentsMenu("x", props),
        alignmentsMenu("y", props),
        colorsAndShapesMenu(props),
        fontSizesMenu(props),
        areaTilingMenu(props),
    ]
    const activeWidgets = L.view(L.combineAsArray(widgetCreators), (arrays) => arrays.flat())

    const captureEvents = (e: JSX.MouseEvent) => {
        e.stopPropagation()
    }
    return L.view(
        activeWidgets,
        (ws) => ws.length === 0,
        (hide) =>
            hide ? null : (
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
            ),
    )
}
