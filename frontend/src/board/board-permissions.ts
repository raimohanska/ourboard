import { Connection, Item } from "../../../common/src/domain"

export const canChangeFont: BoardPermission = (item) => !item.locked
export const canChangeShapeAndColor: BoardPermission = (item): boolean => !item.locked
export const canChangeTextAlign: BoardPermission = (item): boolean => !item.locked
export const canChangeTextFormat: BoardPermission = (item): boolean => !item.locked
export const canChangeVisibility: BoardPermission = (item): boolean => !item.locked
export const canChangeText: BoardPermission = (item): boolean => true
export const canMove: BoardPermission = (item): boolean => !item.locked
export const canLock: BoardPermission = (item): boolean => !item.locked
export const canUnlock: BoardPermission = (item): boolean => item.locked === "locked"
export const canDelete: BoardPermission = (item): boolean => !item.locked

export type BoardPermission = (item: Item | Connection) => boolean
export const nullablePermission = (permission: BoardPermission) => (item: Item | Connection | null) =>
    item === null ? false : permission(item)
