import { isFullyContainedConnection } from "../../../common/src/connection-utils"
import { Board, Connection, Id, Item } from "../../../common/src/domain"
import { containedBy } from "../../../common/src/geometry"

export function maybeChangeContainerForItem(item: Item, items: Record<Id, Item>): Item | undefined {
    const candidates = Object.values(items)
        .filter((i) => i.type === "container" && i.id !== item.id && containedBy(item, i)) // contain the item coordinate-wise
        .sort((a, b) => (containedBy(b, a) ? 1 : -1)) // most innermost first (containers last)

    return candidates[0]
}

export function maybeChangeContainerForConnection(connection: Connection, items: Record<Id, Item>): Item | undefined {
    const candidates = Object.values(items)
        .filter((i) => isFullyContainedConnection(connection, i, items)) // contains connection start and endpoints
        .sort((a, b) => (containedBy(b, a) ? 1 : -1)) // most innermost first (containers last)

    return candidates[0]
}

export function withCurrentContainer(item: Item, b: Board): Item {
    const newContainer = maybeChangeContainerForItem(item, b.items)
    const containerId = newContainer ? newContainer.id : undefined

    return { ...item, containerId }
}
