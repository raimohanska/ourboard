import * as H from "harmaja"
import { componentScope, h, ListView } from "harmaja"
import * as L from "lonna"
import _ from "lodash"
import { boardCoordinateHelper } from "./board-coordinates"
import { Id, Image, Item, newNote, newSimilarNote, Note, UserCursorPosition } from "../../../common/src/domain"
import { ItemView } from "./ItemView"
import { Dispatch, UserSessionState } from "../store/user-session-store"
import { ContextMenuView } from "./ContextMenuView"
import { PaletteView } from "./PaletteView"
import { CursorsView } from "./CursorsView"
import { ImageView } from "./ImageView"
import { imageUploadHandler } from "./image-upload"
import { AssetStore } from "../store/asset-store"
import { cutCopyPasteHandler } from "./item-cut-copy-paste"
import { RectangularDragSelection } from "./RectangularDragSelection"
import * as G from "./geometry"
import { withCurrentContainer } from "./item-setcontainer"
import { synchronizeFocusWithServer } from "./synchronize-focus-with-server"
import { BoardFocus, getSelectedIds, getSelectedItem } from "./board-focus"
import { itemDeleteHandler } from "./item-delete"
import { itemUndoHandler } from "./item-undo-redo"
import { BoardMenu } from "./BoardMenu"
import { UserInfoView } from "../components/UserInfoView"
import { MiniMapView } from "./MiniMapView"
import { HistoryView } from "./HistoryView"
import { boardScrollAndZoomHandler } from "./board-scroll-and-zoom"
import { boardDragHandler } from "./board-drag"
import { onClickOutside } from "../components/onClickOutside"
import { itemSelectAllHandler } from "./item-select-all"
import { localStorageAtom } from "./local-storage-atom"
import { isFirefox } from "../components/browser"
import { itemCreateHandler } from "./item-create"
import { BoardAccessStatus, BoardState } from "../store/board-store"
import { signIn } from "../google-auth"

export type ControlMode = "mouse" | "trackpad"
export type ControlSettings = {
    mode: ControlMode
    hasUserManuallySetMode: boolean
}

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
    const style = L.combineTemplate({
        fontSize: L.view(zoom, (z) => z + "em"),
        width: L.view(board, (b) => b.width + "em"),
        height: L.view(board, (b) => b.height + "em"),
    })
    const boardElement = L.atom<HTMLElement | null>(null)
    const scrollElement = L.atom<HTMLElement | null>(null)
    const latestNote = L.atom(newNote("Hello"))
    const focus = synchronizeFocusWithServer(board, locks, sessionId, dispatch)
    const coordinateHelper = boardCoordinateHelper(boardElement, scrollElement, zoom)
    const controlSettings = localStorageAtom<ControlSettings>("controlSettings", {
        mode: "mouse",
        hasUserManuallySetMode: false,
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
                latestNote.set(item)
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

    const { viewRect } = boardScrollAndZoomHandler(boardElement, scrollElement, zoom, coordinateHelper, controlSettings)

    function onClick(e: JSX.MouseEvent) {
        if (e.target === boardElement.get()) {
            focus.set({ status: "none" })
        }
    }

    function onAdd(item: Item) {
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

    const selectionRect = boardDragHandler({
        ...{
            board,
            boardElem: boardElement,
            coordinateHelper,
            focus,
            controlMode: L.view(controlSettings, (c) => c.mode),
            dispatch,
        },
    })

    H.onUnmount(() => {
        doOnUnmount.forEach((fn) => fn())
    })

    const boardAccessStatus = L.view(boardState, (s) => s.status)

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

                <div className="border-container" style={style}>
                    <div
                        className={L.view(controlSettings, (s) => "board " + s.mode)}
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
                    </div>
                </div>
            </div>
            <HistoryView board={board} history={history} focus={focus} />
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
                            s.mode === "trackpad" ? "icon cursor-arrow active" : "icon cursor-arrow",
                        )}
                        title="Select tool"
                        onClick={() => controlSettings.set({ mode: "trackpad", hasUserManuallySetMode: true })}
                    />
                    <span
                        className={L.view(controlSettings, (s) =>
                            s.mode === "mouse" ? "icon pan active" : "icon pan",
                        )}
                        title="Pan tool"
                        onClick={() => controlSettings.set({ mode: "mouse", hasUserManuallySetMode: true })}
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
