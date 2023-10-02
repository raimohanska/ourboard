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

let testBoard = createTestBoard()
let itemsArray = Object.values(testBoard.items) as Note[]

console.time("10000 item.updates on a 1000 item board")
for (let i = 0; i < 10000; i++) {
    const item = itemsArray[i % itemsArray.length]
    ;[testBoard] = boardReducer(testBoard, {
        boardId: testBoard.id,
        action: "item.update",
        items: [
            {
                ...item,
                text: "Hello world",
            },
        ],
    })
}
console.timeEnd("10000 item.updates on a 1000 item board")

testBoard = createTestBoard()
itemsArray = Object.values(testBoard.items) as Note[]

console.time("1000 item.adds on a 1000 item board")
for (let i = 0; i < 1000; i++) {
    const item = newNote("foo")
    ;[testBoard] = boardReducer(testBoard, {
        boardId: testBoard.id,
        action: "item.add",
        items: [item],
        connections: [],
    })
}
console.timeEnd("1000 item.adds on a 1000 item board")

testBoard = createTestBoard()
itemsArray = Object.values(testBoard.items) as Note[]

console.time("10000 item.moves on a 1000 item board")
for (let i = 0; i < 10000; i++) {
    const item = itemsArray[i % itemsArray.length]
    ;[testBoard] = boardReducer(testBoard, {
        boardId: testBoard.id,
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
console.timeEnd("10000 item.moves on a 1000 item board")
