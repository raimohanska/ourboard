import * as uuid from "uuid";
import { boardReducer } from "./state";

export type Id = string
export type ISOTimeStamp = string

export type BoardAttributes = {
    id: Id,
    name: string,
    width: number;
    height: number;
}

export type Board = BoardAttributes & {
    items: Item[]
}

export type BoardStub = Pick<Board, "id" | "name">

export type EventUserInfo = { nickname: string, userType: "unidentified" | "system" }
export type BoardHistoryEntry = { user: EventUserInfo, timestamp: ISOTimeStamp } & PersistableBoardItemEvent
export type BoardWithHistory = { board: Board, history: BoardHistoryEntry[] }
export type CompactBoardHistory = { boardAttributes: BoardAttributes, history: BoardHistoryEntry[] }

export function isFullyFormedBoard(b: Board | BoardStub): b is Board {
    return !!b.id && !!b.name && ["width", "height", "items"].every(prop => prop in b)
}

export const defaultBoardSize = { width: 200, height: 160 }

export interface CursorPosition {
    x: number;
    y: number;
}

export type UserCursorPosition = CursorPosition & {
    userId: Id,
}

export type BoardCursorPositions = Record<Id, UserCursorPosition>;

export type Color = string;

export type ItemBounds = { x: number; y: number, width: number, height: number, z: number }
export type ItemProperties = { id: string, containerId?: string } & ItemBounds

export const ITEM_TYPES = {
    NOTE: "note",
    TEXT: "text",
    IMAGE: "image",
    CONTAINER: "container"
} as const
export type ItemType = typeof ITEM_TYPES[keyof typeof ITEM_TYPES]

export type Note = ItemProperties & { type: typeof ITEM_TYPES.NOTE; text: string; color: Color };
export type Text = ItemProperties & { type: typeof ITEM_TYPES.TEXT; text: string };
export type Image = ItemProperties & { type: typeof ITEM_TYPES.IMAGE; assetId: string; src?: string };
export type Container = ItemProperties & { type: typeof ITEM_TYPES.CONTAINER; text: string; };

export type TextItem = Note | Text | Container
export type Item = TextItem | Image
export type ItemLocks = Record<Id, Id> 

export type EventFromServer = BoardHistoryEntry | TransientBoardItemEvent | OtherAppEvent

export type AppEvent = BoardItemEvent | OtherAppEvent;
export type PersistableBoardItemEvent = AddItem | UpdateItem | MoveItem | DeleteItem | BringItemToFront | BootstrapBoard | RenameBoard
export type TransientBoardItemEvent = LockItem | UnlockItem
export type BoardItemEvent = PersistableBoardItemEvent | TransientBoardItemEvent
export type OtherAppEvent = AddBoard | JoinBoard | AckJoinBoard | JoinedBoard | InitBoard | CursorMove | SetNickname | CursorPositions | AssetPutUrlRequest | AssetPutUrlResponse | GotBoardLocks | Undo | Redo
export type AddItem = { action: "item.add", boardId: Id, items: Item[] };
export type UpdateItem = { action: "item.update", boardId: Id, items: Item[] };
export type MoveItem = { action: "item.move", boardId: Id, items: {id: Id, x: number, y: number, containerId?: Id | undefined}[] };
export type BringItemToFront = { action: "item.front", boardId: Id, itemIds: Id[] };
export type DeleteItem = { action: "item.delete", boardId: Id, itemIds: Id[] };
export type BootstrapBoard = { action: "item.bootstrap", boardId: Id, items: Item[] }
export type LockItem = { action: "item.lock", boardId: Id, itemId: Id }
export type UnlockItem = { action: "item.unlock", boardId: Id, itemId: Id }
export type GotBoardLocks = { action: "board.locks", boardId: Id, locks: ItemLocks }
export type AddBoard = { action: "board.add", payload: Board | BoardStub }
export type JoinBoard = { action: "board.join", boardId: Id }
export type AckJoinBoard = { action: "board.join.ack", boardId: Id } & UserSessionInfo
export type JoinedBoard = { action: "board.joined", boardId: Id } & UserSessionInfo
export type InitBoard = { action: "board.init", board: CompactBoardHistory }
export type RenameBoard = { action: "board.rename", boardId: Id, name: string }
export type CursorMove = { action: "cursor.move", position: CursorPosition, boardId: Id }
export type SetNickname = { action: "nickname.set", nickname: string, userId: string }
export type AssetPutUrlRequest = { "action": "asset.put.request", assetId: string }
export type AssetPutUrlResponse = { "action": "asset.put.response", assetId: string, signedUrl: string }
export type Undo = { action: "undo" }
export type Redo = { action: "redo" }

export type UserSessionInfo = { userId: string, nickname: string }

export const CURSOR_POSITIONS_ACTION_TYPE = "c" as const;
export type CursorPositions = { action: typeof CURSOR_POSITIONS_ACTION_TYPE, p: Record<Id, UserCursorPosition> }


export const exampleBoard: Board = {
    id: "default",
    name: "Test Board",
    items: [
        newNote("Hello", "pink", 10, 5),
        newNote("World", "cyan", 20, 10),
        newNote("Welcome", "cyan", 5, 14)
    ],
    ...defaultBoardSize
}

export function createBoard(name: string): Board {
    const id = uuid.v4()
    return { id: uuid.v4(), name, items: [], ...defaultBoardSize } 
}

export function newNote(text: string, color: Color = "#F5F18D", x: number = 20, y: number = 20, width: number = 5, height: number = 5, z: number = 0): Note {
    return { id: uuid.v4(), type: "note", text, color, x, y, width, height, z }    
}

export function newSimilarNote(note: Note) {
    return newNote("HELLO", note.color, 20, 20, note.width, note.height)
}

export function newText(text: string, x: number = 20, y: number = 20, width: number = 5, height: number = 2, z: number = 0): Text {
    return { id: uuid.v4(), type: "text", text, x, y, width, height, z }    
}

export function newContainer(x: number = 20, y: number = 20, width: number = 30, height: number = 20, z: number = 0): Container {
    return { id: uuid.v4(), type: "container", text: "Unnamed area", x, y, width, height, z }    
}

export function newImage(assetId: string, x: number = 20, y: number = 20, width: number = 5, height: number = 5, z: number = 0): Image {
    return { id: uuid.v4(), type: "image", assetId, x, y, width, height, z }
}

export function getCurrentTime(): ISOTimeStamp {
    return new Date().toISOString()
}

export const isBoardItemEvent = (a: AppEvent): a is BoardItemEvent => a.action.startsWith("item.") || a.action === "board.rename"

export const isPersistableBoardItemEvent = (e: AppEvent): e is PersistableBoardItemEvent => isBoardItemEvent(e) && !["item.lock", "item.unlock"].includes(e.action)

export const isBoardHistoryEntry = (e: AppEvent): e is BoardHistoryEntry => isPersistableBoardItemEvent(e) && !!(e as BoardHistoryEntry).user && !!(e as BoardHistoryEntry).timestamp

export function isSameUser(a: EventUserInfo, b: EventUserInfo) {
    return a.userType == b.userType && a.nickname == b.nickname
}

export function getItemText(i: Item) {
    if (i.type === "image") return ""
    return i.text
}

export function getItemIds(e: BoardHistoryEntry | PersistableBoardItemEvent): Id[] {
    switch (e.action) {
        case "item.front":
        case "item.delete": return e.itemIds
        case "item.move": return e.items.map(i => i.id)
        case "item.update":
        case "item.add": return e.items.map(i => i.id)
        case "item.bootstrap": return e.items.map(i => i.id)
        case "board.rename": return []
    }
}