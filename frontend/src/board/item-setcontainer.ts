import { Board, Item } from "../../../common/src/domain"
import { containedBy } from "./geometry"

export function maybeChangeContainer(item: Item, b: Board): Item | undefined {
    const candidates = Object.values(b.items)
        .filter((i) => i.type === "container" && i.id !== item.id && containedBy(item, i)) // contain the item coordinate-wise
        .sort((a, b) => (containedBy(b, a) ? 1 : -1)) // most innermost first (containers last)

    return candidates[0]
}

export function withCurrentContainer(item: Item, b: Board): Item {
    const newContainer = maybeChangeContainer(item, b)
    const containerId = newContainer ? newContainer.id : undefined

    return { ...item, containerId }
}
