import { h } from "harmaja"
import * as L from "lonna"
import _ from "lodash"
import { Board, Color, findItem, isColoredItem, Item, isTextItem, Note } from "../../../common/src/domain"
import { Dispatch } from "../store/user-session-store"
import { NOTE_COLORS } from "./PaletteView"
import { BoardFocus } from "./board-focus"

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

    const focusedItems = L.view(focus, board, (f) => {
        const itemIds = itemIdsForContextMenu(f)
        return itemIds.flatMap((id) => findItem(board.get())(id) || [])
    })

    const focusItem = L.view(focusedItems, (items) => {
        if (items.length === 0) return null
        const minY = _.min(items.map((i) => i.y)) || 0
        const maxY = _.max(items.map((i) => i.y + i.height)) || 0
        return {
            x: _.mean(items.map((i) => i.x)),
            y: minY > 3 ? minY : maxY + 4,
        }
    })

    const widgetCreators = [menuAlignments(), menuColors(), menuFontSizes()]
    const activeWidgets = L.view(L.combineAsArray(widgetCreators), (arrays) => arrays.flat())

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

    function menuAlignments() {
        const hasItemsToAlign = L.view(focusedItems, (items) => items.length > 1)
        const hasItemsToDistribute = L.view(focusedItems, (items) => items.length > 2)

        return L.combine(hasItemsToAlign, hasItemsToDistribute, (hasItemsToAlign, hasItemsToDistribute) => {
            return !hasItemsToAlign
                ? []
                : [
                      <div className="align">
                          {hasItemsToAlign && (
                              <div className="icon-group">
                                  <span
                                      className="icon align_horizontal_left"
                                      onClick={() => moveFocusedItems("x", getMinCoordinate)}
                                  />
                                  <span
                                      className="icon align_horizontal_center"
                                      onClick={() => moveFocusedItems("x", getCenterCoordinate)}
                                  />
                                  <span
                                      className="icon align_horizontal_right"
                                      onClick={() => moveFocusedItems("x", getMaxCoordinate)}
                                  />
                              </div>
                          )}

                          {hasItemsToAlign && (
                              <div className="icon-group">
                                  <span
                                      className="icon align_vertical_top"
                                      onClick={() => moveFocusedItems("y", getMinCoordinate)}
                                  />
                                  <span
                                      className="icon align_vertical_center"
                                      onClick={() => moveFocusedItems("y", getCenterCoordinate)}
                                  />
                                  <span
                                      className="icon align_vertical_bottom"
                                      onClick={() => moveFocusedItems("y", getMaxCoordinate)}
                                  />
                              </div>
                          )}

                          {hasItemsToDistribute && (
                              <div className="icon-group">
                                  <span
                                      className="icon horizontal_distribute"
                                      onClick={() => moveFocusedItems("x", getDistributedCoordinate)}
                                  />
                                  <span
                                      className="icon vertical_distribute"
                                      onClick={() => moveFocusedItems("y", getDistributedCoordinate)}
                                  />
                              </div>
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
                  ]
        })

        function setColor(color: Color) {
            const b = board.get()

            // To remember color selection for creating new notes.
            latestNote.modify((n) => ({ ...n, color }))

            const updated = coloredItems.get().map((item) => ({ ...item, color }))
            dispatch({ action: "item.update", boardId: b.id, items: updated })
        }
    }

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
}
