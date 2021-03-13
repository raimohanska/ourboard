import * as H from "harmaja"
import { componentScope, h, ListView } from "harmaja"
import * as L from "lonna"
import { findItem, Id, Image, Item, newNote, Note, UserCursorPosition } from "../../../common/src/domain"
import { isFirefox } from "../components/browser"
import { onClickOutside } from "../components/onClickOutside"
import { UserInfoView } from "../components/UserInfoView"
import { signIn } from "../google-auth"
import { AssetStore } from "../store/asset-store"
import { BoardAccessStatus, BoardState } from "../store/board-store"
import { Dispatch } from "../store/server-connection"
import { UserSessionState } from "../store/user-session-store"
import { boardCoordinateHelper } from "./board-coordinates"
import { boardDragHandler } from "./board-drag"
import { BoardFocus, getSelectedIds, getSelectedItem } from "./board-focus"
import { boardScrollAndZoomHandler } from "./board-scroll-and-zoom"
import { BoardMenu } from "./BoardMenu"
import { ConnectionsView } from "./ConnectionsView"
import { ContextMenuView } from "./ContextMenuView"
import { CursorsView } from "./CursorsView"
import * as G from "./geometry"
import { HistoryView } from "./HistoryView"
import { imageUploadHandler } from "./image-upload"
import { ImageView } from "./ImageView"
import { itemCreateHandler } from "./item-create"
import { cutCopyPasteHandler } from "./item-cut-copy-paste"
import { itemDeleteHandler } from "./item-delete"
import { itemSelectAllHandler } from "./item-select-all"
import { withCurrentContainer } from "./item-setcontainer"
import { itemUndoHandler } from "./item-undo-redo"
import { ItemView } from "./ItemView"
import { localStorageAtom } from "./local-storage-atom"
import { MiniMapView } from "./MiniMapView"
import { PaletteView } from "./PaletteView"
import { RectangularDragSelection } from "./RectangularDragSelection"
import { synchronizeFocusWithServer } from "./synchronize-focus-with-server"

export type Tool = "pan" | "select" | "connect"
export type ControlSettings = {
    tool: Tool
    hasUserManuallySetTool: boolean
}

const emptyNote = newNote("")

export const BoardView = ({
    boardId,
    cursors,
    boardState,
    sessionState,
    assets,
    dispatch,
    navigateToBoard,
}: {
    boardId: string
    cursors: L.Property<UserCursorPosition[]>
    boardState: L.Property<BoardState>
    sessionState: L.Property<UserSessionState>
    assets: AssetStore
    dispatch: Dispatch
    navigateToBoard: (boardId: Id | undefined) => void
}) => {
    const board = L.view(boardState, (s) => s.board!)
    const history = L.view(boardState, "history")
    const locks = L.view(boardState, (s) => s.locks)
    const sessionId = L.view(sessionState, (s) => s.sessionId)
    const sessions = L.view(boardState, (s) => s.users)
    const zoom = L.atom(1)

    const boardElement = L.atom<HTMLElement | null>(null)
    const scrollElement = L.atom<HTMLElement | null>(null)
    const latestNoteId = L.atom<Id | null>(null)
    const latestNote = L.view(latestNoteId, board, (id, b) => {
        const note = id ? findItem(b)(id) : null
        return (note as Note) || emptyNote
    })
    const focus = synchronizeFocusWithServer(board, locks, sessionId, dispatch)
    const coordinateHelper = boardCoordinateHelper(boardElement, scrollElement, zoom)
    const controlSettings = localStorageAtom<ControlSettings>("controlSettings", {
        tool: "pan",
        hasUserManuallySetTool: false,
    })

    let previousFocus: BoardFocus | null = null
    focus.forEach((f) => {
        const previousIDs = previousFocus && getSelectedIds(previousFocus)
        const itemIds = [...getSelectedIds(f)].filter((id) => !previousIDs || !previousIDs.has(id))
        previousFocus = f
        if (itemIds.length > 0) {
            dispatch({ action: "item.front", boardId: board.get().id, itemIds })
            const item = getSelectedItem(board.get())(f)
            if (item && item.type === "note") {
                latestNoteId.set(item.id)
            }
        }
    })

    const doOnUnmount: Function[] = []

    doOnUnmount.push(cutCopyPasteHandler(board, focus, coordinateHelper, dispatch))

    const boardRef = (el: HTMLElement) => {
        boardElement.set(el)
        function onURL(assetId: string, url: string) {
            board.get().items.forEach((i) => {
                if (i.type === "image" && i.assetId === assetId && i.src != url) {
                    dispatch({ action: "item.update", boardId, items: [{ ...i, src: url }] })
                }
            })
        }
        doOnUnmount.push(imageUploadHandler(el, assets, coordinateHelper, focus, onAdd, onURL))
    }

    itemCreateHandler(board, focus, latestNote, boardElement, onAdd)
    itemDeleteHandler(boardId, dispatch, focus)
    itemUndoHandler(dispatch)
    itemSelectAllHandler(board, focus)

    L.fromEvent<JSX.KeyboardEvent>(window, "click")
        .pipe(L.applyScope(componentScope()))
        .forEach((event) => {
            if (!boardElement.get()!.contains(event.target as Node)) {
                // Click outside => reset selection
                focus.set({ status: "none" })
            }
        })

    onClickOutside(boardElement, () => focus.set({ status: "none" }))

    const { viewRect } = boardScrollAndZoomHandler(
        board,
        boardElement,
        scrollElement,
        zoom,
        coordinateHelper,
        controlSettings,
    )

    function onClick(e: JSX.MouseEvent) {
        if (e.target === boardElement.get()) {
            focus.set({ status: "none" })
        }
    }

    function onAdd(item: Item) {
        tool.set("select")
        const point = coordinateHelper.currentBoardCoordinates.get()
        const { x, y } = item.type !== "container" ? G.add(point, { x: -item.width / 2, y: -item.height / 2 }) : point
        item = withCurrentContainer({ ...item, x, y }, board.get())

        dispatch({ action: "item.add", boardId, items: [item] })

        if (item.type === "note" || item.type === "text") {
            focus.set({ status: "editing", id: item.id })
        } else {
            focus.set({ status: "selected", ids: new Set([item.id]) })
        }
    }

    coordinateHelper.currentBoardCoordinates.pipe(L.throttle(30)).forEach((position) => {
        dispatch({ action: "cursor.move", position, boardId })
    })

    const { selectionRect } = boardDragHandler({
        ...{
            board,
            boardElem: boardElement,
            coordinateHelper,
            focus,
            tool: L.view(controlSettings, (c) => c.tool),
            dispatch,
        },
    })

    H.onUnmount(() => {
        doOnUnmount.forEach((fn) => fn())
    })

    const boardAccessStatus = L.view(boardState, (s) => s.status)
    const tool = L.view(controlSettings, "tool")

    const boardDimensionsStyle = L.combineTemplate({
        width: L.view(board, (b) => b.width + "em"),
        height: L.view(board, (b) => b.height + "em"),
    })

    const borderContainerStyle = L.view(boardDimensionsStyle, zoom, (dimensions, z) => ({
        ...dimensions,
        fontSize: z + "em",
    }))

    return (
        <div id="root" className={L.view(boardAccessStatus, (status) => `board-container ${status}`)}>
            <div className="scroll-container" ref={scrollElement.set}>
                <BoardViewHeader
                    boardId={boardId}
                    boardState={boardState}
                    sessionState={sessionState}
                    dispatch={dispatch}
                    controlSettings={controlSettings}
                />
                <BoardViewMessage {...{ boardAccessStatus, sessionState }} />

                <div className="border-container" style={borderContainerStyle}>
                    <div
                        className={L.view(controlSettings, (s) => "board " + s.tool)}
                        draggable={isFirefox ? L.view(focus, (f) => f.status !== "editing") : true}
                        ref={boardRef}
                        onClick={onClick}
                    >
                        <ListView
                            observable={L.view(board, "items")}
                            renderObservable={renderItem}
                            getKey={(i) => i.id}
                        />
                        <RectangularDragSelection {...{ rect: selectionRect }} />
                        <CursorsView {...{ cursors, sessions }} />
                        <ContextMenuView {...{ latestNote, dispatch, board, focus }} />
                        <ConnectionsView {...{ board, zoom, dispatch, focus, coordinateHelper }} />
                    </div>
                </div>
            </div>
            <HistoryView {...{ board, history, focus, dispatch }} />
            {L.view(
                viewRect,
                (r) => r != null,
                (r) => (
                    <MiniMapView board={board} viewRect={viewRect as L.Property<G.Rect>} />
                ),
            )}
        </div>
    )

    function BoardViewHeader({
        boardId,
        controlSettings,
        boardState,
        sessionState,
        dispatch,
    }: {
        boardId: string
        boardState: L.Property<BoardState>
        sessionState: L.Property<UserSessionState>
        controlSettings: L.Atom<ControlSettings>
        dispatch: Dispatch
    }) {
        return (
            <header>
                <a
                    href="/"
                    onClick={(e) => {
                        navigateToBoard(undefined)
                        e.preventDefault()
                    }}
                >
                    <span className="icon back" />
                </a>
                <BoardMenu boardId={boardId} state={boardState} dispatch={dispatch} />

                <div className="controls">
                    <span className="icon zoom_in" title="Zoom in" onClick={() => zoom.modify((z) => z * 1.1)}></span>
                    <span className="icon zoom_out" title="Zoom out" onClick={() => zoom.modify((z) => z / 1.1)}></span>
                    <PaletteView {...{ latestNote, onAdd, board, dispatch }} />
                    <span className="icon undo" title="Undo" onClick={() => dispatch({ action: "ui.undo" })} />
                    <span className="icon redo" title="Redo" onClick={() => dispatch({ action: "ui.redo" })} />
                    <span
                        className={L.view(controlSettings, (s) =>
                            s.tool === "select" ? "icon cursor-arrow active" : "icon cursor-arrow",
                        )}
                        title="Select tool"
                        onClick={() => controlSettings.set({ tool: "select", hasUserManuallySetTool: true })}
                    />
                    <span
                        className={L.view(controlSettings, (s) => (s.tool === "pan" ? "icon pan active" : "icon pan"))}
                        title="Pan tool"
                        onClick={() => controlSettings.set({ tool: "pan", hasUserManuallySetTool: true })}
                    />
                    <span
                        className={L.view(controlSettings, (s) =>
                            s.tool === "connect" ? "icon connection active" : "icon connection",
                        )}
                        title="Connect tool"
                        onClick={() => controlSettings.set({ tool: "connect", hasUserManuallySetTool: true })}
                    />
                </div>

                <UserInfoView state={sessionState} dispatch={dispatch} />
            </header>
        )
    }

    function renderItem(id: string, item: L.Property<Item>) {
        const isLocked = L.combineTemplate({ locks, sessionId }).pipe(
            L.map(({ locks, sessionId }) => !!locks[id] && locks[id] !== sessionId),
        )

        return L.view(L.view(item, "type"), (t) => {
            switch (t) {
                case "container":
                case "text":
                case "note":
                    return (
                        <ItemView
                            {...{
                                board,
                                history,
                                id,
                                type: t,
                                item: item as L.Property<Note>,
                                isLocked,
                                focus,
                                coordinateHelper,
                                dispatch,
                                tool,
                            }}
                        />
                    )
                case "image":
                    return (
                        <ImageView
                            {...{
                                id,
                                image: item as L.Property<Image>,
                                assets,
                                board,
                                isLocked,
                                focus,
                                tool,
                                coordinateHelper,
                                dispatch,
                            }}
                        />
                    )
                default:
                    throw Error("Unsupported item: " + t)
            }
        })
    }
}

const BoardViewMessage = ({
    boardAccessStatus,
    sessionState,
}: {
    boardAccessStatus: L.Property<BoardAccessStatus>
    sessionState: L.Property<UserSessionState>
}) => {
    // TODO: login may be disabled due to Incognito mode or other reasons
    return L.view(boardAccessStatus, (s) => {
        if (s === "denied-permanently") {
            return (
                <div className="board-status-message">
                    <div>
                        <p>
                            Sorry, access denied. Click <a onClick={signIn}>here</a> to sign in with another account.
                        </p>
                    </div>
                </div>
            )
        }
        if (s === "login-required") {
            const ss = sessionState.get()
            if (ss.status === "login-failed") {
                return (
                    <div className="board-status-message">
                        <div>
                            Something went wrong with logging in. Click <a onClick={signIn}>here</a> to try again.
                        </div>
                    </div>
                )
            }
            return (
                <div className="board-status-message">
                    <div>
                        This board is for authorized users only. Click <a onClick={signIn}>here</a> to sign in.
                    </div>
                </div>
            )
        }
        return null
    })
}
