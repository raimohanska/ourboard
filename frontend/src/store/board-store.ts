import * as L from "lonna"
import { globalScope } from "lonna"
import { foldActions } from "../../../common/src/action-folding"
import { boardHistoryReducer } from "../../../common/src/board-history-reducer"
import { boardReducer } from "../../../common/src/board-reducer"
import {
    Board,
    BoardHistoryEntry,
    BoardStateSyncEvent,
    ClientToServerRequest,
    CURSOR_POSITIONS_ACTION_TYPE,
    defaultBoardSize,
    EventFromServer,
    EventUserInfo,
    isPersistableBoardItemEvent,
    ItemLocks,
    LocalUIEvent,
    PersistableBoardItemEvent,
    TransientBoardItemEvent,
    UIEvent,
    UserCursorPosition,
    UserSessionInfo,
} from "../../../common/src/domain"
import { getInitialBoardState, LocalStorageBoard, storeBoardState } from "./board-local-store"
import MessageQueue from "./message-queue"

export type BoardStore = ReturnType<typeof boardStore>
export type BoardState = {
    status: "none" | "loading" | "ready"
    board: Board | undefined
    history: BoardHistoryEntry[]
    cursors: UserCursorPosition[]
    locks: ItemLocks
    users: UserSessionInfo[]
}

export function boardStore(
    bufferedServerEvents: L.EventStream<EventFromServer>,
    uiEvents: L.EventStream<UIEvent>,
    messageQueue: ReturnType<typeof MessageQueue>,
    userInfo: L.Property<EventUserInfo>,
    sessionId: L.Property<string | null>,
) {
    type BoardStoreEvent =
        | BoardHistoryEntry
        | TransientBoardItemEvent
        | BoardStateSyncEvent
        | LocalUIEvent
        | ClientToServerRequest
    let undoStack: PersistableBoardItemEvent[] = []
    let redoStack: PersistableBoardItemEvent[] = []

    function tagWithUserFromState(e: PersistableBoardItemEvent): BoardHistoryEntry {
        const user: EventUserInfo = userInfo.get()
        return {
            ...e,
            user,
            timestamp: new Date().toISOString(),
        }
    }

    const eventsReducer = (state: BoardState, event: BoardStoreEvent): BoardState => {
        if (event.action === "ui.undo") {
            if (!undoStack.length) return state
            const undoOperation = undoStack.pop()!
            messageQueue.enqueue(undoOperation)
            const [{ board, history }, reverse] = boardHistoryReducer(
                { board: state.board!, history: state.history },
                tagWithUserFromState(undoOperation),
            )
            if (reverse) redoStack = addToStack(reverse, redoStack)
            return { ...state, board, history }
        } else if (event.action === "ui.redo") {
            if (!redoStack.length) return state
            const redoOperation = redoStack.pop()!
            messageQueue.enqueue(redoOperation)
            const [{ board, history }, reverse] = boardHistoryReducer(
                { board: state.board!, history: state.history },
                tagWithUserFromState(redoOperation),
            )
            if (reverse) undoStack = addToStack(reverse, undoStack)
            return { ...state, board, history }
        } else if (isPersistableBoardItemEvent(event)) {
            const [{ board, history }, reverse] = boardHistoryReducer(
                { board: state.board!, history: state.history },
                event,
            )
            if (reverse && event.serial == undefined) {
                // No serial == is local event. TODO: maybe a nicer way to recognize this?
                redoStack = []
                undoStack = addToStack(reverse, undoStack)
            }
            return { ...state, board, history }
        } else if (event.action === "board.init") {
            if ("initAtSerial" in event) {
                console.log("Init at", event.initAtSerial, "with", event.recentEvents.length + " new events")
                const boardId = event.boardAttributes.id
                const localState = getInitialBoardState(boardId)
                if (!localState) throw Error(`Trying to init at ${event.initAtSerial} without local board state`)
                const localSerial = localState.boardWithHistory.board.serial
                if (localSerial != event.initAtSerial)
                    throw Error(`Trying to init at ${event.initAtSerial} with local board state at ${localSerial}`)

                const initialBoard = { ...localState.boardWithHistory.board, ...event.boardAttributes } as Board
                const board = event.recentEvents.reduce((b, e) => boardReducer(b, e)[0], initialBoard)
                return {
                    ...state,
                    status: "ready",
                    board,
                    history: localState.boardWithHistory.history.concat(event.recentEvents),
                }
            } else {
                console.log("Init as new board")
                return { ...state, status: "ready", board: event.board, history: [] }
            }
        } else if (event.action === "board.serial.ack") {
            return { ...state, board: state.board ? { ...state.board, serial: event.serial } : state.board }
        } else if (event.action === "board.locks") {
            return { ...state, locks: event.locks }
        } else if (event.action === CURSOR_POSITIONS_ACTION_TYPE) {
            const otherCursors = { ...event.p }
            const session = sessionId.get() // TODO: this should be done by the server indeed
            session && delete otherCursors[session]
            console.log(session)
            const cursors = Object.values(otherCursors)
            return { ...state, cursors }
        } else if (event.action === "board.joined") {
            return { ...state, users: state.users.concat(event) }
        } else if (event.action === "userinfo.set") {
            const users = state.users.map((u) => (u.sessionId === event.sessionId ? event : u))
            return { ...state, users }
        } else if (event.action === "board.join") {
            return {
                ...initialState,
                status: "loading",
                board: { id: event.boardId, name: "", ...defaultBoardSize, items: [], serial: 0 },
            }
        } else {
            // Ignore other events
            return state
        }
    }

    const initialState = {
        status: "none" as const,
        board: undefined,
        history: [],
        cursors: [],
        locks: {},
        users: [],
    }

    function tagWithUser(e: UIEvent): BoardHistoryEntry | ClientToServerRequest | LocalUIEvent {
        return isPersistableBoardItemEvent(e) ? tagWithUserFromState(e) : e
    }
    const userTaggedLocalEvents = L.view(uiEvents, tagWithUser)
    const events = L.merge(userTaggedLocalEvents, bufferedServerEvents)
    const state = events.pipe(L.scan(initialState, eventsReducer, globalScope))
    const board = L.view(state, "board") as L.Property<Board>

    const localBoardToSave = L.combineTemplate({
        boardWithHistory: {
            board,
            history: L.view(state, "history"),
        },
    }).pipe(
        L.changes,
        L.filter((state: LocalStorageBoard) => state.boardWithHistory.board !== undefined),
        L.debounce(1000),
    )
    localBoardToSave.forEach(storeBoardState)

    return {
        state,
    }
}

function addToStack(event: PersistableBoardItemEvent, b: PersistableBoardItemEvent[]): PersistableBoardItemEvent[] {
    const latest = b[b.length - 1]
    if (latest) {
        const folded = foldActions(event, latest) // The order is like this, because when applied the new event would be applied before the one in the stack
        if (folded) {
            // Replace top of stack with folded
            return [...b.slice(0, b.length - 1), folded] as any // TODO: can we get better types?
        }
    }

    return b.concat(event)
}
