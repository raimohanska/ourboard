import { h } from "harmaja"
import * as L from "lonna"
import { Board, Item, Note } from "../../../../common/src/domain"
import * as G from "../../../../common/src/geometry"
import { RedoIcon, UndoIcon } from "../../components/Icons"
import { BoardStore } from "../../store/board-store"
import { Dispatch } from "../../store/server-connection"
import { BoardCoordinateHelper } from "../board-coordinates"
import { BoardFocus, getSelectedConnectionIds, getSelectedItemIds } from "../board-focus"
import { dispatchDeletion } from "../item-delete"
import { DND_GHOST_HIDING_IMAGE } from "../item-drag"
import { localStorageAtom } from "../local-storage-atom"
import { ToolController } from "../tool-selection"
import { IS_TOUCHSCREEN } from "../touchScreen"
import { PaletteView } from "./PaletteView"
import { ToolSelector } from "./ToolSelector"

export const MainToolBar = ({
    coordinateHelper,
    latestNote,
    containerElement,
    onAdd,
    toolController,
    focus,
    dispatch,
    board,
    onTouchMoveStart,
    boardStore,
}: {
    coordinateHelper: BoardCoordinateHelper
    latestNote: L.Property<Note>
    containerElement: L.Atom<HTMLElement | null>
    onAdd: (i: Item) => void
    toolController: ToolController
    focus: L.Atom<BoardFocus>
    dispatch: Dispatch
    board: L.Property<Board>
    onTouchMoveStart: () => void
    boardStore: BoardStore
}) => {
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
        onTouchMoveStart()
    }
    const onTouchStart = (e: JSX.TouchEvent) => {
        e.preventDefault()
    }
    const toolbarStyle = L.view(toolbarPosition, (p) => ({
        top: p.y || undefined,
        left: p.x || undefined,
        transform: p.x !== undefined ? "none" : undefined,
    }))

    return (
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
            onTouchStart={onTouchStart}
        >
            <PaletteView {...{ latestNote, addItem: onAdd, focus, tool: toolController.tool }} />
            <ToolSelector {...{ toolController }} />
            {<DeleteIcon {...{ focus, dispatch, board }} />}
            {<UndoToolIcon {...{ boardStore, dispatch }} />}
            {<RedoToolIcon {...{ boardStore, dispatch }} />}
        </div>
    )
}

type UndoProps = {
    dispatch: Dispatch
    boardStore: BoardStore
}
const UndoToolIcon = ({ dispatch, boardStore }: UndoProps) => {
    const undo = () => dispatch({ action: "ui.undo" })
    return (
        <span className="tool undo" title="Undo" onMouseDown={undo} onTouchStart={undo}>
            <span className="icon">
                <UndoIcon enabled={boardStore.canUndo} />
            </span>
            <span className="text">Undo</span>
        </span>
    )
}

const RedoToolIcon = ({ dispatch, boardStore }: UndoProps) => {
    const redo = () => dispatch({ action: "ui.redo" })
    return (
        <span className="tool redo" title="Redo" onMouseDown={redo}>
            <span className="icon">
                <RedoIcon enabled={boardStore.canRedo} />
            </span>
            <span className="text">Redo</span>
        </span>
    )
}

type DeleteProps = {
    focus: L.Atom<BoardFocus>
    board: L.Property<Board>
    dispatch: Dispatch
}

const DeleteIcon = ({ focus, board, dispatch }: DeleteProps) => {
    const enabled = L.view(focus, (f) => getSelectedConnectionIds(f).size > 0 || getSelectedItemIds(f).size > 0)
    const deleteItem = () => dispatchDeletion(board.get().id, focus.get(), dispatch)
    return (
        <span className="tool" title="Delete selected item(s)" onMouseDown={deleteItem} onTouchStart={deleteItem}>
            <span className={L.view(enabled, (e) => (e ? "icon" : "icon disabled"))}>
                <svg viewBox="0 0 24 24">
                    <path
                        fill="currentColor"
                        d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"
                    />
                </svg>
            </span>
            <span className="text">Delete</span>
        </span>
    )
}
