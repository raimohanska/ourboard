import { Board, Item } from "../../../common/src/domain"
import { containedBy } from "./geometry"

export function maybeChangeContainer(item: Item, b: Board): Item | undefined {
    const currentContainer = item.containerId && b.items.find((i) => i.id === item.containerId)
    if (currentContainer && containedBy(item, currentContainer)) return currentContainer
    if (item.type === "container") return undefined
    return b.items.find((i) => i.type === "container" && i.id !== item.id && containedBy(item, i))
}

export function withCurrentContainer(item: Item, b: Board): Item {
    const newContainer = maybeChangeContainer(item, b)
    const containerId = newContainer ? newContainer.id : undefined

    return { ...item, containerId }
}
