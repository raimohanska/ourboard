import * as L from "lonna"
import { globalScope } from "lonna"
import { foldActions } from "../../../common/src/action-folding"
import { boardHistoryReducer } from "../../../common/src/board-history-reducer"
import { boardReducer } from "../../../common/src/board-reducer"
import {
    AppEvent,
    Board,
    BoardHistoryEntry,
    CURSOR_POSITIONS_ACTION_TYPE,
    EventFromServer,
    EventUserInfo,
    Id,
    isBoardItemEvent,
    isPersistableBoardItemEvent,
    ItemLocks,
    PersistableBoardItemEvent,
    UserCursorPosition,
} from "../../../common/src/domain"
import { getInitialBoardState, LocalStorageBoard, storeBoardState } from "./board-local-store"
import MessageQueue from "./message-queue"

export type BoardStore = ReturnType<typeof boardStore>

export function boardStore(
    bufferedServerEvents: L.EventStream<EventFromServer>,
    uiEvents: L.EventStream<AppEvent>,
    messageQueue: ReturnType<typeof MessageQueue>,
    userInfo: L.Property<EventUserInfo>,
) {
    type BoardState = { 
        board: Board | undefined
        history: BoardHistoryEntry[] 
        cursors: Record<Id, UserCursorPosition>
        locks: ItemLocks
    }
    let undoStack: AppEvent[] = []
    let redoStack: AppEvent[] = []

    function tagWithUser(e: AppEvent): EventFromServer {
        return isPersistableBoardItemEvent(e) ? tagWithUserFromState(e) : e
    }
    function tagWithUserFromState(e: PersistableBoardItemEvent): BoardHistoryEntry {
        const user: EventUserInfo = userInfo.get()
        return {
            ...e,
            user,
            timestamp: new Date().toISOString(),
        }
    }

    const eventsReducer = (state: BoardState, event: EventFromServer): BoardState => {
        if (event.action === "undo") {
            if (!undoStack.length) return state
            const undoOperation = undoStack.pop()!
            messageQueue.enqueue(undoOperation)
            const [{ board, history }, reverse] = boardHistoryReducer(
                { board: state.board!, history: state.history },
                tagWithUser(undoOperation),
            )
            if (reverse) redoStack = addToStack(reverse, redoStack)
            return { ...state, board, history }
        } else if (event.action === "redo") {
            if (!redoStack.length) return state
            const redoOperation = redoStack.pop()!
            messageQueue.enqueue(redoOperation)
            const [{ board, history }, reverse] = boardHistoryReducer(
                { board: state.board!, history: state.history },
                tagWithUser(redoOperation),
            )
            if (reverse) undoStack = addToStack(reverse, undoStack)
            return { ...state, board, history }
        } else if (isBoardItemEvent(event)) {
            const [{ board, history }, reverse] = boardHistoryReducer(
                { board: state.board!, history: state.history },
                event,
            )
            if (reverse && isPersistableBoardItemEvent(event) && event.serial == undefined) {
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
                return { ...state, board, history: localState.boardWithHistory.history.concat(event.recentEvents) }
            } else {
                console.log("Init as new board")
                return { ...state, board: event.board, history: [] }
            }
        } else if (event.action === "board.serial.ack") {
            return { ...state, board: state.board ? { ...state.board, serial: event.serial } : state.board }
        } else if (event.action === "board.locks") {
            return { ...state, locks: event.locks }
        } else if (event.action === CURSOR_POSITIONS_ACTION_TYPE) {
            return { ...state, cursors: event.p }
        } else {
            // Ignore other events
            return state
        }
    }

    const initialState = {
        board: undefined,
        history: [],
        cursors: {},
        locks: {},
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

function addToStack(event: AppEvent, b: AppEvent[]) {
    const latest = b[b.length - 1]
    if (latest) {
        const folded = foldActions(event, latest) // The order is like this, because when applied the new event would be applied before the one in the stack
        if (folded) {
            return [...b.slice(0, b.length - 1), folded] // Replace top of stack with folded
        }
    }

    return b.concat(event)
}
