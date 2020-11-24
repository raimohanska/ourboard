import { Board, Container, Id, Item } from "../../../common/src/domain";
import { containedBy } from "./geometry";

export function maybeChangeContainer(item: Item, b: Board): Id | undefined {
    if (item.type !== "container") {
        const currentContainer = item.containerId && b.items.find((i): i is Container => i.type === "container" && item.containerId == i.id)
        if (currentContainer && containedBy(item, currentContainer)) return item.containerId

        const newContainer = b.items.find((i): i is Container => i.type === "container" && containedBy(item, i))
        
        return newContainer ? newContainer.id : undefined
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