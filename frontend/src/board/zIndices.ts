import { Item } from "../../../common/src/domain"

export function itemZIndex(item: Item) {
    if (item.type === "container") {
        return Math.floor(1000000 - item.width * item.height)
    }
    return item.z + 1000000
}
