import { h } from "harmaja"
import * as L from "lonna"
import { NOTE_COLORS, TRANSPARENT } from "../../../../common/src/colors"
import { Color, isColoredItem } from "../../../../common/src/domain"
import { SubmenuProps } from "./ContextMenuView"

export function colorsSubMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    const coloredItems = L.view(focusedItems, (items) => items.items.filter(isColoredItem))
    const anyColored = L.view(coloredItems, (items) => items.length > 0)

    return L.view(anyColored, (anyColored) => {
        return !anyColored
            ? []
            : [
                  <div className="colors icon-group">
                      {NOTE_COLORS.map((color) => {
                          return (
                              <span
                                  className={`icon color ${color.name}`}
                                  style={{ background: color.color === TRANSPARENT ? undefined : color.color }}
                                  onClick={() => setColor(color.color)}
                              />
                          )
                      })}
                  </div>,
              ]
    })

    function setColor(color: Color) {
        const b = board.get()
        const updated = coloredItems.get().map((item) => ({ ...item, color }))
        dispatch({ action: "item.update", boardId: b.id, items: updated })
    }
}
