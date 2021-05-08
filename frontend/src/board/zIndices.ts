import { Item } from "../../../common/src/domain"

export const Z_CONTAINERS_UP_TO = 1000000
export const Z_CONNECTIONS = 200000000
export const Z_ITEMS_FROM = Z_CONTAINERS_UP_TO + 10

export function itemZIndex(item: Item) {
    return Math.floor(1000000 - item.width * item.height * 10) + item.z
}
