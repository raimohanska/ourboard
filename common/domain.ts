import * as uuid from "uuid";

export type Id = string
export type ISOTimeStamp = string

export type BoardInfo = {
    id: Id,
    name: string,
}

export type Board = BoardInfo & {
    items: Item[]
}

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

export type PostIt = { id: string; type: "note"; text: string; color: Color } & ItemBounds;
export type Image = { id: string; type: "image"; assetId: string } & ItemBounds;
export type Item = PostIt | Image

export type AppEvent = BoardItemEvent | AddBoard | JoinBoard | AckJoinBoard | JoinedBoard | InitBoard | CursorMove | CursorPositions;
export type BoardItemEvent = AddPostIt | UpdatePostIt | DeletePostIt
export type AddPostIt = { action: "item.add", boardId: Id, item: Item };
export type UpdatePostIt = { action: "item.update", boardId: Id, item: Item };
export type DeletePostIt = { action: "item.delete", boardId: Id, itemId: Id };
export type AddBoard = { action: "board.add", boardId: Id, name: string }
export type JoinBoard = { action: "board.join", boardId: Id }
export type AckJoinBoard = { action: "board.join.ack", boardId: Id } & UserSessionInfo
export type JoinedBoard = { action: "board.joined", boardId: Id } & UserSessionInfo
export type InitBoard = { action: "board.init", board: Board }
export type CursorMove = { action: "cursor.move", position: CursorPosition, boardId: Id }

export type UserSessionInfo = { userId: string, nickname: string }

export const CURSOR_POSITIONS_ACTION_TYPE = "c" as const;
export type CursorPositions = { action: typeof CURSOR_POSITIONS_ACTION_TYPE, p: Record<Id, UserCursorPosition> }


export const exampleBoard: Board = {
    id: "default",
    name: "Test Board",
    items: [
        newPostIt("Hello", "pink", 10, 5),
        newPostIt("World", "cyan", 20, 10),
        newPostIt("Welcome", "cyan", 5, 14)
    ]
}

export function createBoard(name: string): Board {
    const id = uuid.v4()
    return { id: uuid.v4(), name, items: [] } 
}

export function newPostIt(text: string, color: Color = "yellow", x: number = 20, y: number = 20, width: number = 5, height: number = 5): PostIt {
    return { id: uuid.v4(), type: "note", text, color, x, y, width, height }    
}

export function newImage(assetId: string, x: number = 20, y: number = 20, width: number = 5, height: number = 5): Image {
    return { id: uuid.v4(), type: "image", assetId, x, y, width, height }
}

export function getCurrentTime(): ISOTimeStamp {
    return new Date().toISOString()
}