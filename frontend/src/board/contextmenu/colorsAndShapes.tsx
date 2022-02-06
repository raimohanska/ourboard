import { h, HarmajaOutput } from "harmaja"
import * as L from "lonna"
import { NOTE_COLORS, TRANSPARENT } from "../../../../common/src/colors"
import { Board, Color, ColoredItem, isColoredItem, Item } from "../../../../common/src/domain"
import { Dispatch } from "../../store/board-store"
import { colorsSubMenu } from "./colors"
import { getShapeIcon, shapesMenu } from "./shapes"

type Props = {
    focusedItems: L.Property<Item[]>
    board: L.Property<Board>
    submenu: L.Atom<HarmajaOutput | null>
    dispatch: Dispatch
}

function createSubMenu(props: Props) {
    return (
        <div className="submenu">
            {colorsSubMenu(props)}
            {shapesMenu(props)}
        </div>
    )
}

export function colorsAndShapesMenu(props: Props) {
    const coloredItems = L.view(props.focusedItems, (items) => items.filter(isColoredItem))
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
                          className={`icon`}
                          onClick={() => props.submenu.modify((v) => (v ? null : createSubMenu(props)))}
                      >
                          {shapeIcon(color.color, color.color)}
                      </span>
                  </div>,
              ]
    })
}
