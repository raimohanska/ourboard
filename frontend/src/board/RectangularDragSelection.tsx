import { h } from "harmaja"
import { BoardCoordinateHelper, BoardCoordinates } from "./board-coordinates"
import { AppEvent, Board, Id, ItemLocks } from "../../../common/domain"
import * as L from "lonna"
import { DND_GHOST_HIDING_IMAGE } from "./item-drag"
import { over, xor } from "lodash"
import { BoardFocus } from "./BoardView"
import { Rect, overlaps, rectFromPoints } from "./geometry"

export const RectangularDragSelection = (
    { boardElem, coordinateHelper, board, focus, userId, locks, dispatch }: 
    { boardElem: L.Property<HTMLElement | null>, coordinateHelper: BoardCoordinateHelper, board: L.Property<Board>, focus: L.Atom<BoardFocus>,
      userId: L.Property<Id | null>, locks: L.Property<ItemLocks>, dispatch: (a: AppEvent) => void
    }
) => {
    let start: L.Atom<BoardCoordinates | null> = L.atom(null)
    let current: L.Atom<BoardCoordinates | null> = L.atom(null)
    let selectedAtStart: Id[] = []
    let rect: L.Property<Rect | null> = L.view(start, current, (s, c) => {
        if (!s || !c) return null
        return rectFromPoints(s, c)
    })

    boardElem.forEach(el => {
        if (!el) return

        el.addEventListener("dragstart", e => {            
            e.dataTransfer?.setDragImage(DND_GHOST_HIDING_IMAGE, 0, 0);
            const pos = coordinateHelper.clientToBoardCoordinates({ x: e.clientX, y: e.clientY })
            start.set(pos)
            current.set(pos)        
            const f = focus.get()
            selectedAtStart = e.shiftKey && f.status === "selected" ? f.ids: []
            focus.set(selectedAtStart.length > 0 ? { status: "selected", ids: selectedAtStart } : { status: "none" })
        })
    
        el.addEventListener("drag", e => {         
            const user = userId.get()!
            const l = locks.get()
   
            const coords = coordinateHelper.currentBoardCoordinates.get()
            current.set(coords)
            const bounds = rect.get()!
            const overlapping = board.get().items.filter(i => overlaps(i, bounds)).map(i => i.id)
            const allowed = overlapping.filter(id => !l[id] || l[id] === user)
            focus.set(allowed.length > 0 ? { status: "selected", ids: allowed } : { status: "none" })
            allowed.forEach(id => {
                if (l[id]) return
                dispatch({ action: "item.lock", boardId: board.get().id, itemId: id })
            })
        })
    
        el.addEventListener("drop", end)    
         
        function end() {    
            if (start.get()) {
                start.set(null)
                current.set(null)
            }        
        }
    });    

    return L.view(rect, r => {
        if (!r) return null        

        return <span className="rectangular-selection" style={{
            left: r.x + "em",
            top: r.y + "em",
            width: r.width + "em",
            height: r.height + "em"
        }}/>
    })
}