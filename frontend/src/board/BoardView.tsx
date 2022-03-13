import * as H from "harmaja"
import { componentScope, h, ListView } from "harmaja"
import * as L from "lonna"
import {
    Board,
    canWrite,
    findConnection,
    findItem,
    Id,
    Image,
    Item,
    newNote,
    Note,
    Video,
} from "../../../common/src/domain"
import { isFirefox } from "../components/browser"
import { ModalContainer } from "../components/ModalContainer"
import { onClickOutside } from "../components/onClickOutside"
import { isEmbedded } from "../embedding"
import { AssetStore } from "../store/asset-store"
import { BoardState, BoardStore, Dispatch } from "../store/board-store"
import { CursorsStore } from "../store/cursors-store"
import { UserSessionState } from "../store/user-session-store"
import { boardCoordinateHelper } from "./board-coordinates"
import { boardDragHandler } from "./board-drag"
import {
    BoardFocus,
    getSelectedItemIds,
    getSelectedItem,
    getSelectedItems,
    noFocus,
    getSelectedConnectionIds,
} from "./board-focus"
import { boardScrollAndZoomHandler } from "./board-scroll-and-zoom"
import { BoardToolLayer } from "./toolbars/BoardToolLayer"
import { ConnectionsView } from "./ConnectionsView"
import { ContextMenuView } from "./contextmenu/ContextMenuView"
import { CursorsView } from "./CursorsView"
import * as G from "../../../common/src/geometry"
import { imageUploadHandler, imageDropHandler } from "./image-upload"
import { ImageView } from "./ImageView"
import { itemCreateHandler } from "./item-create"
import { cutCopyPasteHandler } from "./item-cut-copy-paste"
import { itemDeleteHandler } from "./item-delete"
import { itemDuplicateHandler } from "./item-duplicate"
import { itemMoveWithArrowKeysHandler } from "./item-move-with-arrow-keys"
import { itemSelectAllHandler } from "./item-select-all"
import { withCurrentContainer } from "./item-setcontainer"
import { itemUndoHandler } from "./item-undo-redo"
import { ItemView } from "./ItemView"
import { installKeyboardShortcut, plainKey } from "./keyboard-shortcuts"
import { RectangularDragSelection } from "./RectangularDragSelection"
import { SelectionBorder } from "./SelectionBorder"
import { synchronizeFocusWithServer } from "./synchronize-focus-with-server"
import { ToolController } from "./tool-selection"
import { BoardViewHeader } from "./header/BoardViewHeader"
import { VideoView } from "./VideoView"
import { startConnecting } from "./item-connect"
import { emptySet } from "../../../common/src/sets"

const emptyNote = newNote("")

export const BoardView = ({
    boardId,
    cursors,
    boardStore,
    sessionState,
    assets,
    dispatch,
}: {
    boardId: string
    cursors: CursorsStore
    boardStore: BoardStore
    sessionState: L.Property<UserSessionState>
    assets: AssetStore
    dispatch: Dispatch
}) => {
    const boardState = boardStore.state
    const board = boardState.pipe(
        L.map((s: BoardState) => s.board!),
        L.filter((b: Board) => !!b, componentScope()),
    )
    const accessLevel = L.view(boardState, "accessLevel")
    const history = L.view(boardState, "serverHistory")
    const locks = L.view(boardState, (s) => s.locks)
    const sessionId = L.view(sessionState, (s) => s.sessionId)
    const sessions = L.view(boardState, (s) => s.users)
    const zoom = L.atom({ zoom: 1, quickZoom: 1 })

    const containerElement = L.atom<HTMLElement | null>(null)
    const scrollElement = L.atom<HTMLElement | null>(null)
    const boardElement = L.atom<HTMLElement | null>(null)
    const latestNoteId = L.atom<Id | null>(null)
    const latestNote = L.view(latestNoteId, board, (id, b) => {
        const note = id ? findItem(b)(id) : null
        return (note as Note) || emptyNote
    })
    const latestConnectionId = L.atom<Id | null>(null)
    const latestConnection = L.view(latestConnectionId, board, (id, b) => {
        return id ? findConnection(b)(id) : null
    })
    const focus = synchronizeFocusWithServer(board, locks, sessionId, dispatch)
    const coordinateHelper = boardCoordinateHelper(containerElement, scrollElement, boardElement, zoom)
    const toolController = ToolController()
    const tool = toolController.tool

    let previousFocus: BoardFocus | null = null
    focus.forEach((f) => {
        const previousIDs = previousFocus && getSelectedItemIds(previousFocus)
        const itemIds = [...getSelectedItemIds(f)].filter((id) => !previousIDs || !previousIDs.has(id))
        previousFocus = f
        if (itemIds.length > 0) {
            dispatch({ action: "item.front", boardId: board.get().id, itemIds })
            const item = getSelectedItem(board.get())(f)
            if (item && item.type === "note") {
                latestNoteId.set(item.id)
            }
        }
        const connectionId = [...getSelectedConnectionIds(f)][0]
        if (connectionId) {
            latestConnectionId.set(connectionId)
        }
    })

    tool.pipe(L.changes).forEach((tool) => {
        if (tool !== "note" && tool !== "container" && tool !== "text" && focus.get().status === "adding") {
            focus.set(noFocus)
        }
    })

    const doOnUnmount: Function[] = []

    const itemsList = L.view(L.view(board, "items"), Object.values)

    function onURL(assetId: string, url: string) {
        itemsList.get().forEach((i) => {
            if ((i.type === "image" || i.type === "video") && i.assetId === assetId && i.src != url) {
                dispatch({ action: "item.update", boardId, items: [{ ...i, src: url }] })
            }
        })
    }
    const uploadImageFile = imageUploadHandler(assets, coordinateHelper, onAdd, onURL)

    doOnUnmount.push(cutCopyPasteHandler(board, focus, coordinateHelper, dispatch, uploadImageFile))

    imageDropHandler(boardElement, assets, focus, uploadImageFile)
    itemCreateHandler(board, focus, latestNote, boardElement, onAdd)
    itemDeleteHandler(boardId, dispatch, focus)
    itemDuplicateHandler(board, dispatch, focus)
    itemMoveWithArrowKeysHandler(board, dispatch, focus)
    itemUndoHandler(dispatch)
    itemSelectAllHandler(board, focus)
    installKeyboardShortcut(
        (e) => e.key === "Escape",
        () => {
            toolController.useDefaultTool()
            focus.set(noFocus)
        },
    )
    installKeyboardShortcut(plainKey("c"), () => toolController.tool.set("connect"))
    L.fromEvent<JSX.KeyboardEvent>(window, "click")
        .pipe(L.applyScope(componentScope()))
        .forEach((event) => {
            if (!boardElement.get()!.contains(event.target as Node)) {
                // Click outside => reset selection
                focus.set(noFocus)
            }
        })

    onClickOutside(boardElement, () => {
        focus.set(noFocus)
    })

    const { viewRect } = boardScrollAndZoomHandler(
        board,
        boardElement,
        scrollElement,
        zoom,
        coordinateHelper,
        toolController,
    )

    function onClick(e: JSX.UIEvent) {
        const f = focus.get()
        if (f.status === "connection-adding") {
            toolController.useDefaultTool()
        } else if (f.status === "adding") {
            onAdd(f.item)
        } else {
            if (e.target === boardElement.get()) {
                if (tool.get() === "connect") {
                    startConnecting(
                        board,
                        coordinateHelper,
                        latestConnection,
                        dispatch,
                        toolController,
                        focus,
                        coordinateHelper.currentBoardCoordinates.get(),
                    )
                } else {
                    focus.set(noFocus)
                }
            }
        }
    }

    function onAdd(item: Item) {
        toolController.useDefaultTool()
        const point = coordinateHelper.currentBoardCoordinates.get()
        const { x, y } = item.type !== "container" ? G.add(point, { x: -item.width / 2, y: -item.height / 2 }) : point
        item = withCurrentContainer({ ...item, x, y }, board.get())

        dispatch({ action: "item.add", boardId, items: [item], connections: [] })

        if (item.type === "note" || item.type === "text") {
            focus.set({ status: "editing", itemId: item.id })
        } else {
            focus.set({ status: "selected", itemIds: new Set([item.id]), connectionIds: emptySet() })
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
            latestConnection,
            focus,
            toolController,
            dispatch,
        },
    })

    H.onUnmount(() => {
        doOnUnmount.forEach((fn) => fn())
    })

    const boardAccessStatus = L.view(boardState, (s) => s.status)
    const quickZoom = L.view(zoom, "quickZoom")
    const mainZoom = L.view(zoom, "zoom")
    const borderContainerStyle = L.combineTemplate({
        width: L.view(board, quickZoom, (b) => b.width + "em"),
        height: L.view(board, quickZoom, (b) => b.height + "em"),
        fontSize: L.view(mainZoom, (z) => z + "em"),
        transform: L.view(quickZoom, (z) => {
            const percentTranslate = ((z - 1) / 2) * 100
            return `translate(${percentTranslate}%, ${percentTranslate}%) scale(${z})`
        }),
        "will-change": "transform, fontSize",
    })

    const className = L.view(
        boardAccessStatus,
        (status) => `board-container ${isEmbedded() ? "embedded" : ""} ${status}`,
    )

    const items = L.view(L.view(board, "items"), Object.values)
    const selectedItems = L.view(board, focus, (b, f) => getSelectedItems(b)(f))
    const modalContent = L.atom<any>(null)

    L.interval(100, null, componentScope()).forEach(() => {
        if (window.scrollY !== 0 || window.scrollX !== 0) {
            if (focus.get().status !== "editing") {
                // Reset scroll position when not editing. At least iOS seems to need this. It's vital that our scroll pos stays at origin.
                window.scrollTo(0, 0)
            }
        }
    })
    return (
        <div id="root" className={className}>
            <ModalContainer content={modalContent} />
            <BoardViewHeader
                {...{
                    board,
                    usersOnBoard: L.view(boardState, "users"),
                    sessionState,
                    dispatch,
                    accessLevel,
                    modalContent,
                    eventsFromServer: boardStore.eventsFromServer,
                }}
            />
            <div className="content-container" ref={containerElement.set}>
                <div className="scroll-container" ref={scrollElement.set}>
                    <div className="border-container" style={borderContainerStyle}>
                        <div
                            className={L.view(tool, (t) => "board " + t)}
                            draggable={isFirefox ? L.view(focus, (f) => f.status !== "editing") : true}
                            ref={boardElement.set}
                            onClick={onClick}
                            onTouchEnd={onClick}
                        >
                            <ListView observable={items} renderObservable={renderItem} getKey={(i) => i.id} />

                            {L.view(tool, (t) =>
                                t === "connect" ? null : (
                                    <ListView
                                        observable={selectedItems}
                                        renderObservable={renderSelectionBorder}
                                        getKey={(i) => i.id}
                                    />
                                ),
                            )}
                            <RectangularDragSelection {...{ rect: selectionRect }} />
                            <CursorsView {...{ cursors, sessions, viewRect }} />
                            {L.view(accessLevel, canWrite, (s) =>
                                s ? <ContextMenuView {...{ latestNote, dispatch, board, focus, viewRect }} /> : null,
                            )}
                            <ConnectionsView {...{ board, zoom, dispatch, focus, coordinateHelper }} />
                        </div>
                    </div>
                </div>
                <BoardToolLayer
                    {...{
                        board,
                        accessLevel,
                        boardStore,
                        containerElement,
                        coordinateHelper,
                        dispatch,
                        zoom,
                        focus,
                        latestNote,
                        onAdd,
                        toolController,
                        sessionState,
                        viewRect,
                    }}
                />
            </div>
        </div>
    )

    function renderSelectionBorder(id: string, item: L.Property<Item>) {
        return <SelectionBorder {...{ id, tool, item: item, coordinateHelper, board, focus, dispatch }} />
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
                                latestConnection,
                                dispatch,
                                toolController,
                                accessLevel,
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
                                toolController,
                                coordinateHelper,
                                latestConnection,
                                dispatch,
                            }}
                        />
                    )
                case "video":
                    return (
                        <VideoView
                            {...{
                                id,
                                video: item as L.Property<Video>,
                                assets,
                                board,
                                isLocked,
                                focus,
                                toolController,
                                coordinateHelper,
                                latestConnection,
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
