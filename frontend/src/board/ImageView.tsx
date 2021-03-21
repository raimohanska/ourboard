import { h } from "harmaja"
import * as L from "lonna"
import { BoardCoordinateHelper } from "./board-coordinates"
import { Board, Image } from "../../../common/src/domain"
import { BoardFocus } from "./board-focus"
import { SelectionBorder } from "./SelectionBorder"
import { AssetStore } from "../store/asset-store"
import { itemDragToMove } from "./item-dragmove"
import { itemSelectionHandler } from "./item-selection"
import { Dispatch } from "../store/server-connection"
import { Tool, ToolController } from "./tool-selection"

export const ImageView = ({
    id,
    image,
    assets,
    board,
    isLocked,
    focus,
    toolController,
    coordinateHelper,
    dispatch,
}: {
    board: L.Property<Board>
    id: string
    image: L.Property<Image>
    isLocked: L.Property<boolean>
    focus: L.Atom<BoardFocus>
    toolController: ToolController
    coordinateHelper: BoardCoordinateHelper
    dispatch: Dispatch
    assets: AssetStore
}) => {
    const { selected, onClick } = itemSelectionHandler(id, "image", focus)
    const tool = toolController.tool
    return (
        <span
            className="image"
            onClick={onClick}
            ref={itemDragToMove(id, board, focus, toolController, coordinateHelper, dispatch) as any}
            style={L.view(
                image,
                (p: Image) =>
                    ({
                        top: 0,
                        left: 0,
                        transform: `translate(${p.x}em, ${p.y}em)`,
                        height: p.height + "em",
                        width: p.width + "em",
                        zIndex: p.z,
                        position: "absolute",
                    } as any),
            )}
        >
            <img loading="lazy" src={L.view(image, (i) => assets.getAsset(i.assetId, i.src))} />
            {L.view(isLocked, (l) => l && <span className="lock">🔒</span>)}
            {L.view(
                selected,
                tool,
                (s, t) =>
                    s &&
                    t !== "connect" && (
                        <SelectionBorder {...{ id, item: image, coordinateHelper, board, focus, dispatch }} />
                    ),
            )}
        </span>
    )
}
