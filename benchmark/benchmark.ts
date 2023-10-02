import { uniqueId } from "lodash"
import { arrayToRecordById } from "../common/src/arrays"
import { boardReducer } from "../common/src/board-reducer"
import { Board, Item, Note, newNote } from "../common/src/domain"

type Foo = Board

function createRandomItems(count: number): Item[] {
    const items: Item[] = []
    for (let i = 0; i < count; i++) {
        items.push({
            id: uniqueId(),
            type: "note",
            color: "yellow",
            height: 100,
            width: 100,
            x: Math.random() * 10000,
            y: Math.random() * 10000,
            z: 0,
            shape: "square",
            text: "Hello world",
        })
    }
    return items
}

function createTestBoard(size = 1000): Board {
    return {
        id: uniqueId(),
        height: 10000,
        width: 10000,
        serial: 0,
        name: "Bigass board",
        items: arrayToRecordById(createRandomItems(size)),
        connections: [],
    }
}

let testBoards = Array.from({ length: 100 }, () => {
    const board = createTestBoard(100)
    const items = Object.values(board.items) as Note[]
    return {
        board,
        items,
    }
})

console.time("10000 item.updates on a randomly picked 100 item board")
for (let i = 0; i < 10000; i++) {
    let randomBoard = testBoards[Math.floor(Math.random() * testBoards.length)]
    // const itemsArray = Object.values(randomBoard.items) as Note[]
    const item = randomBoard.items[i % randomBoard.items.length]
    ;[randomBoard.board] = boardReducer(randomBoard.board, {
        boardId: randomBoard.board.id,
        action: "item.update",
        items: [
            {
                ...item,
                text: "Hello world",
            },
        ],
    })
}
console.timeEnd("10000 item.updates on a randomly picked 100 item board")

testBoards = Array.from({ length: 100 }, () => {
    const board = createTestBoard(100)
    const items = Object.values(board.items) as Note[]
    return {
        board,
        items,
    }
})

console.time("10000 item.adds on a randomly picked 100 item board")
for (let i = 0; i < 10000; i++) {
    const randomBoard = testBoards[Math.floor(Math.random() * testBoards.length)]
    const item = newNote("foo")
    ;[randomBoard.board] = boardReducer(randomBoard.board, {
        boardId: randomBoard.board.id,
        action: "item.add",
        items: [item],
        connections: [],
    })
}
console.timeEnd("10000 item.adds on a randomly picked 100 item board")

testBoards = Array.from({ length: 100 }, () => {
    const board = createTestBoard(100)
    const items = Object.values(board.items) as Note[]
    return {
        board,
        items,
    }
})

console.time("10000 item.moves on a randomly picked 100 item board")
for (let i = 0; i < 10000; i++) {
    const randomBoard = testBoards[Math.floor(Math.random() * testBoards.length)]
    const item = randomBoard.items[i % randomBoard.items.length]
    ;[randomBoard.board] = boardReducer(randomBoard.board, {
        boardId: randomBoard.board.id,
        action: "item.move",
        items: [
            {
                ...item,
                x: Math.random() * 10000,
                y: Math.random() * 10000,
            },
        ],
        connections: [],
    })
}
console.timeEnd("10000 item.moves on a randomly picked 100 item board")

console.time("Reference: creating 10000 input objects and doing nothing")
const noop = (item: any) => {
    item.text
}
for (let i = 0; i < 10000; i++) {
    const item = newNote("foo")
    noop({
        ...item,
        text: "Hello world",
    })
}
console.timeEnd("Reference: creating 10000 input objects and doing nothing")
