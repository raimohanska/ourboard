import * as L from "lonna"
import { globalScope } from "lonna"
import { addOrReplaceEvent, foldActions } from "../../../common/src/action-folding"
import { boardHistoryReducer } from "../../../common/src/board-history-reducer"
import { boardReducer } from "../../../common/src/board-reducer"
import {
    AppEvent,
    Board,
    BoardHistoryEntry,
    BoardStateSyncEvent,
    ClientToServerRequest,
    CURSOR_POSITIONS_ACTION_TYPE,
    defaultBoardSize,
    EventFromServer,
    EventUserInfo,
    Id,
    isLocalUIEvent,
    isPersistableBoardItemEvent,
    ItemLocks,
    LocalUIEvent,
    LoginResponse,
    PersistableBoardItemEvent,
    TransientBoardItemEvent,
    UIEvent,
    UserSessionInfo,
} from "../../../common/src/domain"
import { mkBootStrapEvent } from "../../../common/src/migration"
import { clearBoardState, getInitialBoardState, LocalStorageBoard, storeBoardState } from "./board-local-store"
import { ServerConnection } from "./server-connection"
import { isLoginInProgress, UserSessionState } from "./user-session-store"
import _ from "lodash"
export type Dispatch = (e: UIEvent) => void
export type BoardStore = ReturnType<typeof BoardStore>
export type BoardAccessStatus =
    | "none"
    | "loading"
    | "ready"
    | "denied-temporarily"
    | "denied-permanently"
    | "login-required"
    | "not-found"
export type BoardState = {
    status: BoardAccessStatus
    board: Board | undefined
    queue: UIEvent[]
    sent: UIEvent[]
    history: BoardHistoryEntry[]
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

    function tagWithUserFromState(e: PersistableBoardItemEvent): BoardHistoryEntry {
        const user: EventUserInfo = sessionState2UserInfo(sessionInfo.get())
        return {
            ...e,
            user,
            timestamp: new Date().toISOString(),
        }
    }

    interface CommandStack {
        add(event: PersistableBoardItemEvent): void
    }

    function flushIfPossible(state: BoardState): BoardState {
        // Only flush when board is ready and we are not waiting for ack.
        if (state.status === "ready" && state.sent.length === 0 && state.queue.length > 0) {
            connection.send(state.queue)
            return { ...state, queue: [], sent: state.queue }
        }
        return state
    }

    function CommandStack() {
        let stack = L.atom<PersistableBoardItemEvent[]>([])
        let canPop = L.view(stack, (s) => s.length > 0)
        return {
            add(event: PersistableBoardItemEvent) {
                stack.modify((s) => addToStack(event, s))
            },
            pop(state: BoardState, otherStack: CommandStack): BoardState {
                const undoOperation = _.last(stack.get())
                if (!undoOperation) return state
                stack.modify((s) => s.slice(0, s.length - 1))
                const [{ board, history }, reverse] = boardHistoryReducer(
                    { board: state.board!, history: state.history },
                    tagWithUserFromState(undoOperation),
                )
                if (reverse) otherStack.add(reverse)
                return flushIfPossible({
                    ...state,
                    board,
                    history,
                    queue: addOrReplaceEvent(undoOperation, state.queue),
                })
            },
            clear() {
                stack.set([])
            },
            canPop,
        }

        function addToStack(
            event: PersistableBoardItemEvent,
            b: PersistableBoardItemEvent[],
        ): PersistableBoardItemEvent[] {
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
    }
    let undoStack = CommandStack()
    let redoStack = CommandStack()

    const eventsReducer = (state: BoardState, event: BoardStoreEvent): BoardState => {
        if (state.status === "ready") {
            // Process these events only when "ready"
            if (event.action === "cursor.move") {
                return flushIfPossible({ ...state, queue: addOrReplaceEvent(event, state.queue) })
            } else if (event.action === "ui.undo") {
                return undoStack.pop(state, redoStack)
            } else if (event.action === "ui.redo") {
                return redoStack.pop(state, undoStack)
            } else if (isPersistableBoardItemEvent(event)) {
                const [{ board, history }, reverse] = boardHistoryReducer(
                    { board: state.board!, history: state.history },
                    event,
                )
                if (reverse && event.serial == undefined) {
                    // No serial == is local event. TODO: maybe a nicer way to recognize this?
                    redoStack.clear()
                    undoStack.add(reverse)
                }
                return flushIfPossible({ ...state, board, history, queue: addOrReplaceEvent(event, state.queue) })
            } else if (event.action === "board.joined") {
                return { ...state, users: state.users.concat(event) }
            } else if (event.action === "board.locks") {
                return { ...state, locks: event.locks }
            } else if (event.action === "ack") {
                return flushIfPossible({ ...state, sent: [] })
            } else if (event.action === "board.serial.ack") {
                //console.log(`Update to ${event.serial} with ack`)
                return { ...state, board: state.board ? { ...state.board, serial: event.serial } : state.board }
            } else if (event.action === "board.action.apply.failed") {
                console.error("Failed to apply previous action. Resetting to server-side state...")
                if (state.board) {
                    clearBoardState(state.board.id)
                    doJoin(state.board.id)
                }
                return state
            }
        } else {
            // Process these events only when not "ready"
            if (event.action === "ui.board.join.request") {
                undoStack.clear()
                redoStack.clear()
                if (!event.boardId) {
                    return initialState
                }
                return {
                    ...initialState,
                    status: "loading",
                    queue: [],
                    sent: [],
                    board: { id: event.boardId, name: "", ...defaultBoardSize, items: {}, connections: [], serial: 0 },
                }
            } else if (event.action === "board.join.denied") {
                const loginStatus = sessionInfo.get().status
                if (state.status !== "loading") {
                    console.error(`Got board.join.denied while in status ${state.status}`)
                }
                if (loginStatus === "logging-in-server" || loginStatus === "logging-in-local") {
                    console.log(`Access denied to board: login in progress`)
                    return { ...state, status: "denied-temporarily" }
                } else if (event.reason === "not found") {
                    console.log(`Access denied to board: ${event.reason}`)
                    return { ...state, status: "not-found" }
                } else if (
                    loginStatus === "anonymous" ||
                    loginStatus === "logged-out" ||
                    loginStatus === "login-failed"
                ) {
                    console.log(`Access denied to board: login required`)
                    return { ...state, status: "login-required" }
                } else if (event.reason === "unauthorized") {
                    console.warn(`Got "unauthorized" while logged in, likely login in progress...`)
                    return state
                } else if (event.reason === "forbidden") {
                    console.log(`Access denied to board: ${event.reason}`)
                    return { ...state, status: "denied-permanently" }
                } else {
                    console.error(`Unexpected board access denial: ${state.status}/${loginStatus}/${event.reason}`)
                    return state
                }
            }
        }
        // Process these events in both ready and not-ready states
        if (event.action === "userinfo.set") {
            const users = state.users.map((u) => (u.sessionId === event.sessionId ? event : u))
            return { ...state, users }
        } else if (event.action === "board.init") {
            if ("initAtSerial" in event) {
                const boardId = event.boardAttributes.id
                try {
                    if (!storedInitialState)
                        throw Error(`Trying to init at ${event.initAtSerial} without local board state`)
                    if (storedInitialState.boardWithHistory.board.id !== event.boardAttributes.id)
                        throw Error(`Trying to init board with nonmatching id`)
                    const localSerial = storedInitialState.boardWithHistory.board.serial
                    if (localSerial != event.initAtSerial)
                        throw Error(`Trying to init at ${event.initAtSerial} with local board state at ${localSerial}`)

                    const initialBoard = {
                        ...storedInitialState.boardWithHistory.board,
                        ...event.boardAttributes,
                    } as Board
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
                    return flushIfPossible({
                        ...state,
                        status: "ready",
                        board,
                        queue: storedInitialState.queue,
                        history: storedInitialState.boardWithHistory.history.concat(event.recentEvents),
                    })
                } catch (e) {
                    console.error("Error initializing board. Fetching as new board...", e)
                    clearBoardState(boardId).then(() =>
                        connection.send({
                            action: "board.join",
                            boardId,
                        }),
                    )
                    return state
                }
            } else {
                console.log("Init as new board")
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
        }
        //console.warn("Unhandled event", event.action);
        return state
    }

    const initialState = {
        status: "none" as const,
        board: undefined,
        history: [],
        locks: {},
        users: [],
        queue: [],
        sent: [],
    }

    function tagWithUser(e: UIEvent): BoardHistoryEntry | ClientToServerRequest | LocalUIEvent {
        return isPersistableBoardItemEvent(e) ? tagWithUserFromState(e) : e
    }
    const uiEvents = L.bus<UIEvent>()
    const dispatch: Dispatch = uiEvents.push
    const userTaggedLocalEvents = L.view(uiEvents, tagWithUser)
    const events = L.merge(userTaggedLocalEvents, connection.bufferedServerEvents)
    const state = events.pipe(L.scan(initialState, eventsReducer, globalScope))

    // persistable events and undo/redo are put to the state queue above, others are sent here immediately
    uiEvents
        .pipe(L.filter((e) => !isLocalUIEvent(e) && !isPersistableBoardItemEvent(e) && e.action !== "cursor.move"))
        .forEach(connection.send)

    const localBoardToSave = state.pipe(
        L.changes,
        L.filter((state) => state.board !== undefined && state.board.serial > 0 && state.status === "ready"),
        L.debounce(1000),
        L.map((state) => {
            return {
                boardWithHistory: {
                    board: state.board!,
                    history: state.history,
                },
                queue: state.queue,
            }
        }),
    )
    localBoardToSave.forEach(async (board) => {
        await storeBoardState(board)
    })

    boardId.forEach((boardId) => {
        dispatch({ action: "ui.board.join.request", boardId })
        checkReadyToJoin()
    })

    const sessionStatus = L.view(sessionInfo, (s) => s.status)
    sessionStatus.onChange(checkReadyToJoin)
    connection.connected.onChange(checkReadyToJoin)

    function checkReadyToJoin() {
        const bid = boardId.get()
        if (bid && connection.connected.get() && !isLoginInProgress(sessionStatus.get())) {
            console.log("Go!")
            doJoin(bid)
        }
    }

    let storedInitialState: LocalStorageBoard | undefined = undefined

    async function doJoin(boardId: Id) {
        storedInitialState = await getInitialBoardState(boardId)
        connection.send({
            action: "board.join",
            boardId: boardId,
            initAtSerial: storedInitialState?.boardWithHistory.board.serial,
        })
    }

    return {
        state,
        events,
        dispatch,
        canUndo: undoStack.canPop,
        canRedo: redoStack.canPop,
    }
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
