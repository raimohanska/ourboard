import { Board, Container, Item } from "../../../common/domain";
import { Dispatch } from "./board-store";
import { containedBy } from "./geometry";

// Todo remove this
export function maybeAddToContainer(item: Item, b: Board, dispatch: Dispatch) {
    if (item.type !== "container") {
        const currentContainer = item.containerId && b.items.find((i): i is Container => i.type === "container" && item.containerId == i.id)
        if (currentContainer && containedBy(item, currentContainer)) return

        const newContainer = b.items.find((i): i is Container => i.type === "container" && containedBy(item, i))
        if (newContainer != currentContainer) {
            dispatch({ action: "item.update", boardId: b.id, items: [{...item, containerId: newContainer?.id }] })
        }
    }    
}

export function withCurrentContainer(item: Item, b: Board) {
    if (item.type === "container") return item

    const currentContainer = item.containerId && b.items.find((i): i is Container => i.type === "container" && item.containerId == i.id)
    if (currentContainer && containedBy(item, currentContainer)) return item

    const newContainer = b.items.find((i): i is Container => i.type === "container" && containedBy(item, i))
    if (!newContainer) {
        const newItem = { ...item }
        delete newItem.containerId
        return newItem
    }

    return { ...item, containerId: newContainer.id }
}