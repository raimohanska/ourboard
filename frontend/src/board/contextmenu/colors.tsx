import { h } from "harmaja"
import * as L from "lonna"
import { NOTE_COLORS, TRANSPARENT } from "../../../../common/src/colors"
import { Board, Color, ColoredItem, isColoredItem, Item } from "../../../../common/src/domain"
import { Dispatch } from "../../store/board-store"

type Props = {
    focusedItems: L.Property<Item[]>
    board: L.Property<Board>
    dispatch: Dispatch
}

export function colorsMainMenu(props: Props) {
    const coloredItems = L.view(props.focusedItems, (items) => items.filter(isColoredItem))
    const showSubmenu = L.atom(false)
    const anyColored: L.Property<ColoredItem | null> = L.view(coloredItems, (items) => items[0] || null)
    anyColored.forEach((hasAny) => !hasAny && showSubmenu.set(false))

    return L.view(anyColored, (anyColored) => {
        if (!anyColored) return []
        const color = NOTE_COLORS.find((c) => c.color === anyColored.color) || NOTE_COLORS[0]
        return !anyColored
            ? []
            : [
                  <div className="colors icon-group">
                      <span
                          className={`icon color ${color.name}`}
                          style={{ background: color.color === TRANSPARENT ? undefined : color.color }}
                          onClick={() => showSubmenu.modify((v) => !v)}
                      />
                      {L.view(showSubmenu, (show) =>
                          show ? <div className="submenu">{colorsMenu(props)}</div> : null,
                      )}
                  </div>,
              ]
    })
}

export function colorsMenu({ board, focusedItems, dispatch }: Props) {
    const coloredItems = L.view(focusedItems, (items) => items.filter(isColoredItem))
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
