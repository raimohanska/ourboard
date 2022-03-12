import { h, HarmajaOutput } from "harmaja"
import _ from "lodash"
import * as L from "lonna"
import { Board, Item } from "../../../../common/src/domain"
import {
    AlignHorizontalCenterIcon,
    AlignHorizontalLeftIcon,
    AlignHorizontalRightIcon,
    AlignVerticalBottomIcon,
    AlignVerticalCenterIcon,
    AlignVerticalTopIcon,
    HorizontalDistributeIcon,
    VerticalDistributeIcon,
} from "../../components/Icons"
import { Dispatch } from "../../store/board-store"
import { SubmenuProps } from "./ContextMenuView"

const createSubMenuByAxis = (axis: Axis) => (props: SubmenuProps) => {
    return <div className={`submenu alignment ${axis}`}>{alignmentsSubMenu(axis, props)}</div>
}

export function alignmentsMenu(axis: Axis, props: SubmenuProps) {
    // TODO duplication
    const hasItemsToAlign = L.view(props.focusedItems, (items) => items.items.length > 1)
    const hasItemsToDistribute = L.view(props.focusedItems, (items) => items.items.length > 2)
    const createSubmenu = createSubMenuByAxis(axis)
    return L.combine(hasItemsToAlign, hasItemsToDistribute, (hasItemsToAlign, hasItemsToDistribute) => {
        return !hasItemsToAlign && !hasItemsToDistribute
            ? []
            : [
                  <div className="icon-group align">
                      {hasItemsToAlign && (
                          <span
                              className="icon"
                              onClick={() => props.submenu.modify((v) => (v === createSubmenu ? null : createSubmenu))}
                              title="Align left"
                          >
                              {axis == "x" ? <AlignHorizontalLeftIcon /> : <AlignVerticalTopIcon />}
                          </span>
                      )}
                  </div>,
              ]
    })
}

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

function moveFocusedItems(
    axis: Axis,
    getCoordinateToSetToItem: GetCoordinate,
    { board, focusedItems, dispatch }: SubmenuProps,
) {
    const b = board.get()

    const itemsToMove = focusedItems.get().items
    const min = _.min(itemsToMove.map((i) => i[axis])) || 0
    const max = _.max(itemsToMove.map((i) => i[axis] + getItemSize(i, axis))) || 0
    const totalSumOfSizes = _.sum(itemsToMove.map((i) => getItemSize(i, axis), 0))

    let sumOfPreviousSizes = 0
    const updatedItems = focusedItems
        .get()
        .items.sort((item1, item2) => item1[axis] - item2[axis])
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

export function alignmentsSubMenu(axis: Axis, props: SubmenuProps) {
    const hasItemsToAlign = L.view(props.focusedItems, (items) => items.items.length > 1)
    const hasItemsToDistribute = L.view(props.focusedItems, (items) => items.items.length > 2)

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
            : axis == "x"
            ? [
                  <div className="icon-group align">
                      {hasItemsToAlign && (
                          <span
                              className="icon"
                              onClick={() => moveFocusedItems("x", getMinCoordinate, props)}
                              title="Align left"
                          >
                              <AlignHorizontalLeftIcon />
                          </span>
                      )}

                      {hasItemsToAlign && (
                          <span
                              className="icon"
                              onClick={() => moveFocusedItems("x", getCenterCoordinate, props)}
                              title="Align left"
                          >
                              <AlignHorizontalCenterIcon />
                          </span>
                      )}

                      {hasItemsToAlign && (
                          <span
                              className="icon"
                              onClick={() => moveFocusedItems("x", getMaxCoordinate, props)}
                              title="Align left"
                          >
                              <AlignHorizontalRightIcon />
                          </span>
                      )}

                      {hasItemsToDistribute && (
                          <span
                              className="icon"
                              title="Distribute evenly"
                              onClick={() => moveFocusedItems("x", getDistributedCoordinate, props)}
                          >
                              <HorizontalDistributeIcon />
                          </span>
                      )}
                  </div>,
              ]
            : [
                  <div className="icon-group align">
                      {hasItemsToAlign && (
                          <span
                              className="icon"
                              title="Align top"
                              onClick={() => moveFocusedItems("y", getMinCoordinate, props)}
                          >
                              <AlignVerticalTopIcon />
                          </span>
                      )}

                      {hasItemsToAlign && (
                          <span
                              className="icon"
                              title="Align top"
                              onClick={() => moveFocusedItems("y", getCenterCoordinate, props)}
                          >
                              <AlignVerticalCenterIcon />
                          </span>
                      )}

                      {hasItemsToAlign && (
                          <span
                              className="icon"
                              title="Align top"
                              onClick={() => moveFocusedItems("y", getMaxCoordinate, props)}
                          >
                              <AlignVerticalBottomIcon />
                          </span>
                      )}
                      {hasItemsToDistribute && (
                          <span
                              className="icon"
                              title="Distribute evenly vertically"
                              onClick={() => moveFocusedItems("y", getDistributedCoordinate, props)}
                          >
                              <VerticalDistributeIcon />
                          </span>
                      )}
                  </div>,
              ]
    })
}
