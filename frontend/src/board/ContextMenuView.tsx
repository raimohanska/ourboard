import { h } from "harmaja"
import * as L from "lonna"
import _ from "lodash"
import { Board, Color, findItem, isColoredItem, isTextItem, Note } from "../../../common/src/domain"
import { Dispatch } from "../store/user-session-store"
import { NOTE_COLORS } from "./PaletteView"
import { BoardFocus, getSelectedItems } from "./board-focus"
import { getItem } from "../../../common/src/domain"

export const ContextMenuView = ({
    latestNote,
    dispatch,
    board,
    focus,
}: {
    latestNote: L.Atom<Note>
    dispatch: Dispatch
    board: L.Property<Board>
    focus: L.Property<BoardFocus>
}) => {
    function itemIdsForContextMenu(f: BoardFocus) {
        switch (f.status) {
            case "dragging":
                return []
            case "editing":
                return [f.id]
            case "none":
                return []
            case "selected":
                return [...f.ids]
        }
    }

    const focusedItems = L.view(focus, board, (f, b) => {
        const itemIds = itemIdsForContextMenu(f)
        return itemIds.flatMap((id) => findItem(board.get())(id) || [])
    })

    const focusItem = L.view(focusedItems, (items) => {
        if (items.length === 0) return null
        return {
            x: _.mean(items.map((i) => i.x)),
            y: _.min(items.map((i) => i.y)),
        }
    })

    const widgetCreators = [menuColors(), menuFontSizes()]
    const activeWidgets = L.view(L.combineAsArray(widgetCreators), (arrays) => arrays.flat())

    return L.view(
        activeWidgets,
        (ws) => ws.length === 0,
        (hide) =>
            hide ? null : (
                <div
                    className="context-menu-positioner"
                    style={L.combineTemplate({
                        left: L.view(focusItem, (p) => (p ? p.x + "em" : 0)),
                        top: L.view(focusItem, (p) => (p ? p.y + "em" : 0)),
                    })}
                >
                    <div className="context-menu">{activeWidgets}</div>
                </div>
            ),
    )

    function menuFontSizes() {
        const textItems = L.view(focusedItems, (items) => items.filter(isTextItem))
        const anyText = L.view(textItems, (items) => items.length > 0)

        return L.view(anyText, (any) =>
            !any
                ? []
                : [
                      <div className="font-size">
                          <span className="icon plus" onClick={increaseFont} />
                          <span className="icon minus" onClick={decreaseFont} />
                      </div>,
                  ],
        )

        function increaseFont() {
            dispatch({
                action: "item.font.increase",
                boardId: board.get().id,
                itemIds: textItems.get().map((i) => i.id),
            })
        }
        function decreaseFont() {
            dispatch({
                action: "item.font.decrease",
                boardId: board.get().id,
                itemIds: textItems.get().map((i) => i.id),
            })
        }
    }

    function menuColors() {
        const coloredItems = L.view(focusedItems, (items) => items.filter(isColoredItem))
        const anyColored = L.view(coloredItems, (items) => items.length > 0)

        return L.view(anyColored, (any) =>
            !any
                ? []
                : [
                      <div className="colors">
                          {NOTE_COLORS.map((color) => {
                              return (
                                  <span
                                      className={"color " + color}
                                      style={{ background: color }}
                                      onClick={() => setColor(color)}
                                  />
                              )
                          })}
                      </div>,
                  ],
        )

        function setColor(color: Color) {
            const f = focus.get()
            const b = board.get()

            // To remember color selection for creating new notes.
            latestNote.modify((n) => ({ ...n, color }))

            const updated = coloredItems.get().map((item) => ({ ...item, color }))
            dispatch({ action: "item.update", boardId: b.id, items: updated })
        }
    }
}
