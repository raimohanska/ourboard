import { h } from "harmaja"
import * as L from "lonna"
import { Board, Container, findItem, isContainer, Item } from "../../../../common/src/domain"
import { TileIcon } from "../../components/Icons"
import { Dispatch } from "../../store/board-store"
import { contentRect, organizeItems, packableItems } from "../item-organizer"
import { packItems } from "../item-packer"
import { SubmenuProps } from "./ContextMenuView"

export function areaTilingMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    const packables = L.view(focusedItems, (items) => {
        if (items.items.length === 1) {
            if (isContainer(items.items[0])) return items.items
        }
        if (items.items.length >= 1) {
            const containerIds = new Set(items.items.map((i) => i.containerId))
            if (containerIds.size === 1 && [...containerIds][0]) return items.items
        }
        return []
    })
    return L.view(
        packables,
        (ps) => ps.length > 0,
        (show) =>
            show
                ? [
                      <div className="icon-group area-options">
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
