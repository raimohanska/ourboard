import * as H from "harmaja"
import { componentScope, h, ListView } from "harmaja"
import * as L from "lonna"
import _ from "lodash"
import { boardCoordinateHelper } from "./board-coordinates"
import { Image, Item, newNote, newSimilarNote, Note, UserCursorPosition } from "../../../common/src/domain"
import { ItemView } from "./ItemView"
import { BoardAppState, Dispatch } from "../store/board-store"
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
import { BoardFocus, getSelectedIds } from "./board-focus"
import { itemDeleteHandler } from "./item-delete"
import { itemUndoHandler } from "./item-undo-redo"
import { BoardMenu } from "./BoardMenu"
import { UserInfoView } from "../components/UserInfoView"
import { SyncStatusView } from "../components/SyncStatusView"
import { SyncStatus } from "../store/sync-status-store"
import { MiniMapView } from "./MiniMapView"
import { HistoryView } from "./HistoryView"
import { boardScrollAndZoomHandler } from "./board-scroll-and-zoom"
import { boardDragHandler } from "./board-drag"
import { onClickOutside } from "../components/onClickOutside"
import { itemSelectAllHandler } from "./item-select-all"

export const BoardView = ({
    boardId,
    cursors,
    state,
    assets,
    dispatch,
    syncStatus,
}: {
    boardId: string
    cursors: L.Property<UserCursorPosition[]>
    state: L.Property<BoardAppState>
    assets: AssetStore
    dispatch: Dispatch
    syncStatus: L.Property<SyncStatus>
}) => {
    const board = L.view(state, (s) => s.board!)
    const history = L.view(state, "history")
    const locks = L.view(state, (s) => s.locks)
    const userId = L.view(state, (s) => s.userId)
    const sessions = L.view(state, (s) => s.users)
    const zoom = L.atom(1)
    const style = L.combineTemplate({
        fontSize: L.view(zoom, (z) => z + "em"),
        width: L.view(board, (b) => b.width + "em"),
        height: L.view(board, (b) => b.height + "em"),
    })
    const boardElement = L.atom<HTMLElement | null>(null)
    const scrollElement = L.atom<HTMLElement | null>(null)
    const latestNote = L.atom(newNote("Hello"))
    const focus = synchronizeFocusWithServer(board, locks, userId, dispatch)
    const coordinateHelper = boardCoordinateHelper(boardElement, scrollElement, zoom)

    focus.forEach((f) => {
        const itemIds = [...getSelectedIds(f)]
        if (itemIds.length > 0) {
            dispatch({ action: "item.front", boardId: board.get().id, itemIds })
            const item = getSelectedElement(f)
            if (item && item.type === "note") {
                latestNote.set(item)
            }
        }
    })

    cutCopyPasteHandler(board, focus, coordinateHelper, dispatch)

    const boardRef = (el: HTMLElement) => {
        boardElement.set(el)
        function onURL(assetId: string, url: string) {
            board.get().items.forEach((i) => {
                if (i.type === "image" && i.assetId === assetId && i.src != url) {
                    dispatch({ action: "item.update", boardId, items: [{ ...i, src: url }] })
                }
            })
        }
        imageUploadHandler(el, assets, coordinateHelper, focus, onAdd, onURL)
    }

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

    const { viewRect } = boardScrollAndZoomHandler(boardElement, scrollElement, zoom, coordinateHelper)

    function onClick(e: JSX.MouseEvent) {
        if (e.target === boardElement.get()) {
            focus.set({ status: "none" })
        }
    }

    function getSelectedElement(f: BoardFocus): Item | null {
        if (f.status !== "selected" || f.ids.size !== 1) return null
        return board.get().items.find((i) => i.id === [...f.ids][0]) || null
    }

    L.fromEvent<JSX.KeyboardEvent>(window, "dblclick")
        .pipe(L.applyScope(componentScope()))
        .forEach((event) => {
            if (event.target === boardElement.get()! || boardElement.get()!.contains(event.target as Node)) {
                const f = focus.get()
                const selectedElement = getSelectedElement(focus.get())
                if (f.status === "none" || (selectedElement && selectedElement.type === "container")) {
                    const newItem = newSimilarNote(latestNote.get())
                    onAdd(newItem)
                }
            }
        })

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

    const selectionRect = boardDragHandler({ ...{ board, boardElem: boardElement, coordinateHelper, focus, dispatch } })

    return (
        <div id="root" className="board-container">
            <div className="scroll-container" ref={scrollElement.set}>
                <BoardViewHeader boardId={boardId} state={state} dispatch={dispatch} syncStatus={syncStatus} />

                <div className="border-container" style={style}>
                    <div className="board" draggable={true} ref={boardRef} onClick={onClick}>
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
        syncStatus,
        state,
        dispatch,
    }: {
        boardId: string
        syncStatus: L.Property<SyncStatus>
        state: L.Property<BoardAppState>
        dispatch: Dispatch
    }) {
        return (
            <header>
                <a href="/">
                    <span className="icon back" />
                </a>
                <BoardMenu boardId={boardId} state={state} dispatch={dispatch} />

                <div className="controls">
                    <span className="icon zoom_in" title="Zoom in" onClick={() => zoom.modify((z) => z * 1.1)}></span>
                    <span className="icon zoom_out" title="Zoom out" onClick={() => zoom.modify((z) => z / 1.1)}></span>
                    <PaletteView {...{ latestNote, onAdd, board, dispatch }} />
                    <span className="icon undo" title="Undo" onClick={() => dispatch({ action: "undo" })} />
                    <span className="icon redo" title="Redo" onClick={() => dispatch({ action: "redo" })} />
                </div>

                <UserInfoView state={state} dispatch={dispatch} />
                <SyncStatusView syncStatus={syncStatus} />
            </header>
        )
    }

    function renderItem(id: string, item: L.Property<Item>) {
        const isLocked = L.combineTemplate({ locks, userId }).pipe(
            L.map(({ locks, userId }) => !!locks[id] && locks[id] !== userId),
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
