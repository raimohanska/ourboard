import * as L from "lonna";
import { Board, Item } from "../../../common/domain";
import { BoardCoordinateHelper } from "./board-coordinates";
import { BoardFocus } from "./BoardView";

export const DND_GHOST_HIDING_IMAGE = new Image();
// https://png-pixel.com/
DND_GHOST_HIDING_IMAGE.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

export function onBoardItemDrag(elem: HTMLElement, id: string, board: L.Property<Board>, focus: L.Atom<BoardFocus>, 
    coordinateHelper: BoardCoordinateHelper, doStuff: (b: Board, current: Item, dragStartPosition: Item, xDiff: number, yDiff: number) => void) {
    let dragStart: DragEvent | null = null;
    let dragStartPositions: Item[]
  
    elem.addEventListener("dragstart", e => {
      e.stopPropagation()
      const f = focus.get()
      if (f.status === "dragging") {
        if (!f.ids.includes(id)) {
          focus.set({ status: "dragging", ids: [id]})
        }
      } else if (f.status === "selected" && f.ids.includes(id)) {
        focus.set({ status: "dragging", ids: f.ids})
      } else {
        focus.set({ status: "dragging", ids: [id]})
      }
      dragStart = e;
      dragStart.dataTransfer?.setDragImage(DND_GHOST_HIDING_IMAGE, 0, 0);
      dragStartPositions = board.get().items
    })
    elem.addEventListener("drag", e => {
      e.stopPropagation()
      const { x: xDiff, y: yDiff } = coordinateHelper.boardCoordDiffFromThisClientPoint({x: dragStart!.clientX, y: dragStart!.clientY })
  
      const f = focus.get()
      if (f.status !== "dragging") throw Error("Assertion fail")
      const b = board.get()
      f.ids.forEach(id => {
        const current = b.items.find(i => i.id === id)
        const dragStartPosition = dragStartPositions.find(i => i.id === id)
        if (!current || !dragStartPosition) throw Error("Item not found: " + id)
  
        doStuff(b, current, dragStartPosition, xDiff, yDiff)      
      })
    })

    elem.addEventListener("dragend", e => {
      e.stopPropagation()
      focus.modify(f => {
        if (f.status !== "dragging") {
          throw Error("Assertion fail")
        }
        return { status: "selected", ids: f.ids }
      })
    })
  }