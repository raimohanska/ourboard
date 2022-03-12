import { h } from "harmaja"
import * as L from "lonna"
import { NOTE_COLORS } from "../../../../common/src/colors"
import { ColoredItem, isColoredItem } from "../../../../common/src/domain"
import { colorsSubMenu } from "./colors"
import { SubmenuProps } from "./ContextMenuView"
import { getShapeIcon, shapesMenu } from "./shapes"

function createSubMenu(props: SubmenuProps) {
    return (
        <div className="submenu">
            {colorsSubMenu(props)}
            {shapesMenu(props)}
        </div>
    )
}

export function colorsAndShapesMenu(props: SubmenuProps) {
    const coloredItems = L.view(props.focusedItems, (items) => items.items.filter(isColoredItem))
    const representativeColoredItem: L.Property<ColoredItem | null> = L.view(coloredItems, (items) => items[0] || null)
    return L.view(representativeColoredItem, (item) => {
        if (!item) return []
        const color = NOTE_COLORS.find((c) => c.color === item.color) || NOTE_COLORS[0]
        const shapeIcon = getShapeIcon(item)

        return !item
            ? []
            : [
                  <div className="colors-shapes icon-group">
                      <span
                          className={`icon color ${color.name}`}
                          onClick={() => props.submenu.modify((v) => (v == createSubMenu ? null : createSubMenu))}
                      >
                          {shapeIcon(color.color, color.color)}
                      </span>
                  </div>,
              ]
    })
}
