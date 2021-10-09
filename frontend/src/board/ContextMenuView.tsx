import { h, HarmajaOutput, ListView } from "harmaja"
import _ from "lodash"
import * as L from "lonna"
import { NOTE_COLORS, TRANSPARENT } from "../../../common/src/colors"
import {
    Board,
    Color,
    Container,
    findItem,
    Id,
    isColoredItem,
    isContainer,
    isShapedItem,
    isTextItem,
    Item,
    NoteShape,
    ShapedItem,
} from "../../../common/src/domain"
import {
    AlignHorizontalLeftIcon,
    AlignVerticalTopIcon,
    DecreaseFontSizeIcon,
    HorizontalDistributeIcon,
    IncreaseFontSizeIcon,
    ShapeDiamondIcon,
    ShapeRectIcon,
    ShapeRoundIcon,
    ShapeSquareIcon,
    TileIcon,
    VerticalDistributeIcon,
} from "../components/Icons"
import { black, selectedColor } from "../components/UIColors"
import { Dispatch } from "../store/board-store"
import { BoardFocus } from "./board-focus"
import { Rect } from "./geometry"
import { contentRect, packableItems, organizeItems } from "./item-organizer"
import { packItems } from "./item-packer"

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

    const widgetCreators = [menuAlignments(), menuColors(), menuFontSizes(), menuShapes(), menuAreaTiling()]
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

    function menuAlignments() {
        const hasItemsToAlign = L.view(focusedItems, (items) => items.length > 1)
        const hasItemsToDistribute = L.view(focusedItems, (items) => items.length > 2)

        type Axis = "x" | "y"
        type GetCoordinate = (
            item: Item,
            min: number,
            max: number,
            axis: Axis,
            index: number,
            numberOfItems: number,
            sumOfPreviousSizes: number,
            totalSumOfSizes: number,
        ) => number

        function getItemSize(item: Item, axis: Axis) {
            return axis === "x" ? item.width : item.height
        }

        function moveFocusedItems(axis: Axis, getCoordinateToSetToItem: GetCoordinate) {
            const b = board.get()

            const itemsToMove = focusedItems.get()
            const min = _.min(itemsToMove.map((i) => i[axis])) || 0
            const max = _.max(itemsToMove.map((i) => i[axis] + getItemSize(i, axis))) || 0
            const totalSumOfSizes = _.sum(itemsToMove.map((i) => getItemSize(i, axis), 0))

            let sumOfPreviousSizes = 0
            const updatedItems = focusedItems
                .get()
                .sort((item1, item2) => item1[axis] - item2[axis])
                .map((item, index) => {
                    const newItem = {
                        ...item,
                        [axis]: getCoordinateToSetToItem(
                            item,
                            min,
                            max,
                            axis,
                            index,
                            itemsToMove.length,
                            sumOfPreviousSizes,
                            totalSumOfSizes,
                        ),
                    }
                    sumOfPreviousSizes += getItemSize(item, axis)
                    return newItem
                })
            dispatch({ action: "item.update", boardId: b.id, items: updatedItems })
        }

        const getMinCoordinate: GetCoordinate = (_, min) => min

        const getCenterCoordinate: GetCoordinate = (item, min, max, axis) => (min + max - getItemSize(item, axis)) / 2

        const getMaxCoordinate: GetCoordinate = (item, min, max, axis) => max - getItemSize(item, axis)

        const getDistributedCoordinate: GetCoordinate = (
            item,
            min,
            max,
            _,
            index,
            numberOfItems,
            sumOfPreviousSizes,
            totalSumOfSizes,
        ) => {
            const spaceBetweenItems = (max - min - totalSumOfSizes) / (numberOfItems - 1)
            return min + sumOfPreviousSizes + index * spaceBetweenItems
        }
        return L.combine(hasItemsToAlign, hasItemsToDistribute, (hasItemsToAlign, hasItemsToDistribute) => {
            return !hasItemsToAlign
                ? []
                : [
                      <div className="align">
                          {hasItemsToAlign && (
                              <span
                                  className="icon"
                                  onClick={() => moveFocusedItems("x", getMinCoordinate)}
                                  title="Align left"
                              >
                                  <AlignHorizontalLeftIcon />
                              </span>
                          )}

                          {hasItemsToAlign && (
                              <span
                                  className="icon"
                                  title="Align top"
                                  onClick={() => moveFocusedItems("y", getMinCoordinate)}
                              >
                                  <AlignVerticalTopIcon />
                              </span>
                          )}

                          {hasItemsToDistribute && (
                              <span
                                  className="icon"
                                  title="Distribute evenly"
                                  onClick={() => moveFocusedItems("x", getDistributedCoordinate)}
                              >
                                  <HorizontalDistributeIcon />
                              </span>
                          )}
                          {hasItemsToDistribute && (
                              <span
                                  className="icon"
                                  title="Distribute evenly vertically"
                                  onClick={() => moveFocusedItems("y", getDistributedCoordinate)}
                              >
                                  <VerticalDistributeIcon />
                              </span>
                          )}
                      </div>,
                  ]
        })
    }

    function menuColors() {
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

    function menuShapes() {
        type ShapeSymbol = { id: NoteShape; svg: (c: Color) => HarmajaOutput }
        const shapes: ShapeSymbol[] = [
            {
                id: "square",
                svg: ShapeSquareIcon,
            },
            {
                id: "round",
                svg: ShapeRoundIcon,
            },
            {
                id: "rect",
                svg: ShapeRectIcon,
            },
            {
                id: "diamond",
                svg: ShapeDiamondIcon,
            },
        ]

        const shapedItems = L.view(focusedItems, (items) => items.filter(isShapedItem))
        const anyShaped = L.view(shapedItems, (items) => items.length > 0)
        const currentShape = L.view(shapedItems, (items) =>
            _.uniq(items.map((item) => item.shape)).length > 1 ? undefined : items[0]?.shape,
        )

        return L.view(anyShaped, (anyShaped) => {
            return !anyShaped
                ? []
                : [
                      <div className="shapes icon-group">
                          {shapes.map((shape) => {
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

    function menuAreaTiling() {
        const packables = L.view(focusedItems, (items) => {
            if (items.length === 1) {
                if (isContainer(items[0])) return items
            }
            if (items.length >= 1) {
                const containerIds = new Set(items.map((i) => i.containerId))
                if (containerIds.size === 1 && [...containerIds][0]) return items
            }
            return []
        })
        return L.view(
            packables,
            (ps) => ps.length > 0,
            (show) =>
                show
                    ? [
                          <div className="area-options">
                              <span
                                  className="icon"
                                  title="Organize contents"
                                  onClick={() => packArbitraryItems(packables.get())}
                              >
                                  <TileIcon />
                              </span>
                          </div>,
                      ]
                    : [],
        )

        function packArbitraryItems(items: Item[]) {
            const b = board.get()
            if (items.length === 1 && isContainer(items[0])) {
                packItemsInsideContainer(items[0], b)
            } else {
                packItemsInsideContainer(findItem(b)(items[0].containerId!) as Container, b)
            }
        }
        function packItemsInsideContainer(container: Container, b: Board) {
            const targetRect = contentRect(container)
            const itemsToPack = packableItems(container, b)
            let organizedItems = organizeItems(itemsToPack, [], targetRect)
            if (organizedItems.length === 0) {
                console.log("Packing")
                // Already organized -> Pack into equal size to fit
                const packResult = packItems(targetRect, itemsToPack)

                if (!packResult.ok) {
                    console.error("Packing container failed: " + packResult.error)
                    return
                }
                organizedItems = packResult.packedItems
            }

            dispatch({ action: "item.update", boardId: board.get().id, items: organizedItems })
        }
    }

    function menuFontSizes() {
        const textItems = L.view(focusedItems, (items) => items.filter(isTextItem))
        const anyText = L.view(textItems, (items) => items.length > 0)

        return L.view(anyText, (any) =>
            !any
                ? []
                : [
                      <div className="font-size icon-group">
                          <span className="icon" onClick={increaseFont} title="Bigger font">
                              <IncreaseFontSizeIcon />
                          </span>
                          <span className="icon" onClick={decreaseFont} title="Smaller font">
                              <DecreaseFontSizeIcon />
                          </span>
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
}
