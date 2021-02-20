import { h } from "harmaja"
import * as L from "lonna"
import { BoardCoordinateHelper } from "./board-coordinates"
import { Board, Image } from "../../../common/src/domain"
import { BoardFocus } from "./board-focus"
import { SelectionBorder } from "./SelectionBorder"
import { AssetStore } from "../store/asset-store"
import { itemDragToMove } from "./item-dragmove"
import { itemSelectionHandler } from "./item-selection"
import { Dispatch } from "../store/state-store"

export const ImageView = ({
    id,
    image,
    assets,
    board,
    isLocked,
    focus,
    coordinateHelper,
    dispatch,
}: {
    board: L.Property<Board>
    id: string
    image: L.Property<Image>
    isLocked: L.Property<boolean>
    focus: L.Atom<BoardFocus>
    coordinateHelper: BoardCoordinateHelper
    dispatch: Dispatch
    assets: AssetStore
}) => {
    const { selected, onClick } = itemSelectionHandler(id, focus, board, dispatch)

    return (
        <span
            className="image"
            onClick={onClick}
            ref={itemDragToMove(id, board, focus, coordinateHelper, dispatch) as any}
            style={L.view(
                image,
                (p: Image) =>
                    ({
                        top: p.y + "em",
                        left: p.x + "em",
                        height: p.height + "em",
                        width: p.width + "em",
                        zIndex: p.z,
                        position: "absolute",
                    } as any),
            )}
        >
            <img src={L.view(image, (i) => assets.getAsset(i.assetId, i.src))} />
            {L.view(isLocked, (l) => l && <span className="lock">🔒</span>)}
            {L.view(
                selected,
                (s) => s && <SelectionBorder {...{ id, item: image, coordinateHelper, board, focus, dispatch }} />,
            )}
        </span>
    )
}
