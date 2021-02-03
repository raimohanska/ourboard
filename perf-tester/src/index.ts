import * as io from "socket.io-client";
import { boardStore } from "../../frontend/src/store/board-store";
import * as G from "../../frontend/src/board/geometry"
import * as L from "lonna"
import { newNote } from "../../common/src/domain";

function createTester(nickname: string) {
    const center =  {x: 10 + Math.random() * 60, y: 10 + Math.random() * 40}
    const radius = 10 + Math.random() * 10
    const increment = Math.random() * 4 - 2
    const boardId = "default"
    const socket = io("http://localhost:1337");    
    const storage = {
        nickname
    } as any
    const store = boardStore(socket, boardId, storage)    
    store.dispatch({ action: "board.join", boardId })
    let counter = 0
    let unsub = store.events.forEach(e => {
        if (e.action === "board.init") {
            unsub()
            setInterval(() => {
                counter+=increment
                const position = G.add(center, {x: radius * Math.sin(counter / 100), y: radius * Math.cos(counter / 100)})
                store.dispatch({ action: "cursor.move", position, boardId })
                if (Math.random() < 0.01) store.dispatch({ action: "item.add", boardId, items: [
                    newNote("NOTE " + counter, "black", position.x, position.y)
                ] })
            }, 1000 / fps)        
        }
    })    
}

const userCount = 100
const fps = 10
for (let i = 0; i < userCount; i++) {
    createTester("perf-tester-" + (i + 1))
}