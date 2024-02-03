import _ from "lodash"
import * as L from "lonna"
import { globalScope } from "lonna"
import { addOrReplaceEvent, foldActions } from "../../../common/src/action-folding"
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
    | "online"
    | "denied-temporarily"
    | "denied-permanently"
    | "login-required"
    | "not-found"
export type BoardState = {
    status: BoardAccessStatus
    accessLevel: AccessLevel
    board: Board | undefined // Current board shown on the client
    serverShadow: Board | undefined // Our view of the board as it is on the server
    queue: (BoardHistoryEntry | CursorMove)[] // Local events to send. serverShadow + sent + queue = current board
    sent: (BoardHistoryEntry | CursorMove)[] // Events sent to server, waiting for ack
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

    const boardStateFromLocalStorage = L.atom<LocalStorageBoard | undefined>(undefined)

    function flushIfPossible(state: BoardState): BoardState {
        // Only flush when board is ready and we are not waiting for ack.
        if (state.status === "online" && state.sent.length === 0 && state.queue.length > 0) {
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
        if (state.status === "online") {
            // Process these events only when online
            if (event.action === "cursor.move") {
                return flushIfPossible({ ...state, queue: addOrReplaceEvent(event, state.queue) })
            }
        }
        if (state.status === "online" || state.status === "offline") {
            // Process these events only when online or offline
            if (event.action === "ui.undo") {
                return undoStack.pop(state, redoStack)
            } else if (event.action === "ui.redo") {
                return redoStack.pop(state, undoStack)
            } else if (isPersistableBoardItemEvent(event)) {
                try {
                    if (event.serial == undefined) {
                        // No serial == is local event.
                        if (!canWrite(state.accessLevel)) return state
                        redoStack.clear()
                        const [board, reverse] = boardReducer(state.board!, event)
                        if (reverse) undoStack.add(reverse())
                        return flushIfPossible({ ...state, board, queue: addOrReplaceEvent(event, state.queue) })
                    } else {
                        // Remote event
                        if (state.status !== "online") {
                            // Skip while not online. For instance, when recently reconnected, we may receive events from others while still
                            // Waiting for our final board.init.diff sync event. It would be disastrous to process these events before fully synced.
                            // The server will re-send any missed events after sync, after which we can start processing normally.
                            return state
                        }
                        const [newServerShadow] = boardReducer(state.serverShadow!, event, { strictOnSerials: true })
                        // Rebase local events on top of new server shadow. If this fails, there's a catch below.
                        const localEvents = [...state.sent, ...state.queue]
                        const board = localEvents
                            .filter(isBoardHistoryEntry)
                            .reduce((b, e) => boardReducer(b, e)[0], newServerShadow)
                        //console.log(`Processed remote board event and rebased ${localEvents.length} local events on top`, event)
                        return { ...state, serverShadow: newServerShadow, board }
                    }
                } catch (e) {
                    console.error("Error applying event. Fetching as new board...", e)
                    resetForBoard(event.boardId)
                    return {
                        ...state,
                        status: "joining",
                        sent: [],
                        queue: [],
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
                    // Our sent events now acknowledged and will be incorporated into serverShadow
                    const newServerEvents = state.sent.filter(isBoardHistoryEntry)
                    const newServerShadow =
                        state.queue.length > 0
                            ? newServerEvents.reduce((b, e) => boardReducer(b, e)[0], state.serverShadow!)
                            : state.board! // No queued events -> no need to calculate

                    //console.log(`Got ack. Joined ${state.sent.length} local events to server history and shadow (${state.serverShadow?.serial}->${newSerial}), shortcutted=${newServerShadow===state.board}`)

                    return flushIfPossible({
                        ...state,
                        board: { ...state.board!, serial: newSerial },
                        serverShadow: { ...newServerShadow, serial: newSerial },
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
            const storedInitialState = boardStateFromLocalStorage.get()
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
            if (state.status !== "online" && state.status !== "joining") {
                const initAtSerial = state.serverShadow?.serial

                const joinRequest: JoinBoard = {
                    action: "board.join",
                    boardId: event.boardId,
                    initAtSerial,
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
                status: "online",
                board: event.board,
                accessLevel: event.accessLevel,
                serverShadow: event.board,
                sent: [],
            }
        } else if (event.action === "board.init.diff") {
            if (event.first) {
                // Ensure local buffer empty on first chunk even if an earlier init was aborted.
                initialServerSyncEventBuffer = []
            }
            const boardId = event.boardAttributes.id
            try {
                if (!state.serverShadow) throw Error(`Trying to init at ${event.initAtSerial} without serverShadow`)
                if (state.serverShadow.id !== event.boardAttributes.id)
                    throw Error(`Trying to init board with nonmatching id`)
                const events = event.recentEvents
                initialServerSyncEventBuffer.push(...events)
                if (!event.last) {
                    console.log(
                        `Got board.init.diff chunk of ${events.length} events (${events[0].serial}..${
                            events[events.length - 1].serial
                        }), waiting for more...`,
                    )
                    return state
                }

                if (state.serverShadow.serial != event.initAtSerial)
                    throw Error(
                        `Trying to init at ${event.initAtSerial} with local serverShadow at ${state.serverShadow.serial}`,
                    )

                const initialBoard = {
                    ...state.serverShadow,
                    ...event.boardAttributes,
                } as Board

                const queue = state.queue.filter(isBoardHistoryEntry) // Discard old cursor events etc, but keep any offline board events that need to be sent

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

                initialServerSyncEventBuffer = []

                return flushIfPossible({
                    ...state,
                    accessLevel: event.accessLevel,
                    status: "online",
                    board,
                    serverShadow: newServerShadow,
                    sent: [], // Discard information about anything that was sent earlierly and to which we never got an ack for
                    queue,
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
            if (state.status === "online" || state.status === "joining" || state.status === "loading") {
                console.log(`Disconnected. Going to offline mode.`)
            }
            if (state.sent.length > 0) {
                console.log(`Discarding ${state.sent.length} sent events of which we don't have an ack yet`)
                // TODO: should we rollback board too?
            }
            return {
                ...state,
                status: "offline",
                sent: [], // Discard information about anything that was sent earlierly and to which we never got an ack for
                users: [],
                locks: {},
            }
        }
        //console.warn("Unhandled event", event.action);
        return state
    }

    const initialState: BoardState = {
        status: "none" as const,
        accessLevel: "none",
        serverShadow: undefined,
        board: undefined,
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
        L.filter((state) => state.board !== undefined && state.board.serial > 0 && state.status === "online"),
        L.map((state) => {
            return {
                serverShadow: state.serverShadow!,
                queue: state.queue.filter(isBoardHistoryEntry),
            }
        }),
    )
    localBoardToSave.forEach(async (board) => {
        await localStore.storeBoardState(board)
    })

    boardId.forEach(async (boardId) => {
        boardStateFromLocalStorage.set(undefined)
        if (boardId) {
            console.log("Got board id, fetching local state", boardId)
            const storedInitialState = await localStore.getInitialBoardState(boardId)
            boardStateFromLocalStorage.set(storedInitialState)
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
        const bid = boardStateFromLocalStorage.get()?.serverShadow.id
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
