import { h, HarmajaOutput, ListView } from "harmaja"
import * as L from "lonna"
import _ from "lodash"
import {
    Board,
    Color,
    findItem,
    isColoredItem,
    Item,
    isTextItem,
    Note,
    isShapedItem,
    ShapedItem,
    Id,
    Container,
    NoteShape,
} from "../../../common/src/domain"
import { Dispatch } from "../store/board-store"
import { NOTE_COLORS } from "../../../common/src/colors"
import { BoardFocus } from "./board-focus"
import { item } from "lonna"
import { packItems } from "./area-packer"
import { selectedColor, black } from "../components/UIColors"
import { BoardCoordinateHelper } from "./board-coordinates"
import { Rect } from "./geometry"

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
        return {
            left: minX + "em",
            top: minY - vr.y > vr.height / 3 ? minY + "em" : `calc(${maxY}em + 4rem)`,
        }
    })

    const widgetCreators = [menuAlignments(), menuColors(), menuFontSizes(), menuShapes(), areaTilingOptions()]
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
                                  className="icon align_horizontal_left"
                                  onClick={() => moveFocusedItems("x", getMinCoordinate)}
                              />
                          )}

                          {hasItemsToAlign && (
                              <span
                                  className="icon align_vertical_top"
                                  onClick={() => moveFocusedItems("y", getMinCoordinate)}
                              />
                          )}

                          {hasItemsToDistribute && (
                              <span
                                  className="icon horizontal_distribute"
                                  onClick={() => moveFocusedItems("x", getDistributedCoordinate)}
                              />
                          )}
                          {hasItemsToDistribute && (
                              <span
                                  className="icon vertical_distribute"
                                  onClick={() => moveFocusedItems("y", getDistributedCoordinate)}
                              />
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
                                      className={`icon color ${color === "#ffffff" ? "white" : color}`}
                                      style={{ background: color }}
                                      onClick={() => setColor(color)}
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
                svg: (color: Color) => (
                    <svg viewBox="-2 -2 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect
                            x="0.5"
                            y="0.5"
                            width="31"
                            height="31"
                            rx="1.5"
                            stroke={color}
                            stroke-width="3"
                            stroke-linecap="round"
                        />
                    </svg>
                ),
            },
            {
                id: "round",
                svg: (color: Color) => (
                    <svg viewBox="-2 -2 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect
                            x="0.5"
                            y="0.5"
                            width="31"
                            height="31"
                            rx="15.5"
                            stroke={color}
                            stroke-width="3"
                            stroke-linecap="round"
                        />
                    </svg>
                ),
            },
            {
                id: "rect",
                svg: (color: Color) => (
                    <svg viewBox="-2 -2 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect
                            x="0.5"
                            y="6.5"
                            width="31"
                            height="20"
                            rx="1.5"
                            stroke={color}
                            stroke-width="3"
                            stroke-linecap="round"
                        />
                    </svg>
                ),
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

    function areaTilingOptions() {
        const areasSelected = L.view(focusedItems, (items) =>
            items.filter((i: Item): i is Container => i.type === "container"),
        )
        return L.view(areasSelected, (areas) =>
            areas.length !== 1
                ? []
                : [
                      <div className="area-options">
                          <span className="icon tile" onClick={() => packItemsInsideContainer(areas[0])} />
                      </div>,
                  ],
        )

        function packItemsInsideContainer(i: Container) {
            const packResult = packItems(i, board.get())

            if (!packResult.ok) {
                console.error("Packing container failed: " + packResult.error)
                return
            }

            dispatch({ action: "item.update", boardId: board.get().id, items: packResult.packedItems })
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
                          <span className="icon" onClick={increaseFont}>
                              <svg viewBox="0 -3 25 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path
                                      d="M7.11072 0.959999H8.93472L15.8947 18H13.5907L11.5747 13.008H4.42272L2.43072 18H0.126719L7.11072 0.959999ZM11.0947 11.328L8.02272 3.456L4.85472 11.328H11.0947ZM24.9129 8.616V10.344H22.0809V13.416H20.1609V10.344H17.3289V8.616H20.1609V5.544H22.0809V8.616H24.9129Z"
                                      fill="black"
                                  />
                              </svg>
                          </span>
                          <span className="icon" onClick={decreaseFont}>
                              <svg viewBox="0 -4 25 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path
                                      d="M5.01913 0.639999H6.23513L10.8751 12H9.33913L7.99513 8.672H3.22713L1.89913 12H0.363125L5.01913 0.639999ZM7.67513 7.552L5.62713 2.304L3.51513 7.552H7.67513ZM12.0553 8.272V6.992H16.7753V8.272H12.0553Z"
                                      fill="black"
                                  />
                              </svg>
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
