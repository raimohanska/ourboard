import * as uuid from "uuid";

export type Id = string
export type ISOTimeStamp = string

export type BoardInfo = {
    id: Id,
    name: string,
}

export type Board = BoardInfo & {
    items: PostIt[]
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
export type PostIt = { id: string; text: string; color: Color; x: number; y: number };

export type AppEvent = BoardItemEvent | AddBoard | JoinBoard | AckJoinBoard | JoinedBoard | InitBoard | CursorMove | CursorPositions;
export type BoardItemEvent = AddPostIt | UpdatePostIt | DeletePostIt
export type AddPostIt = { action: "item.add", boardId: Id, item: PostIt };
export type UpdatePostIt = { action: "item.update", boardId: Id, item: PostIt };
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
        { id: "1", text: "Hello", color: "pink", x: 10, y: 5 },
        { id: "2", text: "World", color: "cyan", x: 20, y: 10 },
        { id: "3", text: "Welcome", color: "cyan", x: 5, y: 14 }
    ]
}

export function createBoard(name: string): Board {
    const id = uuid.v4()
    return { id: uuid.v4(), name, items: [] } 
}

export function newPostIt(text: string, color: Color = "yellow", x: number = 20, y: number = 20): PostIt {
    return { id: uuid.v4(), text, color, x, y }    
}

export function getCurrentTime(): ISOTimeStamp {
    return new Date().toISOString()
}