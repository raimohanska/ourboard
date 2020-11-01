import * as uuid from "uuid";

export type Id = string
export type ISOTimeStamp = string

export type BoardInfo = {
    id: Id,
    name: string,
}

export type Board = BoardInfo & {
    width: number;
    height: number;
    items: Item[]
}

export const defaultBoardSize = { width: 50, height: 50 }

export interface CursorPosition {
    x: number;
    y: number;
}

export type UserCursorPosition = CursorPosition & {
    userId: Id,
}

export type BoardCursorPositions = Record<Id, UserCursorPosition>;

export type Color = string;

export type ItemBounds = { x: number; y: number, width: number, height: number }

export type Note = { id: string; type: "note"; text: string; color: Color } & ItemBounds;
export type Text = { id: string; type: "text"; text: string } & ItemBounds;
export type Image = { id: string; type: "image"; assetId: string; src?: string } & ItemBounds;
export type Container = { id: string; type: "container"; items: Id[] } & ItemBounds;
export type Item = Note | Text | Image | Container
export type ItemLocks = Record<Id, Id> 

export type AppEvent = BoardItemEvent | AddBoard | JoinBoard | AckJoinBoard | JoinedBoard | InitBoard | CursorMove | SetNickname | CursorPositions | AssetPutUrlRequest | AssetPutUrlResponse | GotBoardLocks;
export type PersistableBoardItemEvent = AddItem | UpdateItem | MoveItem | DeleteItem | BringItemToFront | SetItemContainer
export type BoardItemEvent = PersistableBoardItemEvent | LockItem | UnlockItem
export type AddItem = { action: "item.add", boardId: Id, item: Item };
export type UpdateItem = { action: "item.update", boardId: Id, item: Item };
export type MoveItem = { action: "item.move", boardId: Id, itemId: Id, x: number, y: number };
export type BringItemToFront = { action: "item.front", boardId: Id, itemId: Id };
export type SetItemContainer = { action: "item.setcontainer", boardId: Id, itemId: Id, containerId: Id | null }
export type LockItem = { action: "item.lock", boardId: Id, itemId: Id }
export type UnlockItem = { action: "item.unlock", boardId: Id, itemId: Id }
export type GotBoardLocks = { action: "board.locks", boardId: Id, locks: ItemLocks }
export type DeleteItem = { action: "item.delete", boardId: Id, itemId: Id };
export type AddBoard = { action: "board.add", boardId: Id, name: string }
export type JoinBoard = { action: "board.join", boardId: Id }
export type AckJoinBoard = { action: "board.join.ack", boardId: Id } & UserSessionInfo
export type JoinedBoard = { action: "board.joined", boardId: Id } & UserSessionInfo
export type InitBoard = { action: "board.init", board: Board }
export type CursorMove = { action: "cursor.move", position: CursorPosition, boardId: Id }
export type SetNickname = { action: "nickname.set", nickname: string, userId: string }
export type AssetPutUrlRequest = { "action": "asset.put.request", assetId: string }
export type AssetPutUrlResponse = { "action": "asset.put.response", assetId: string, signedUrl: string }

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

export function newNote(text: string, color: Color = "yellow", x: number = 20, y: number = 20, width: number = 5, height: number = 5): Note {
    return { id: uuid.v4(), type: "note", text, color, x, y, width, height }    
}

export function newText(text: string, x: number = 20, y: number = 20, width: number = 5, height: number = 2): Text {
    return { id: uuid.v4(), type: "text", text, x, y, width, height }    
}

export function newContainer(x: number = 20, y: number = 20, width: number = 30, height: number = 20): Container {
    return { id: uuid.v4(), type: "container", items: [], x, y, width, height }    
}

export function newImage(assetId: string, x: number = 20, y: number = 20, width: number = 5, height: number = 5): Image {
    return { id: uuid.v4(), type: "image", assetId, x, y, width, height }
}

export function getCurrentTime(): ISOTimeStamp {
    return new Date().toISOString()
}

export const isBoardItemEvent = (a: AppEvent): a is BoardItemEvent => a.action.startsWith("item.")

export const isPersistableBoardItemEvent = (bie: BoardItemEvent): bie is PersistableBoardItemEvent => !["item.lock", "item.unlock"].includes(bie.action)