import { Connection, Item } from "../../../common/src/domain"

export interface ItemPermissions {
    canChangeFont: boolean
    canChangeShapeAndColor: boolean
    canChangeTextAlign: boolean
    canMove: boolean
    canLock: boolean
}
export interface ConnectionPermissions {
    canMove: boolean
    canChangeShapeAndColor: boolean
    canLock: boolean
}

export function anyItemHasPermission(items: Item[], f: (p: ItemPermissions) => boolean): boolean {
    return items.some((i) => f(getItemPermissions(i)))
}

export function anyConnectionHasPermission(items: Connection[], f: (p: ConnectionPermissions) => boolean): boolean {
    return items.some((i) => f(getConnectionPermissions(i)))
}

export function getItemPermissions(item: Item): ItemPermissions {
    return {
        canChangeFont: false,
        canChangeShapeAndColor: false,
        canChangeTextAlign: false,
        canMove: false,
        canLock: true,
    }
}
export function getConnectionPermissions(connection: Connection): ConnectionPermissions {
    return {
        canMove: false,
        canChangeShapeAndColor: false,
        canLock: true,
    }
}
