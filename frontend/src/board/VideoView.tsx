import { h } from "harmaja"
import * as L from "lonna"
import { BoardCoordinateHelper } from "./board-coordinates"
import { Board, Connection, Image, Video } from "../../../common/src/domain"
import { BoardFocus } from "./board-focus"
import { AssetStore } from "../store/asset-store"
import { itemDragToMove } from "./item-dragmove"
import { itemSelectionHandler } from "./item-selection"
import { Dispatch } from "../store/board-store"
import { Tool, ToolController } from "./tool-selection"
import { DragBorder } from "./DragBorder"
import { itemZIndex } from "./zIndices"

export const VideoView = ({
    id,
    video,
    assets,
    board,
    isLocked,
    focus,
    toolController,
    coordinateHelper,
    latestConnection,
    dispatch,
}: {
    board: L.Property<Board>
    id: string
    video: L.Property<Video>
    isLocked: L.Property<boolean>
    focus: L.Atom<BoardFocus>
    toolController: ToolController
    coordinateHelper: BoardCoordinateHelper
    latestConnection: L.Property<Connection | null>
    dispatch: Dispatch
    assets: AssetStore
}) => {
    const { selected, onClick, onTouchStart } = itemSelectionHandler(
        id,
        "video",
        focus,
        toolController,
        board,
        coordinateHelper,
        latestConnection,
        dispatch,
    )
    const tool = toolController.tool
    return (
        <span
            className="video"
            onClick={onClick}
            onTouchStart={onTouchStart}
            ref={
                itemDragToMove(
                    id,
                    board,
                    focus,
                    toolController,
                    coordinateHelper,
                    latestConnection,
                    dispatch,
                    false,
                ) as any
            }
            style={L.view(
                video,
                (p: Video) =>
                    ({
                        top: 0,
                        left: 0,
                        transform: `translate(${p.x}em, ${p.y}em)`,
                        height: p.height + "em",
                        width: p.width + "em",
                        zIndex: itemZIndex(p),
                        position: "absolute",
                    } as any),
            )}
        >
            <video id="video" controls={true} preload="none">
                <source id="mp4" src={L.view(video, (i) => assets.getAsset(i.assetId, i.src))} type="video/mp4" />
                <p>Your user agent does not support the HTML5 Video element.</p>
            </video>
            {L.view(isLocked, (l) => l && <span className="lock">🔒</span>)}
            <DragBorder {...{ id, board, toolController, coordinateHelper, latestConnection, focus, dispatch }} />
        </span>
    )
}
