import { componentScope, h } from "harmaja"
import * as L from "lonna"
import { AccessLevel, Board, canWrite, Item, Note } from "../../../common/src/domain"
import { BoardStore, Dispatch } from "../store/board-store"
import { UserSessionState } from "../store/user-session-store"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus, getSelectedConnectionIds, getSelectedItemIds } from "./board-focus"
import { BoardZoom } from "./board-scroll-and-zoom"
import { BoardViewMessage } from "./BoardViewMessage"
import * as G from "../../../common/src/geometry"
import { DND_GHOST_HIDING_IMAGE } from "./item-drag"
import { localStorageAtom } from "./local-storage-atom"
import { MiniMapView } from "./MiniMapView"
import { ToolController } from "./tool-selection"
import { BackToAllBoardsLink } from "./toolbars/BackToAllBoardsLink"
import { PaletteView } from "./toolbars/PaletteView"
import { ToolSelector } from "./toolbars/ToolSelector"
import { UndoRedo } from "./toolbars/UndoRedo"
import { ZoomControls } from "./toolbars/ZoomControls"
import { dispatchDeletion } from "./item-delete"
import { IS_TOUCHSCREEN } from "./touchScreen"

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
    const touchMoveStart = L.bus<void>()
    const showTouchNotice = stayTrueFor(touchMoveStart, 1000, componentScope())
    const boardState = boardStore.state
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
    const onTouchMove = (e: JSX.TouchEvent) => {
        e.preventDefault()
        touchMoveStart.push()
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
                onTouchMove={onTouchMove}
            >
                <PaletteView {...{ latestNote, addItem: onAdd, focus }} />
                <ToolSelector {...{ toolController }} />
                {IS_TOUCHSCREEN && <DeleteIcon {...{ focus, dispatch, board }} />}
            </div>
            <div className="undo-redo-toolbar board-tool">
                <UndoRedo {...{ dispatch, boardStore }} />
            </div>
            <MiniMapView board={board} viewRect={viewRect} />
            <div className="zoom-toolbar board-tool">
                <ZoomControls {...{ zoom }} />
            </div>

            {L.view(focus, (f) => {
                if (f.status !== "adding") return null
                if (IS_TOUCHSCREEN) {
                    return (
                        <span className="tool-instruction">
                            {"Click on the board to place new item"}
                            {f.element}
                        </span>
                    )
                } else {
                    const style = L.view(coordinateHelper.currentBoardViewPortCoordinates, (p) => ({
                        position: "absolute",
                        left: `${p.x - 20}px`,
                        top: `${p.y - 20}px`,
                        pointerEvents: "none",
                    }))
                    return (
                        <span className="mouse-cursor-message" style={style}>
                            {f.element}
                        </span>
                    )
                }
            })}

            {L.view(focus, tool, (f, t) => {
                if (t !== "connect") return null
                const text =
                    f.status === "connection-adding"
                        ? "Finish by clicking on target"
                        : "Click on an item or location to make a connection"
                if (IS_TOUCHSCREEN) {
                    return <span className="tool-instruction">{text}</span>
                } else {
                    const style = L.view(coordinateHelper.currentBoardViewPortCoordinates, (p) => ({
                        position: "absolute",
                        left: `${p.x}px`,
                        top: `${p.y + 20}px`,
                        fontSize: "0.8rem",
                        pointerEvents: "none",
                        color: "#000000aa",
                    }))
                    return (
                        <span className="mouse-cursor-message" style={style}>
                            {text}
                        </span>
                    )
                }
            })}

            {L.view(showTouchNotice, show => {
                if (!show) return null
                return <span className="tool-instruction">{"Click on menu to add items"}</span>
            })}
        </div>
    )
}

type DeleteProps = {
    focus: L.Atom<BoardFocus>
    board: L.Property<Board>
    dispatch: Dispatch
}

const DeleteIcon = ({ focus, board, dispatch }: DeleteProps) => {
    const enabled = L.view(focus, (f) => getSelectedConnectionIds(f).size > 0 || getSelectedItemIds(f).size > 0)
    return (
        <span
            className={L.view(enabled, (e) => (e ? "tool icon" : "tool icon disabled"))}
            title="Delete selected item(s)"
            onMouseDown={() => dispatchDeletion(board.get().id, focus.get(), dispatch)}
        >
            <svg viewBox="0 0 24 24">
                <path
                    fill="currentColor"
                    d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"
                />
            </svg>
        </span>
    )
}

function stayTrueFor(trigger: L.EventStream<any>, delay: number, scope: L.Scope): L.Property<boolean> {
    const delayed = trigger.pipe(L.debounce(delay, scope))
    return awaiting(trigger, delayed, scope)
}

function awaiting(first: L.EventStream<any>, second: L.EventStream<any>, scope: L.Scope): L.Property<boolean> {
    return L.merge(
        L.view(first, () => true),
        L.view(second, () => false)
    ).pipe(L.toProperty(false, scope))
}
