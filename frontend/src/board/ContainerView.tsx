import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board, Id, PostIt, ItemLocks, Container } from "../../../common/domain";
import { EditableSpan } from "../components/components"
import { BoardFocus } from "./BoardView";
import { ContextMenu, HIDDEN_CONTEXT_MENU } from "./ContextMenuView"
import { onBoardItemDrag } from "./item-drag"
import { SelectionBorder } from "./SelectionBorder"
import { itemDragToMove } from "./item-dragmove"
import { itemSelectionHandler } from "./item-selection";

export const ContainerView = (
    { board, id, container, locks, userId, focus, coordinateHelper, dispatch, contextMenu }:
    {  
        board: L.Property<Board>, id: string; container: L.Property<Container>,
        locks: L.Property<ItemLocks>,
        userId: L.Property<Id | null>,
        focus: L.Atom<BoardFocus>,
        coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void,
        contextMenu: L.Atom<ContextMenu>
    }
) => {

  const ref = itemDragToMove(id, board, focus, coordinateHelper, dispatch)

  const { itemFocus, selected, onClick } = itemSelectionHandler(id, focus, contextMenu, board, userId, locks, dispatch)


  return (
    <span
      ref={ref}
      draggable={true}
      onPointerDown={onClick}
      className={L.view(selected, s => s ? "postit selected" : "postit")}
      style={container.pipe(L.map((p: Container) => ({
        top: p.y + "em",
        left: p.x + "em",
        height: p.height + "em",
        width: p.width + "em",
        position: "absolute"
      })))}      
    >
      
      { L.view(locks, l => l[id] && l[id] !== userId.get() ? <span className="lock">🔒</span> : null )}
      { L.view(selected, s => s ? <SelectionBorder {...{ id, item: container, coordinateHelper, board, focus, dispatch}}/> : null) }
    </span>
  );
};