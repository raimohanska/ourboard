import { Connection, Item } from "../../../common/src/domain"

export interface ItemPermissions {
    canChangeFont: boolean
    canChangeShapeAndColor: boolean
    canChangeTextAlign: boolean
    canMove: boolean
    canLock: boolean
    canUnlock: boolean
}
export interface ConnectionPermissions {
    canMove: boolean
    canChangeShapeAndColor: boolean
    canLock: boolean
    canUnlock: boolean
}

export function anyItemHasPermission(items: Item[], f: (p: ItemPermissions) => boolean): boolean {
    return items.some((i) => f(getItemPermissions(i)))
}

export function anyConnectionHasPermission(items: Connection[], f: (p: ConnectionPermissions) => boolean): boolean {
    return items.some((i) => f(getConnectionPermissions(i)))
}

export function getItemPermissions(item: Item): ItemPermissions {
    return {
        canChangeFont: !item.locked,
        canChangeShapeAndColor: !item.locked,
        canChangeTextAlign: !item.locked,
        canMove: !item.locked,
        canLock: !item.locked,
        canUnlock: item.locked === "locked",
    }
}
export function getConnectionPermissions(connection: Connection): ConnectionPermissions {
    return {
        canMove: !connection.locked,
        canChangeShapeAndColor: !connection.locked,
        canLock: !connection.locked,
        canUnlock: connection.locked === "locked",
    }
}
