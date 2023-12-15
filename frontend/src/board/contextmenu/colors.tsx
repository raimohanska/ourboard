import { h } from "harmaja"
import * as L from "lonna"
import { NOTE_COLORS, TRANSPARENT, YELLOW } from "../../../../common/src/colors"
import { Color, Item, isColoredItem } from "../../../../common/src/domain"
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
                      <span className={"icon color new-color"}>
                          <input
                              type="color"
                              onInput={(e) => setColor(e.target.value)}
                              value={itemColorOrDefault(focusedItems.get().items)}
                          />
                      </span>
                  </div>,
              ]
    })

    function setColor(color: Color) {
        const b = board.get()
        const updated = coloredItems.get().map((item) => ({ id: item.id, color }))
        dispatch({ action: "item.update", boardId: b.id, items: updated })
    }
}

function itemColorOrDefault(items: Item[]) {
    const firstNoteWithColor = items.find(isColoredItem)
    if (!firstNoteWithColor) return YELLOW
    return firstNoteWithColor.color
}
