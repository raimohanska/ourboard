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

export type Color = string;
export type PostIt = { id: string; text: string; color: Color; x: number; y: number };

export type AppEvent = AddBoard | AddPostIt | UpdatePostIt | JoinBoard | InitBoard;
export type AddPostIt = { action: "item.add", boardId: Id, item: PostIt };
export type UpdatePostIt = { action: "item.update", boardId: Id, item: PostIt };
export type AddBoard = { action: "board.add", boardId: Id, name: string }
export type JoinBoard = { action: "board.join", boardId: Id }
export type InitBoard = { action: "board.init", board: Board }


export const exampleBoard: Board = {
    id: "83uqofejvöij",
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