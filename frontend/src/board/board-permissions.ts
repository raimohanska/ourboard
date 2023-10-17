import { Connection, Item } from "../../../common/src/domain"

export const canChangeFont = (item: Item) => !item.locked
export const canChangeShapeAndColor = (item: Item | Connection) => !item.locked
export const canChangeTextAlign = (item: Item) => !item.locked
export const canMove = (item: Item | Connection) => !item.locked
export const canLock = (item: Item | Connection) => !item.locked
export const canUnlock = (item: Item | Connection) => item.locked === "locked"
