import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board, Id, Image, ItemLocks } from "../../../common/domain";
import { BoardFocus } from "./BoardView";
import { SelectionBorder } from "./SelectionBorder"
import { AssetStore } from "./asset-store";
import { itemDragToMove } from "./item-dragmove";
import { itemSelectionHandler } from "./item-selection"
import { ContextMenu } from "./ContextMenuView";

export const ImageView = (
    { id, image, assets, board, locks, userId, focus, coordinateHelper, contextMenu, dispatch }:
    {  
      board: L.Property<Board>, id: string; image: L.Property<Image>,
      locks: L.Property<ItemLocks>,
      userId: L.Property<Id | null> 
      focus: L.Atom<BoardFocus>,
      coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void,
      assets: AssetStore, contextMenu: L.Atom<ContextMenu>
  }
) => {

  const { selected, onClick } = itemSelectionHandler(id, focus, contextMenu, board, userId, locks, dispatch)

  return <span 
    className="image"       
    onPointerDown={onClick}
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
      src={ L.view(image, i => assets.getAsset(i.assetId, i.src))}
    />
    { L.view(locks, l => l[id] && l[id] !== userId.get() ? <span className="lock">🔒</span> : null )}
    { L.view(selected, s => s ? <SelectionBorder {...{ id, item: image, coordinateHelper, board, focus, dispatch}}/> : null) }
  </span>
};