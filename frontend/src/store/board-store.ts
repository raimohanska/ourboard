import _ from "lodash"
import * as L from "lonna"
import { globalScope } from "lonna"
import { addOrReplaceEvent, foldActions } from "../../../common/src/action-folding"
import { boardHistoryReducer } from "../../../common/src/board-history-reducer"
import { boardReducer } from "../../../common/src/board-reducer"
import {
    AccessLevel,
    AckAddBoard,
    Board,
    BoardHistoryEntry,
    BoardStateSyncEvent,
    canWrite,
    ClientToServerRequest,
    CursorMove,
    defaultBoardSize,
    EventUserInfo,
    Id,
    isBoardHistoryEntry,
    isCursorMove,
    isLocalUIEvent,
    isPersistableBoardItemEvent,
    ItemLocks,
    JoinBoard,
    LocalUIEvent,
    LoginResponse,
    newISOTimeStamp,
    PersistableBoardItemEvent,
    ServerConfig,
    SessionUserInfo,
    TransientBoardItemEvent,
    UIEvent,
    UserSessionInfo,
} from "../../../common/src/domain"
import { mkBootStrapEvent } from "../../../common/src/migration"
import { BoardLocalStore, LocalStorageBoard } from "./board-local-store"
import { ServerConnection } from "./server-connection"
import { isLoginInProgress, UserSessionState } from "./user-session-store"
export type Dispatch = (e: UIEvent) => void
export type BoardStore = ReturnType<typeof BoardStore>
export type BoardAccessStatus =
    | "none"
    | "loading"
    | "joining"
    | "offline"
    | "ready"
    | "denied-temporarily"
    | "denied-permanently"
    | "login-required"
    | "not-found"
export type BoardState = {
    status: BoardAccessStatus
    accessLevel: AccessLevel
    board: Board | undefined
    serverShadow: Board | undefined
    queue: (BoardHistoryEntry | CursorMove)[] // serverShadow + queue = current board
    serverHistory: BoardHistoryEntry[] // history until serverShadow (queued events not included)
    sent: (BoardHistoryEntry | CursorMove)[]
    locks: ItemLocks
    users: UserSessionInfo[]
}

function emptyBoard(boardId: Id) {
    return { id: boardId, name: "", ...defaultBoardSize, items: {}, connections: [], serial: 0 }
}

export function BoardStore(
    boardId: L.Property<Id | undefined>,
    connection: ServerConnection,
    sessionInfo: L.Property<UserSessionState>,
    localStore: BoardLocalStore,
) {
    type BoardStoreEvent =
        | BoardHistoryEntry
        | TransientBoardItemEvent
        | BoardStateSyncEvent
        | LocalUIEvent
        | ClientToServerRequest
        | LoginResponse
        | AckAddBoard
        | ServerConfig

    function tagWithUserFromState(e: PersistableBoardItemEvent): BoardHistoryEntry {
        const user: EventUserInfo = sessionState2UserInfo(sessionInfo.get())
        return {
            ...e,
            user,
            timestamp: newISOTimeStamp(),
        }
    }

    interface CommandStack {
        add(event: PersistableBoardItemEvent): void
    }

    const ACK_ID = "1"

    type BoardStateFromLocalStorage = {
        boardId: Id
        storedInitialState: LocalStorageBoard | undefined
    }
    const boardStateFromLocalStorage = L.atom<BoardStateFromLocalStorage | null>(null)

    function flushIfPossible(state: BoardState): BoardState {
        // Only flush when board is ready and we are not waiting for ack.
        if (state.status === "ready" && state.sent.length === 0 && state.queue.length > 0) {
            //console.log(`Send ${state.queue.map(i => i.action)}, await ack for ${state.queue.length}`)
            connection.send({ events: state.queue, ackId: ACK_ID })
            return { ...state, queue: [], sent: state.queue }
        }
        return state
    }

    function resetForBoard(boardId: Id) {
        console.log("Reseting and joining board")
        console.log("Sending board.join without initAtSerial")
        localStore.clearBoardState(boardId).then(() =>
            connection.send({
                action: "board.join",
                boardId,
            }),
        )
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
                const operationAsHistoryEntry = tagWithUserFromState(undoOperation)
                const [board, reverse] = boardReducer(state.board!, operationAsHistoryEntry)
                if (reverse) otherStack.add(reverse())
                return flushIfPossible({
                    ...state,
                    board,
                    queue: addOrReplaceEvent(operationAsHistoryEntry, state.queue),
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

    let initialServerSyncEventBuffer: BoardHistoryEntry[] = []

    const eventsReducer = (state: BoardState, event: BoardStoreEvent): BoardState => {
        const storedInitialState = boardStateFromLocalStorage.get()?.storedInitialState

        if (state.status === "ready") {
            // Process these events only when "ready"
            if (event.action === "cursor.move") {
                return flushIfPossible({ ...state, queue: addOrReplaceEvent(event, state.queue) })
            } else if (event.action === "ui.undo") {
                return undoStack.pop(state, redoStack)
            } else if (event.action === "ui.redo") {
                return redoStack.pop(state, undoStack)
            } else if (isPersistableBoardItemEvent(event)) {
                try {
                    if (event.serial == undefined) {
                        if (!canWrite(state.accessLevel)) return state
                        // No serial == is local event. TODO: maybe a nicer way to recognize this?
                        redoStack.clear()
                        const [board, reverse] = boardReducer(state.board!, event)
                        if (reverse) undoStack.add(reverse())
                        return flushIfPossible({ ...state, board, queue: addOrReplaceEvent(event, state.queue) })
                    } else {
                        // Remote event
                        const [{ board: newServerShadow, history: newServerHistory }] = boardHistoryReducer(
                            { board: state.serverShadow!, history: state.serverHistory },
                            event,
                        )
                        // Rebase local events on top of new server shadow
                        // TODO: what if fails?
                        const localEvents = [...state.sent, ...state.queue]
                        const board = localEvents
                            .filter(isBoardHistoryEntry)
                            .reduce((b, e) => boardReducer(b, e)[0], newServerShadow)
                        //console.log(`Processed remote board event and rebased ${localEvents.length} local events on top`, event)
                        return { ...state, serverShadow: newServerShadow, board, serverHistory: newServerHistory }
                    }
                } catch (e) {
                    console.error("Error applying event. Fetching as new board...", e)
                    resetForBoard(event.boardId)
                    return {
                        ...state,
                        status: "joining",
                    }
                }
            } else if (event.action === "board.joined") {
                return { ...state, users: state.users.concat(event) }
            } else if (event.action === "board.left") {
                return { ...state, users: state.users.filter((u) => u.sessionId !== event.sessionId) }
            } else if (event.action === "board.locks") {
                return { ...state, locks: event.locks }
            } else if (event.action === "ack") {
                const newSerial = state.board ? event.serials[state.board.id] : undefined
                if (!newSerial) {
                    //console.log("Got ack")
                    return flushIfPossible({ ...state, sent: [] })
                } else {
                    // Our sent events now acknowledged and will be incorporated into serverShadow and serverHistory
                    const newServerEvents = state.sent.filter(isBoardHistoryEntry)
                    const newServerHistory = [...state.serverHistory, ...newServerEvents]
                    const newServerShadow =
                        state.queue.length > 0
                            ? newServerEvents.reduce((b, e) => boardReducer(b, e)[0], state.serverShadow!)
                            : state.board! // No queued events -> no need to calculate

                    //console.log(`Got ack. Joined ${state.sent.length} local events to server history and shadow (${state.serverShadow?.serial}->${newSerial}), shortcutted=${newServerShadow===state.board}`)

                    return flushIfPossible({
                        ...state,
                        board: { ...state.board!, serial: newSerial },
                        serverShadow: { ...newServerShadow, serial: newSerial },
                        serverHistory: newServerHistory,
                        sent: [],
                    })
                }
            } else if (event.action === "board.action.apply.failed") {
                console.error("Failed to apply previous action. Resetting to server-side state...")
                if (state.board) {
                    resetForBoard(state.board.id)
                    return {
                        ...state,
                        status: "joining",
                    }
                }
                return state
            }
        } else {
            // Process these events only when not "ready"
        }
        // Process these events in both ready and not-ready states
        if (event.action === "ui.board.logged.out") {
            return { ...state, board: emptyBoard(event.boardId), status: "denied-permanently" }
        }
        if (event.action === "board.join.denied") {
            state = { ...state, board: emptyBoard(event.boardId) }
            const loginStatus = sessionInfo.get().status
            if (state.status !== "loading") {
                console.error(`Got board.join.denied while in status ${state.status}`)
            }
            if (loginStatus === "logging-in-server") {
                console.log(`Access denied to board: login in progress`)
                return { ...state, status: "denied-temporarily" }
            } else if (event.reason === "not found") {
                console.log(`Access denied to board: ${event.reason}`)
                return { ...state, status: "not-found" }
            } else if (loginStatus === "anonymous" || loginStatus === "logged-out" || loginStatus === "login-failed") {
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
        if (event.action === "ui.board.setId") {
            // Locally dispatched, see below
            console.log("ui.board.join.request -> reset")
            undoStack.clear()
            redoStack.clear()
            if (!event.boardId) {
                console.log("Join board with no board id. Reseting board state.")
                return initialState
            }
            if (storedInitialState && storedInitialState.serverShadow.id === event.boardId) {
                console.log(`Starting offline with local board state, serial=${storedInitialState.serverShadow.serial}`)
                const board = storedInitialState.queue.reduce(
                    (b, e) => boardReducer(b, e)[0],
                    storedInitialState.serverShadow,
                )

                return {
                    ...initialState,
                    status: "offline",
                    queue: storedInitialState.queue,
                    sent: [],
                    serverHistory: storedInitialState.serverHistory,
                    serverShadow: storedInitialState.serverShadow,
                    board,
                }
            }
            console.log(`Starting with empty board state`)
            return {
                ...initialState,
                status: "loading",
                queue: [],
                sent: [],
                board: emptyBoard(event.boardId),
            }
        } else if (event.action === "ui.board.readyToJoin") {
            if (state.status !== "ready" && state.status !== "joining") {
                const joinRequest: JoinBoard = {
                    action: "board.join",
                    boardId: event.boardId,
                    initAtSerial: storedInitialState?.serverShadow?.serial,
                }
                console.log(`Sending board.join at serial ${joinRequest.initAtSerial}`)
                connection.send(joinRequest)
                return {
                    ...state,
                    status: "joining",
                }
            } else {
                console.warn("Not joining in state", state.status)
            }
            return state
        } else if (event.action === "userinfo.set") {
            const users = state.users.map((u) => (u.sessionId === event.sessionId ? event : u))
            return { ...state, users }
        } else if (event.action === "board.init") {
            console.log(`Going to online mode. Init as new board at serial ${event.board.serial}`)
            return {
                ...state,
                status: "ready",
                board: event.board,
                accessLevel: event.accessLevel,
                serverShadow: event.board,
                sent: [],
                serverHistory: [
                    //  Create a bootstrap event to make the local history consistent even though we don't have the full history from server.
                    mkBootStrapEvent(event.board.id, event.board, event.board.serial),
                ],
            }
        } else if (event.action === "board.init.diff") {
            if (event.first) {
                // Ensure local buffer empty on first chunk even if an earlier init was aborted.
                initialServerSyncEventBuffer = []
            }
            const boardId = event.boardAttributes.id
            try {
                if (!storedInitialState)
                    throw Error(`Trying to init at ${event.initAtSerial} without local board state`)
                if (storedInitialState.serverShadow.id !== event.boardAttributes.id)
                    throw Error(`Trying to init board with nonmatching id`)

                initialServerSyncEventBuffer.push(...event.recentEvents)
                if (!event.last) {
                    return state
                }

                const usedLocalState =
                    state.board && state.board.id === boardId && state.serverShadow
                        ? { serverShadow: state.serverShadow, queue: state.queue.filter(isBoardHistoryEntry) }
                        : storedInitialState

                if (usedLocalState !== storedInitialState)
                    console.log(
                        `Using local state instead of stored. Using ${usedLocalState.queue.length} local events (out of ${state.queue.length})`,
                    )

                const localSerial = usedLocalState.serverShadow.serial
                if (localSerial != event.initAtSerial)
                    throw Error(`Trying to init at ${event.initAtSerial} with local board state at ${localSerial}`)

                const initialBoard = {
                    ...usedLocalState.serverShadow,
                    ...event.boardAttributes,
                } as Board

                const queue = usedLocalState.queue
                if (initialServerSyncEventBuffer.length > 0) {
                    console.log(
                        `Going to online mode. Init at ${event.initAtSerial} with ${
                            initialServerSyncEventBuffer.length
                        } new events. Board starts at ${initialBoard.serial} and first event is ${
                            initialServerSyncEventBuffer[0].serial
                        } and last ${initialServerSyncEventBuffer[initialServerSyncEventBuffer.length - 1].serial}. ${
                            queue.length
                        } local events queued, ${state.sent.length} awaiting ack.`,
                    )
                } else {
                    console.log(
                        `Init at ${event.initAtSerial}, no new events. ${queue.length} local events queued, ${state.sent.length} awaiting ack.`,
                    )
                }
                // New server shadow = old server shadow + recent events from server
                const newServerShadow = initialServerSyncEventBuffer.reduce(
                    (b, e) => boardReducer(b, e)[0],
                    initialBoard,
                )
                // Local board = server shadow + local queue
                const board = queue.reduce((b, e) => boardReducer(b, e)[0], newServerShadow)
                const newServerHistory = [...state.serverHistory, ...initialServerSyncEventBuffer]

                initialServerSyncEventBuffer = []

                return flushIfPossible({
                    ...state,
                    accessLevel: event.accessLevel,
                    status: "ready",
                    board,
                    serverShadow: newServerShadow,
                    queue,
                    serverHistory: newServerHistory,
                })
            } catch (e) {
                console.error("Error initializing board. Fetching as new board...", e)
                resetForBoard(boardId)
                return {
                    ...state,
                    status: "loading",
                    board: emptyBoard(boardId),
                }
            }
        } else if (event.action === "ui.offline") {
            if (state.status === "ready" || state.status === "joining" || state.status === "loading") {
                console.log(`Disconnected. Going to offline mode.`)
            }
            if (state.sent.length > 0) {
                console.log(`Discarding ${state.sent.length} sent events of which we don't have an ack yet`)
                // TODO: should we rollback board too?
            }
            return { ...state, status: "offline", sent: [], users: [], locks: {} }
        }
        //console.warn("Unhandled event", event.action);
        return state
    }

    const initialState: BoardState = {
        status: "none" as const,
        accessLevel: "none",
        serverShadow: undefined,
        board: undefined,
        serverHistory: [],
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
        .pipe(L.filter((e) => !isLocalUIEvent(e) && !isPersistableBoardItemEvent(e) && !isCursorMove(e)))
        .forEach(connection.send)

    const localBoardToSave = state.pipe(
        L.changes,
        L.filter((state) => state.board !== undefined && state.board.serial > 0 && state.status === "ready"),
        L.map((state) => {
            return {
                serverShadow: state.serverShadow!,
                serverHistory: state.serverHistory,
                queue: state.queue.filter(isBoardHistoryEntry),
            }
        }),
    )
    localBoardToSave.forEach(async (board) => {
        await localStore.storeBoardState(board)
    })

    boardId.forEach(async (boardId) => {
        boardStateFromLocalStorage.set(null)
        if (boardId) {
            console.log("Got board id, fetching local state", boardId)
            const storedInitialState = await localStore.getInitialBoardState(boardId)
            boardStateFromLocalStorage.set({ boardId, storedInitialState })
            dispatch({ action: "ui.board.setId", boardId }) // This is for the reducer locally to start offline mode
            checkReadyToJoin()
        }
    })

    const sessionStatus = L.view(sessionInfo, (s) => s.status)
    const ss = sessionStatus.pipe(
        L.changes,
        L.scan([sessionStatus.get(), sessionStatus.get()] as const, ([a, b], next) => [b, next] as const),
        L.applyScope(globalScope),
    )
    ss.onChange(([prev, s]) => {
        if (s === "logged-out" && prev === "logged-in") {
            console.log("Clearing private boards from local storage")
            localStore.clearAllPrivateBoards()
            const board = state.get().board
            if (board && board.accessPolicy) {
                dispatch({ action: "ui.board.logged.out", boardId: board.id })
                return
            }
            connection.newSocket()
        }
        checkReadyToJoin()
    })
    connection.connected.onChange((connected) => {
        if (connected) {
            checkReadyToJoin()
        } else {
            dispatch({ action: "ui.offline" })
        }
    })

    function checkReadyToJoin() {
        const bid = boardStateFromLocalStorage.get()?.boardId
        if (bid && connection.connected.get() && !isLoginInProgress(sessionStatus.get())) {
            console.log("Ready to join board")
            dispatch({ action: "ui.board.readyToJoin", boardId: bid }) // This is for the reducer locally to trigger join if not already online
        }
    }

    return {
        state,
        events,
        eventsFromServer: connection.bufferedServerEvents,
        dispatch,
        canUndo: undoStack.canPop,
        canRedo: redoStack.canPop,
    }
}

export function sessionState2UserInfo(state: UserSessionState): SessionUserInfo {
    if (state.status === "logged-in") {
        return {
            userType: "authenticated",
            email: state.email,
            nickname: state.nickname,
            name: state.name,
            userId: state.userId,
            domain: state.domain,
            picture: state.picture,
        }
    } else {
        return {
            userType: "unidentified",
            nickname: state.nickname || "<unknown>",
        }
    }
}
