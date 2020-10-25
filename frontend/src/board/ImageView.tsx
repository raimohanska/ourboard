import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board, Image } from "../../../common/domain";
import { BoardFocus } from "./BoardView";
import { SelectionBorder } from "./SelectionBorder"
import { AssetStore } from "./asset-store";
import { itemDragToMove } from "./item-dragmove";
import { itemSelectionHandler } from "./item-selection"
import { ContextMenu } from "./ContextMenuView";

export const ImageView = (
    { id, image, assets, board, focus, coordinateHelper, contextMenu, dispatch }:
    {  
      board: L.Property<Board>, id: string; image: L.Property<Image>, 
      focus: L.Atom<BoardFocus>,
      coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void,
      assets: AssetStore, contextMenu: L.Atom<ContextMenu>
  }
) => {

  const { selected, onClick } = itemSelectionHandler(id, focus, contextMenu)

  return <span 
    className="image"       
    onClick={onClick}
    ref={itemDragToMove(id, board, focus, coordinateHelper, dispatch) as any}
    style={image.pipe(L.map((p: Image) => ({
      top: p.y + "em",
      left: p.x + "em",
      height: p.height + "em",
      width: p.width + "em",
      position: "absolute"
    })))}
  >
    <img 
      src={ L.view(image, i => assets.getAsset(i.assetId))}
    />
    { L.view(selected, s => s ? <SelectionBorder {...{ id, item: image, coordinateHelper, board, focus, dispatch}}/> : null) }
  </span>
};