import { BoardStore } from "./board-store"
import * as L from "lonna"
import { EventFromServer, UIEvent, EventWrapper, Id, createBoard, newNote, Board } from "../../../common/src/domain"
import { UserSessionState } from "./user-session-store"
import { LocalStorageBoard } from "./board-local-store"
import { sleep } from "../../../common/src/sleep"

const board0 = createBoard("testboard")
const item1 = newNote("hello1")
const board1 = { ...board0, serial: 1, items: { [item1.id]: item1 } }
const item1_1 = { ...item1, text: "hello1.1" }
const board1_1 = { ...board1, serial: 2, items: { ...board1.items, [item1.id]: item1_1 } }
const item2 = newNote("hello2")
const board2 = { ...board1, serial: 1, items: { ...board1.items, [item2.id]: item2 } }
const item2_1 = { ...item2, text: "hello2.1" }
const board2_1 = { ...board2, serial: 2, items: { ...board2.items, [item1.id]: item1_1 } }
const board2_2 = { ...board2, serial: 2, items: { ...board2.items, [item1.id]: item1_1, [item2.id]: item2_1 } }
const bufferedServerEvents = L.bus<EventFromServer>()

describe("Board Store", () => {
    it("Applies event from server", async () => {
        const store = await initBoardStore(board0)

        bufferedServerEvents.push({
            action: "item.add",
            boardId: board0.id,
            items: [item1],
            serial: 1,
            ...otherUserEventAttributes,
        })

        expect(store.state.get().board).toEqual(board1)
        expect(store.state.get().serverShadow).toEqual(store.state.get().board)
    })

    it("Applies local event", async () => {
        const store = await initBoardStore(board0)

        // 1. Event applied locally, serverShadow and serial unchanged
        store.dispatch({ action: "item.add", boardId: board0.id, items: [item1] })
        expect(store.state.get().board).toEqual({ ...board0, serial: 0, items: { [item1.id]: item1 } })
        expect(store.state.get().serverShadow).toEqual(board0)

        // 2. Ack from server, update serverShadow and serial
        bufferedServerEvents.push({ action: "ack", ackId: "", serials: { [board0.id]: 1 } })
        expect(store.state.get().board).toEqual(board1)
        expect(store.state.get().serverShadow).toEqual(store.state.get().board)
    })

    it.only("Rebases local event when remote event arrives before ack", async () => {
        const store = await initBoardStore(board1)
        // 1. Event applied locally, serverShadow and serial unchanged
        store.dispatch({ action: "item.add", boardId: board0.id, items: [item2] })
        expect(store.state.get().board).toEqual(board2)
        expect(store.state.get().serverShadow).toEqual(board1)
        expect(store.state.get().queue.length).toEqual(0)
        expect(store.state.get().sent.length).toEqual(1)

        // 2. Second local event gets queued, not sent to server before ack
        store.dispatch({ action: "item.update", boardId: board0.id, items: [item2_1] })
        expect(store.state.get().board).toEqual({ ...board2, items: { ...board2.items, [item2.id]: item2_1 } })
        expect(store.state.get().serverShadow).toEqual(board1)
        expect(store.state.get().queue.length).toEqual(1)
        expect(store.state.get().sent.length).toEqual(1)

        // 3. Event from server applied to serverShadow and locally, local event still unapplied to serverShadow
        bufferedServerEvents.push({
            action: "item.update",
            boardId: board0.id,
            items: [{ ...item1, text: "hello1.1" }],
            serial: 2,
            ...otherUserEventAttributes,
        })
        expect(store.state.get().board).toEqual(board2_2)
        expect(store.state.get().serverShadow).toEqual(board1_1)

        // 4. Ack from server, update serverShadow and serial for the first local event
        bufferedServerEvents.push({ action: "ack", ackId: "", serials: { [board0.id]: 3 } })
        expect(store.state.get().board).toEqual({ ...board2_2, serial: 3 })
        expect(store.state.get().serverShadow).toEqual({ ...board2_1, serial: 3 })
        expect(store.state.get().queue.length).toEqual(0)
        expect(store.state.get().sent.length).toEqual(1)

        // 5. Ack from server, update for the second local event
        bufferedServerEvents.push({ action: "ack", ackId: "", serials: { [board0.id]: 4 } })
        expect(store.state.get().board).toEqual({ ...board2_2, serial: 4 })
        expect(store.state.get().serverShadow).toEqual(store.state.get().board)
        expect(store.state.get().queue.length).toEqual(0)
        expect(store.state.get().sent.length).toEqual(0)
    })
})

// TODO: test diff init
// TODO: test going offline, resync

const otherUserEventAttributes = { user: { userType: "unidentified", nickname: "joe" }, timestamp: "0" } as const

async function waitForBackgroundJobs() {
    await sleep(10)
}

async function initBoardStore(initialBoard: Board) {
    const boardId = L.constant(initialBoard.id)
    const connected = L.atom(true)
    let sentEvents: (UIEvent | EventWrapper)[] = []
    const send = (x: UIEvent | EventWrapper) => sentEvents.push(x)
    const sessionInfo = L.atom<UserSessionState>({
        status: "logging-in-local",
        sessionId: "",
        nickname: "",
    })

    const connection = {
        connected,
        send,
        bufferedServerEvents,
        sentUIEvents: null as any, // not used by BoardStore
    }

    const localStore = {
        getInitialBoardState: async (boardId: Id): Promise<LocalStorageBoard | undefined> => {
            return undefined
        },
        clearBoardState: async (boardId: Id) => {},
        clearAllPrivateBoards: async () => {},
        storeBoardState: async (newState: LocalStorageBoard) => {},
    }

    const store = BoardStore(boardId, connection, sessionInfo, localStore)

    expect(store.state.get().board).toEqual(undefined)
    expect(store.state.get().offline).toEqual(true)
    expect(store.state.get().queue).toEqual([])
    expect(store.state.get().sent).toEqual([])
    expect(store.state.get().serverShadow).toEqual(undefined)
    expect(store.state.get().status).toEqual("none")

    expect(sentEvents).toEqual([])

    await waitForBackgroundJobs()

    sessionInfo.set({ status: "anonymous", nickname: "", sessionId: "", loginSupported: false })

    await waitForBackgroundJobs()

    expect(sentEvents).toEqual([
        {
            action: "board.join",
            boardId: board0.id,
            initAtSerial: undefined,
        },
    ])

    bufferedServerEvents.push({ action: "board.init", board: initialBoard, recentEvents: [] })

    await waitForBackgroundJobs()

    expect(store.state.get().board).toEqual(initialBoard)
    expect(store.state.get().serverShadow).toEqual(initialBoard)

    return store
}
