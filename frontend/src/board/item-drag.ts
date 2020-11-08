import * as L from "lonna";
import { Board, Item } from "../../../common/src/domain";
import { BoardCoordinateHelper } from "./board-coordinates";
import { BoardFocus } from "./synchronize-focus-with-server"

export const DND_GHOST_HIDING_IMAGE = new Image();
// https://png-pixel.com/
DND_GHOST_HIDING_IMAGE.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

export function onBoardItemDrag(elem: HTMLElement, id: string, board: L.Property<Board>, focus: L.Atom<BoardFocus>, 
    coordinateHelper: BoardCoordinateHelper, 
    doWhileDragging: (b: Board, current: Item, dragStartPosition: Item, xDiff: number, yDiff: number) => void,
    doOnDrop?: (b: Board, current: Item) => void,
) {
    let dragStart: DragEvent | null = null;
    let dragStartPositions: Item[]
  
    elem.addEventListener("dragstart", e => {
      e.stopPropagation()
      e.dataTransfer?.setDragImage(DND_GHOST_HIDING_IMAGE, 0, 0);
      const f = focus.get()
      if (f.status === "dragging") {
        if (!f.ids.has(id)) {
          focus.set({ status: "dragging", ids: new Set([id])})
        }
      } else if (f.status === "selected" && f.ids.has(id)) {
        focus.set({ status: "dragging", ids: f.ids})
      } else {
        focus.set({ status: "dragging", ids: new Set([id]) })
      }

      dragStart = e;
      dragStartPositions = board.get().items
    })
    elem.addEventListener("drag", e => {
      e.stopPropagation()
      const f = focus.get()
      if (f.status !== "dragging") {
        e.preventDefault()
        return
      }
      const { x: xDiff, y: yDiff } = coordinateHelper.boardCoordDiffFromThisClientPoint({x: dragStart!.clientX, y: dragStart!.clientY })
  
      const b = board.get()
      f.ids.forEach(id => {
        const current = b.items.find(i => i.id === id)
        const dragStartPosition = dragStartPositions.find(i => i.id === id)
        if (!current || !dragStartPosition) throw Error("Item not found: " + id)
  
        doWhileDragging(b, current, dragStartPosition, xDiff, yDiff)      
      })
    })

    elem.addEventListener("dragend", e => {
      e.stopPropagation()
      focus.modify(f => {
        if (f.status !== "dragging") {
          return f
        }
        if (doOnDrop) {
          const b = board.get()
          f.ids.forEach(id => {
            const current = b.items.find(i => i.id === id)
            if (!current) throw Error("Item not found: " + id)
            doOnDrop(b, current)      
          })
        }
        return { status: "selected", ids: f.ids }
      })
    })
  }