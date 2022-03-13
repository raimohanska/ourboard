import { h } from "harmaja"
import * as L from "lonna"
import { Board, Connection, Image } from "../../../common/src/domain"
import { AssetStore } from "../store/asset-store"
import { Dispatch } from "../store/board-store"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus } from "./board-focus"
import { itemDragToMove } from "./item-dragmove"
import { itemSelectionHandler } from "./item-selection"
import { ToolController } from "./tool-selection"
import { itemZIndex } from "./zIndices"

export const ImageView = ({
    id,
    image,
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
    image: L.Property<Image>
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
        "image",
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
            className="image"
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
                image,
                (p: Image) =>
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
            <img loading="lazy" src={L.view(image, (i) => assets.getAsset(i.assetId, i.src))} />
            {L.view(isLocked, (l) => l && <span className="lock">🔒</span>)}
        </span>
    )
}
