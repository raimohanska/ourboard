import { BoardStore } from "./board-store"
import * as L from "lonna"
import { EventFromServer, UIEvent, EventWrapper, Id } from "../../../common/src/domain"
import { UserSessionState } from "./user-session-store"
import { LocalStorageBoard } from "./board-local-store"
import { sleep } from "../../../common/src/sleep"

describe("Board Store", () => {
    it("works", async () => {
        const boardId = L.constant("board1")
        const connected = L.atom(true)
        const bufferedServerEvents = L.bus<EventFromServer>()
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

        await sleep(10) // Wait for async

        sessionInfo.set({ status: "anonymous", nickname: "", sessionId: "", loginSupported: false })

        await sleep(10) // Wait for async

        expect(sentEvents).toEqual([
            {
                action: "board.join",
                boardId: "board1",
                initAtSerial: undefined,
            },
        ])
    })
})
