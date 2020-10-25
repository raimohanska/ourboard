import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board, Image, PostIt } from "../../../common/domain";
import { EditableSpan } from "../components/components"
import { BoardFocus } from "./BoardView";
import { ContextMenu, HIDDEN_CONTEXT_MENU } from "./ContextMenuView"
import { onBoardItemDrag } from "./board-drag"
import { SelectionBorder } from "./SelectionBorder"
import { AssetStore } from "./asset-store";
import { itemDragToMove } from "./item-dragmove";
export type ItemFocus = "none" | "selected" | "editing"

export const ImageView = (
    { id, image, assets, board, focus, coordinateHelper, dispatch }:
    {  
      board: L.Property<Board>, id: string; image: L.Property<Image>, 
      focus: L.Atom<BoardFocus>,
      coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void,
      assets: AssetStore
  }
) => {
  const itemFocus = L.view(focus, f => { // TODO is copy-paste
    if (f.status === "none") return "none"
    if (f.status === "selected") return f.ids.includes(id) ? "selected" : "none"
    return f.id === id ? "editing" : "none"
  })
  const selected = L.view(itemFocus, s => s !== "none")

  function onClick(e: JSX.MouseEvent) { // TODO: is copy-paste
    const f = focus.get()
      if (e.shiftKey && f.status === "selected") {
        if (f.ids.includes(id)) {
            focus.set({ status: "selected", ids: f.ids.filter(i => i !== id)})    
        } else {
            focus.set({ status: "selected", ids: f.ids.concat(id)})    
        }
      } else {
        focus.set({ status: "selected", ids: [id] })
      }      
  }

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