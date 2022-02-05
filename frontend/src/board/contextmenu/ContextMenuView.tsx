import { h, ListView } from "harmaja"
import _ from "lodash"
import * as L from "lonna"
import { Board, findItem, Id } from "../../../../common/src/domain"
import { Dispatch } from "../../store/board-store"
import { BoardFocus } from "../board-focus"
import { Rect } from "../geometry"
import { alignmentsMenu } from "./alignments"
import { areaTilingMenu } from "./areaTiling"
import { colorsMainMenu, colorsMenu } from "./colors"
import { fontSizesMenu } from "./fontSizes"
import { shapesMenu } from "./shapes"

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

    const style = L.view(focusedItems, viewRect, (items, vr) => {
        if (items.length === 0) return null
        const minY = _.min(items.map((i) => i.y)) || 0
        const minX = _.min(items.map((i) => i.x)) || 0
        const maxY = _.max(items.map((i) => i.y + i.height)) || 0
        const maxX = _.max(items.map((i) => i.x + i.width)) || 0
        const alignRight = minX > vr.x + vr.width / 2
        return {
            left: alignRight ? undefined : `max(${minX}em, ${vr.x}em)`,
            right: alignRight ? `calc(100% - min(${maxX}em, ${vr.x + vr.width}em))` : undefined,
            top: minY - vr.y > vr.height / 3 ? minY + "em" : `calc(${maxY}em + 4rem)`,
        }
    })

    const props = { board, focusedItems, dispatch }
    const widgetCreators = [
        alignmentsMenu(props),
        colorsMainMenu(props),
        fontSizesMenu(props),
        shapesMenu(props),
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
                <div className="context-menu-positioner" style={style}>
                    <div className="context-menu" onDoubleClick={captureEvents} onClick={captureEvents}>
                        <ListView observable={activeWidgets} renderItem={(x) => x} getKey={(x) => x} />
                    </div>
                </div>
            ),
    )
}
