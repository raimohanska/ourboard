import { h } from "harmaja"
import * as L from "lonna"
import { AccessLevel, Board, canWrite, Item, Note } from "../../../../common/src/domain"
import * as G from "../../../../common/src/geometry"
import { BoardStore, Dispatch } from "../../store/board-store"
import { UserSessionState } from "../../store/user-session-store"
import { BoardCoordinateHelper } from "../board-coordinates"
import { BoardFocus } from "../board-focus"
import { BoardZoom } from "../board-scroll-and-zoom"
import { BoardViewMessage } from "../BoardViewMessage"
import { ToolController } from "../tool-selection"
import { IS_TOUCHSCREEN } from "../touchScreen"
import { BackToAllBoardsLink } from "./BackToAllBoardsLink"
import { MainToolBar } from "./MainToolBar"
import { MiniMapView } from "./MiniMapView"
import { UndoRedo } from "./UndoRedo"
import { ZoomControls } from "./ZoomControls"

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
    viewRect: L.Atom<G.Rect>
    zoom: L.Atom<BoardZoom>
    focus: L.Atom<BoardFocus>
}) => {
    const touchMoveStart = L.bus<void>()
    const boardState = boardStore.state
    const boardAccessStatus = L.view(boardState, (s) => s.status)
    const tool = toolController.tool

    return (
        <div className={L.view(accessLevel, (l) => "tool-layer " + (canWrite(l) ? "" : " read-only"))}>
            <BoardViewMessage {...{ boardAccessStatus, sessionState, board }} />

            <div className="navigation-toolbar">
                <BackToAllBoardsLink />
            </div>
            <MainToolBar
                {...{
                    board,
                    containerElement,
                    coordinateHelper,
                    dispatch,
                    focus,
                    latestNote,
                    onAdd,
                    onTouchMoveStart: touchMoveStart.push,
                    toolController,
                    boardStore,
                }}
            />
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
                        <span className="mouse-cursor-message adding-item" style={style}>
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
        </div>
    )
}
