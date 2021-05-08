import { h } from "harmaja"
import * as L from "lonna"
import { AccessLevel, Board, Id, Item, Note, canWrite } from "../../../common/src/domain"
import { BoardStore, Dispatch } from "../store/board-store"
import { UserSessionState } from "../store/user-session-store"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus } from "./board-focus"
import { BoardZoom } from "./board-scroll-and-zoom"
import { BoardViewMessage } from "./BoardViewMessage"
import * as G from "./geometry"
import { HistoryView } from "./HistoryView"
import { DND_GHOST_HIDING_IMAGE } from "./item-drag"
import { localStorageAtom } from "./local-storage-atom"
import { MiniMapView } from "./MiniMapView"
import { ToolController } from "./tool-selection"
import { BackToAllBoardsLink } from "./toolbars/BackToAllBoardsLink"
import { PaletteView } from "./toolbars/PaletteView"
import { ToolSelector } from "./toolbars/ToolSelector"
import { UndoRedo } from "./toolbars/UndoRedo"
import { ZoomControls } from "./toolbars/ZoomControls"

export const BoardToolLayer = ({
    boardStore,
    coordinateHelper,
    latestNote,
    containerElement,
    sessionState,
    board,
    accessLevel,
    onAdd,
    toolController,
    dispatch,
    viewRect,
    zoom,
    focus,
}: {
    boardStore: BoardStore
    coordinateHelper: BoardCoordinateHelper
    latestNote: L.Property<Note>
    containerElement: L.Atom<HTMLElement | null>
    sessionState: L.Property<UserSessionState>
    board: L.Property<Board>
    accessLevel: L.Property<AccessLevel>
    onAdd: (i: Item) => void
    toolController: ToolController
    dispatch: Dispatch
    viewRect: L.Property<G.Rect>
    zoom: L.Atom<BoardZoom>
    focus: L.Atom<BoardFocus>
}) => {
    const boardState = boardStore.state
    const history = L.view(boardState, "serverHistory")
    const boardAccessStatus = L.view(boardState, (s) => s.status)
    const tool = toolController.tool
    type ToolbarPosition = { x?: number; y?: number; orientation: "vertical" | "horizontal" }
    const toolbarPosition = localStorageAtom<ToolbarPosition>("toolbarPosition", { orientation: "horizontal" })
    const toolbarEl = L.atom<HTMLElement | null>(null)
    let cursorPosAtStart: G.Coordinates | null = null
    let elementStartPos: G.Rect | null = null

    const onDrag = (e: JSX.DragEvent) => {
        if (!cursorPosAtStart) return
        e.preventDefault()
        const cursorCurrentPos = coordinateHelper.currentPageCoordinates.get()

        const diff = G.subtract(cursorCurrentPos, cursorPosAtStart)

        const minY = 70
        const minX = 16
        const boardRect = containerElement.get()!.getBoundingClientRect()
        const boardViewCenter = boardRect.x + boardRect.width / 2
        const toolbarCenter = elementStartPos!.x + diff.x + elementStartPos!.width / 2
        const centerDiff = Math.abs(toolbarCenter - boardViewCenter)

        const newPos = {
            x: Math.max(elementStartPos!.x + diff.x, minX),
            y: Math.max(elementStartPos!.y + diff.y, minY),
        }

        if (newPos.y === minY && centerDiff < 40) {
            // If on top, fix to center default location
            toolbarPosition.set({ orientation: "horizontal" })
        } else {
            toolbarPosition.set({ ...newPos, orientation: newPos.x < 100 ? "vertical" : "horizontal" })
        }
    }
    const onDragOver = (e: JSX.DragEvent) => {
        e.preventDefault()
        // We need to contribute to currentPageCoordinates, otherwise they won't be updated when dragging over the menubar itself
        coordinateHelper.currentPageCoordinates.set({ x: e.clientX, y: e.clientY })
    }
    const onDragStart = (e: JSX.DragEvent) => {
        if (e.target !== toolbarEl.get()) return // drag started on a palette item
        cursorPosAtStart = { x: e.clientX, y: e.clientY }
        e.dataTransfer?.setDragImage(DND_GHOST_HIDING_IMAGE, 0, 0)
        elementStartPos = toolbarEl.get()!.getBoundingClientRect()
    }
    const onDragEnd = (e: JSX.DragEvent) => {
        cursorPosAtStart = null
    }
    const toolbarStyle = L.view(toolbarPosition, (p) => ({
        top: p.y || undefined,
        left: p.x || undefined,
        transform: p.x !== undefined ? "none" : undefined,
    }))
    return (
        <div className={L.view(accessLevel, (l) => "tool-layer " + (canWrite(l) ? "" : " read-only"))}>
            <BoardViewMessage {...{ boardAccessStatus, sessionState, board }} />

            <div className="navigation-toolbar">
                <BackToAllBoardsLink />
            </div>
            <div
                className={L.view(toolbarPosition, (o) => `main-toolbar board-tool ${o.orientation}`)}
                style={toolbarStyle}
                ref={toolbarEl.set}
                draggable="true"
                onDragOver={onDragOver}
                onDrag={onDrag}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            >
                <PaletteView {...{ latestNote, addItem: onAdd, focus }} />
                <ToolSelector {...{ toolController }} />
            </div>
            <div className="undo-redo-toolbar board-tool">
                <UndoRedo {...{ dispatch, boardStore }} />
            </div>
            <MiniMapView board={board} viewRect={viewRect} />
            <div className="zoom-toolbar board-tool">
                <ZoomControls {...{ zoom }} />
            </div>
            <HistoryView {...{ board, history, focus, dispatch }} />

            {L.view(focus, (f) => {
                if (f.status !== "adding") return null
                const style = L.view(coordinateHelper.currentBoardViewPortCoordinates, (p) => ({
                    position: "absolute",
                    left: `${p.x - 20}px`,
                    top: `${p.y - 20}px`,
                    pointerEvents: "none",
                }))
                return (
                    <span className="item-adding" style={style}>
                        {f.element}
                    </span>
                )
            })}

            {L.view(focus, tool, (f, t) => {
                if (t !== "connect") return null
                const text =
                    f.status === "connection-adding"
                        ? "Finish by clicking on target"
                        : "Click on an item to make a connection"

                const style = L.view(coordinateHelper.currentBoardViewPortCoordinates, (p) => ({
                    position: "absolute",
                    left: `${p.x}px`,
                    top: `${p.y + 20}px`,
                    fontSize: "0.8rem",
                    pointerEvents: "none",
                    color: "#000000aa",
                }))
                return (
                    <span className="item-adding" style={style}>
                        {text} 
                    </span>
                )
            })}
        </div>
    )
}
