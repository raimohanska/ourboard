import * as L from "lonna";
import { Board, PostIt } from "../../../common/domain";
import { BoardCoordinateHelper } from "./board-coordinates";
import { BoardFocus } from "./BoardView";

const DND_GHOST_HIDING_IMAGE = new Image();
// https://png-pixel.com/
DND_GHOST_HIDING_IMAGE.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

export function onBoardItemDrag(elem: HTMLElement, board: L.Property<Board>, focus: L.Atom<BoardFocus>, 
    coordinateHelper: BoardCoordinateHelper, doStuff: (b: Board, current: PostIt, dragStartPosition: PostIt, xDiff: number, yDiff: number) => void) {
    let dragStart: DragEvent | null = null;
    let dragStartPositions: PostIt[]
  
    elem.addEventListener("dragstart", e => {
      e.stopPropagation()
        dragStart = e;
        dragStart.dataTransfer?.setDragImage(DND_GHOST_HIDING_IMAGE, 0, 0);
        dragStartPositions = board.get().items
    })
    elem.addEventListener("drag", e => {
      e.stopPropagation()
      const { x: xDiff, y: yDiff } = coordinateHelper.boardCoordDiffFromThisClientPoint({x: dragStart!.clientX, y: dragStart!.clientY })
  
      const f = focus.get()
      if (f.status !== "selected") throw Error("Assertion fail")
      const b = board.get()
      f.ids.forEach(id => {
        const current = b.items.find(i => i.id === id)
        const dragStartPosition = dragStartPositions.find(i => i.id === id)
        if (!current || !dragStartPosition) throw Error("Item not found: " + id)
  
        doStuff(b, current, dragStartPosition, xDiff, yDiff)      
      })
    })
  }