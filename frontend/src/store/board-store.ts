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
    Id,
    isPersistableBoardItemEvent,
    ItemLocks,
    LocalUIEvent,
    LoginResponse,
    PersistableBoardItemEvent,
    TransientBoardItemEvent,
    UIEvent,
    UserCursorPosition,
    UserSessionInfo,
} from "../../../common/src/domain"
import { mkBootStrapEvent } from "../../../common/src/migration"
import { clearBoardState, getInitialBoardState, storeBoardState } from "./board-local-store"
import { ServerConnection } from "./server-connection"
import { isLoginInProgress, UserSessionState } from "./user-session-store"

export type BoardStore = ReturnType<typeof BoardStore>
export type BoardAccessStatus =
    | "none"
    | "loading"
    | "ready"
    | "denied-temporarily"
    | "denied-permanently"
    | "login-required"
export type BoardState = {
    status: BoardAccessStatus
    board: Board | undefined
    history: BoardHistoryEntry[]
    cursors: UserCursorPosition[]
    locks: ItemLocks
    users: UserSessionInfo[]
}
export function BoardStore(
    boardId: L.Property<Id | undefined>,
    connection: ServerConnection,
    sessionInfo: L.Property<UserSessionState>,
) {
    type BoardStoreEvent =
        | BoardHistoryEntry
        | TransientBoardItemEvent
        | BoardStateSyncEvent
        | LocalUIEvent
        | ClientToServerRequest
        | LoginResponse
    let undoStack: PersistableBoardItemEvent[] = []
    let redoStack: PersistableBoardItemEvent[] = []

    function tagWithUserFromState(e: PersistableBoardItemEvent): BoardHistoryEntry {
        const user: EventUserInfo = sessionState2UserInfo(sessionInfo.get())
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
            connection.enqueue(undoOperation)
            console.log("APPLY-R", undoOperation)
            const [{ board, history }, reverse] = boardHistoryReducer(
                { board: state.board!, history: state.history },
                tagWithUserFromState(undoOperation),
            )
            if (reverse) redoStack = addToStack(reverse, redoStack)
            return { ...state, board, history }
        } else if (event.action === "ui.redo") {
            if (!redoStack.length) return state
            const redoOperation = redoStack.pop()!
            connection.enqueue(redoOperation)
            console.log("APPLY-R", redoOperation)
            const [{ board, history }, reverse] = boardHistoryReducer(
                { board: state.board!, history: state.history },
                tagWithUserFromState(redoOperation),
            )
            if (reverse) undoStack = addToStack(reverse, undoStack)
            return { ...state, board, history }
        } else if (isPersistableBoardItemEvent(event)) {
            console.log("APPLY", event)
            const [{ board, history }, reverse] = boardHistoryReducer(
                { board: state.board!, history: state.history },
                event,
            )
            if (state.status !== "ready") {
                console.warn(`Received board update ${event.serial} while in status ${state.status}`)
            }
            if (reverse && event.serial == undefined) {
                console.log("REVERSE", reverse)
                // No serial == is local event. TODO: maybe a nicer way to recognize this?
                redoStack = []
                undoStack = addToStack(reverse, undoStack)
            }
            return { ...state, board, history }
        } else if (event.action === "board.join.denied") {
            const loginStatus = sessionInfo.get().status
            if (state.status !== "loading") {
                console.error(`Got board.join.denied while in status ${state.status}`)
            }
            if (loginStatus === "logging-in-server" || loginStatus === "logging-in-local") {
                console.log(`Access denied to board: login in progress`)
                return { ...state, status: "denied-temporarily" }
            } else if (loginStatus === "anonymous" || loginStatus === "logged-out" || loginStatus === "login-failed") {
                console.log(`Access denied to board: login required`)
                return { ...state, status: "login-required" }
            } else if (event.reason === "unauthorized") {
                console.warn(`Got "unauthorized" while logged in, likely login in progress...`)
                return state
            } else if (event.reason === "forbidden") {
                console.log(`Access denied to board: no privileges`)
                return { ...state, status: "denied-permanently" }
            } else {
                console.error(`Unexpected board access denial: ${state.status}/${loginStatus}/${event.reason}`)
                return state
            }
        } else if (event.action === "board.init") {
            if ("initAtSerial" in event) {
                const boardId = event.boardAttributes.id
                try {
                    const localState = getInitialBoardState(boardId)
                    if (!localState) throw Error(`Trying to init at ${event.initAtSerial} without local board state`)
                    const localSerial = localState.boardWithHistory.board.serial
                    if (localSerial != event.initAtSerial)
                        throw Error(`Trying to init at ${event.initAtSerial} with local board state at ${localSerial}`)

                    const initialBoard = { ...localState.boardWithHistory.board, ...event.boardAttributes } as Board
                    if (event.recentEvents.length > 0) {
                        console.log(
                            `Init at ${event.initAtSerial} with ${
                                event.recentEvents.length
                            } new events. Board starts at ${initialBoard.serial} and first event is ${
                                event.recentEvents[0]?.serial
                            } and last ${event.recentEvents[event.recentEvents.length - 1]?.serial}`,
                        )
                    } else {
                        console.log(`Init at ${event.initAtSerial}, no new events`)
                    }
                    const board = event.recentEvents.reduce((b, e) => boardReducer(b, e)[0], initialBoard)
                    //console.log(`Init done and board at ${board.serial}`)
                    connection.startFlushing()
                    return {
                        ...state,
                        status: "ready",
                        board,
                        history: localState.boardWithHistory.history.concat(event.recentEvents),
                    }
                } catch (e) {
                    console.error("Error initializing board. Fetching as new board...", e)
                    connection.sendImmediately({
                        action: "board.join",
                        boardId,
                    })
                    return state
                }
            } else {
                console.log("Init as new board")
                connection.startFlushing()
                return {
                    ...state,
                    status: "ready",
                    board: event.board,
                    history: [
                        //  Create a bootstrap event to make the local history consistent even though we don't have the full history from server.
                        mkBootStrapEvent(event.board.id, event.board, event.board.serial),
                    ],
                }
            }
        } else if (event.action === "board.serial.ack") {
            //console.log(`Update to ${event.serial} with ack`)
            return { ...state, board: state.board ? { ...state.board, serial: event.serial } : state.board }
        } else if (event.action === "board.locks") {
            return { ...state, locks: event.locks }
        } else if (event.action === CURSOR_POSITIONS_ACTION_TYPE) {
            // TODO when switching board, the cursor is not removed from previous board.
            const otherCursors = { ...event.p }
            const session = sessionInfo.get().sessionId // TODO: this should be done by the server indeed
            session && delete otherCursors[session]
            const cursors = Object.values(otherCursors)
            return { ...state, cursors }
        } else if (event.action === "board.joined") {
            return { ...state, users: state.users.concat(event) }
        } else if (event.action === "userinfo.set") {
            const users = state.users.map((u) => (u.sessionId === event.sessionId ? event : u))
            return { ...state, users }
        } else if (event.action === "ui.board.join.request") {
            if (!event.boardId) {
                return state
            }
            return {
                ...initialState,
                status: "loading",
                board: { id: event.boardId, name: "", ...defaultBoardSize, items: {}, connections: [], serial: 0 },
            }
        } else if (event.action === "board.action.apply.failed") {
            console.error("Failed to apply previous action. Resetting to server-side state...")
            if (state.board) {
                clearBoardState(state.board.id)
                doJoin(state.board.id)
            }
            return state
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
    const userTaggedLocalEvents = L.view(connection.uiEvents, tagWithUser)
    const events = L.merge(userTaggedLocalEvents, connection.bufferedServerEvents)
    const state = events.pipe(L.scan(initialState, eventsReducer, globalScope))

    const localBoardToSave = state.pipe(
        L.changes,
        L.filter(
            (state: BoardState) => state.board !== undefined && state.board.serial > 0 && state.status === "ready",
        ),
        L.debounce(1000),
        L.map((state: BoardState) => {
            return {
                boardWithHistory: {
                    board: state.board!,
                    history: state.history,
                },
            }
        }),
    )
    localBoardToSave.forEach(storeBoardState)

    boardId.forEach((boardId) => {
        // Switch socket per board. This terminates the unnecessary board session on server.
        // Also, is preparation for load balancing solution.
        connection.setBoardId(boardId)
        connection.dispatch({ action: "ui.board.join.request", boardId })
        checkReadyToJoin()
    })

    const sessionStatus = L.view(sessionInfo, (s) => s.status)
    sessionStatus.onChange(checkReadyToJoin)
    connection.connected.onChange(checkReadyToJoin)

    function checkReadyToJoin() {
        const bid = boardId.get()
        if (bid && connection.connected.get() && !isLoginInProgress(sessionStatus.get())) {
            doJoin(bid)
        }
    }

    function doJoin(boardId: Id) {
        connection.sendImmediately({
            action: "board.join",
            boardId: boardId,
            initAtSerial: getInitialBoardState(boardId)?.boardWithHistory.board.serial,
        })
    }

    return {
        state,
    }
}

function addToStack(event: PersistableBoardItemEvent, b: PersistableBoardItemEvent[]): PersistableBoardItemEvent[] {
    const latest = b[b.length - 1]
    if (latest) {
        const folded = foldActions(event, latest, { foldAddUpdate: false }) // The order is like this, because when applied the new event would be applied before the one in the stack
        if (folded) {
            // Replace top of stack with folded
            return [...b.slice(0, b.length - 1), folded] as any // TODO: can we get better types?
        }
    }

    return b.concat(event)
}

function sessionState2UserInfo(state: UserSessionState): EventUserInfo {
    if (state.status === "logged-in") {
        return {
            userType: "authenticated",
            email: state.email,
            nickname: state.nickname,
            name: state.name,
            userId: state.userId,
        }
    } else {
        return {
            userType: "unidentified",
            nickname: state.nickname || "<unknown>",
        }
    }
}
