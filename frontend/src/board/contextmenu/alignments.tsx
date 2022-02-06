import { h, HarmajaOutput } from "harmaja"
import _ from "lodash"
import * as L from "lonna"
import { Board, Item } from "../../../../common/src/domain"
import {
    AlignHorizontalLeftIcon,
    AlignVerticalTopIcon,
    HorizontalDistributeIcon,
    VerticalDistributeIcon,
} from "../../components/Icons"
import { Dispatch } from "../../store/board-store"

type Props = {
    focusedItems: L.Property<Item[]>
    board: L.Property<Board>
    dispatch: Dispatch
    submenu: L.Atom<HarmajaOutput | null>
}

function createSubMenu(props: Props) {
    return <div className="submenu">{alignmentsSubMenu(props)}</div>
}

export function alignmentsMenu(props: Props) {
    // TODO duplication
    const hasItemsToAlign = L.view(props.focusedItems, (items) => items.length > 1)
    const hasItemsToDistribute = L.view(props.focusedItems, (items) => items.length > 2)
    return L.combine(hasItemsToAlign, hasItemsToDistribute, (hasItemsToAlign, hasItemsToDistribute) => {
        return !hasItemsToAlign && !hasItemsToDistribute
            ? []
            : [
                  <div className="align">
                      {hasItemsToAlign && (
                          <span
                              className="icon"
                              onClick={() => props.submenu.modify((v) => (v ? null : createSubMenu(props)))}
                              title="Align left"
                          >
                              <AlignHorizontalLeftIcon />
                          </span>
                      )}
                  </div>,
              ]
    })
}

export function alignmentsSubMenu({ board, focusedItems, dispatch }: Props) {
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
