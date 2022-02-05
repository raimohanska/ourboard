import { h } from "harmaja"
import * as L from "lonna"
import { NOTE_COLORS, TRANSPARENT } from "../../../../common/src/colors"
import { Board, Color, ColoredItem, isColoredItem, Item } from "../../../../common/src/domain"
import { Dispatch } from "../../store/board-store"
import { colorsSubMenu } from "./colors"
import { getShapeIcon, shapesMenu } from "./shapes"

type Props = {
    focusedItems: L.Property<Item[]>
    board: L.Property<Board>
    dispatch: Dispatch
}

export function colorsAndShapesMenu(props: Props) {
    const coloredItems = L.view(props.focusedItems, (items) => items.filter(isColoredItem))
    const showSubmenu = L.atom(false)
    const representativeColoredItem: L.Property<ColoredItem | null> = L.view(coloredItems, (items) => items[0] || null)
    L.view(representativeColoredItem, (i) => i?.id).forEach(() => showSubmenu.set(false))

    return L.view(representativeColoredItem, (item) => {
        if (!item) return []
        const color = NOTE_COLORS.find((c) => c.color === item.color) || NOTE_COLORS[0]
        const shapeIcon = getShapeIcon(item)

        return !item
            ? []
            : [
                  <div className="colors icon-group">
                      <span className={`icon`} onClick={() => showSubmenu.modify((v) => !v)}>
                          {shapeIcon(color.color, color.color)}
                      </span>
                      {L.view(showSubmenu, (show) =>
                          show ? (
                              <div className="submenu">
                                  {colorsSubMenu(props)}
                                  {shapesMenu(props)}
                              </div>
                          ) : null,
                      )}
                  </div>,
              ]
    })
}
