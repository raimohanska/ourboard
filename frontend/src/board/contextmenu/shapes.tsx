import { h, HarmajaOutput } from "harmaja"
import * as _ from "lodash"
import * as L from "lonna"
import { Color, isShapedItem, Item, NoteShape, ShapedItem } from "../../../../common/src/domain"
import { ShapeDiamondIcon, ShapeRectIcon, ShapeRoundIcon, ShapeSquareIcon } from "../../components/Icons"
import { black, selectedColor } from "../../components/UIColors"
import { SubmenuProps } from "./ContextMenuView"

const shapes = {
    square: ShapeSquareIcon,
    round: ShapeRoundIcon,
    rect: ShapeRectIcon,
    diamond: ShapeDiamondIcon,
}

type ShapeIcon = (c: Color, f?: Color) => HarmajaOutput
type ShapeIconAndId = { id: NoteShape; svg: ShapeIcon }
const shapeSymbols: ShapeIconAndId[] = Object.entries(shapes).map(([id, svg]) => ({ id: id as NoteShape, svg }))

export function getShapeIcon(item: Item): ShapeIcon {
    return shapes[isShapedItem(item) ? item.shape || "square" : "square"]
}

export function shapesMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    const shapedItems = L.view(focusedItems, (items) => items.items.filter(isShapedItem))
    const anyShaped = L.view(shapedItems, (items) => items.length > 0)
    const currentShape = L.view(shapedItems, (items) =>
        _.uniq(items.map((item) => item.shape)).length > 1 ? undefined : items[0]?.shape,
    )

    return L.view(anyShaped, (anyShaped) => {
        return !anyShaped
            ? []
            : [
                  <div className="shapes icon-group">
                      {shapeSymbols.map((shape) => {
                          return (
                              <span className="icon" onClick={changeShape(shape.id)}>
                                  {L.view(
                                      currentShape,
                                      (s) => s === shape.id,
                                      (selected) => shape.svg(selected ? selectedColor : black),
                                  )}
                              </span>
                          )
                      })}
                  </div>,
              ]
    })

    function changeShape(newShape: NoteShape) {
        return () => {
            const b = board.get()
            const items = shapedItems.get()
            const updated = items.map((item) => {
                const maxDim = Math.max(item.width, item.height)
                const dimensions =
                    newShape === "rect"
                        ? { width: maxDim * 1.2, height: maxDim / 1.2 }
                        : { width: maxDim, height: maxDim }
                return { ...item, shape: newShape, ...dimensions }
            }) as ShapedItem[]
            dispatch({ action: "item.update", boardId: b.id, items: updated })
        }
    }
}
