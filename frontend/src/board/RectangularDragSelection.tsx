import { h } from "harmaja"
import { BoardCoordinateHelper, BoardCoordinates } from "./board-coordinates"
import {Board, Id, Item, Container } from "../../../common/src/domain"
import * as L from "lonna"
import { DND_GHOST_HIDING_IMAGE } from "./item-drag"
import { BoardFocus } from "./board-focus";
import { Rect, overlaps, rectFromPoints } from "./geometry"
import { Dispatch } from "../store/board-store"

const ELSEWHERE = { type: "OTHER" } as const
type Elsewhere = typeof ELSEWHERE

// FIXME: this drag moving stuff really does not belong to the RectangularDragSelection component
type DragAction =
    { action: "select", selectedAtStart: Set<string>, dragStartedOn: Container | Elsewhere | null }
    | { action: "move" }
    | { action: "none" }

export const RectangularDragSelection = (
    { boardElem, coordinateHelper, board, focus, dispatch }: 
    { boardElem: L.Property<HTMLElement | null>, coordinateHelper: BoardCoordinateHelper, board: L.Property<Board>, focus: L.Atom<BoardFocus>,
      dispatch: Dispatch
    }
) => {
    let start: L.Atom<BoardCoordinates | null> = L.atom(null)
    let current: L.Atom<BoardCoordinates | null> = L.atom(null)
    let rect: L.Property<Rect | null> = L.view(start, current, (s, c) => {
        if (!s || !c) return null
        return rectFromPoints(s, c)
    })

    let dragAction: DragAction = { action: "none" }

    function isContainerWhereDragStarted(i: Item) {
        return dragAction.action === "select" && dragAction.dragStartedOn?.type === "container" && i === dragAction.dragStartedOn;
    }

    boardElem.forEach(el => {
        if (!el) return
        el.addEventListener("dragstart", e => {
            dragAction = !e.altKey ? { action: "move" } : { action: "select", selectedAtStart: new Set(), dragStartedOn: null }
            e.dataTransfer?.setDragImage(DND_GHOST_HIDING_IMAGE, 0, 0);
            const pos = coordinateHelper.clientToBoardCoordinates({ x: e.clientX, y: e.clientY })
            start.set(pos)
            current.set(pos)

            if (e.shiftKey && dragAction.action === "select") {
                const f = focus.get()
                if (f.status === "selected") {
                    dragAction.selectedAtStart = f.ids
                }
                focus.set(dragAction.selectedAtStart.size > 0 ? { status: "selected", ids: dragAction.selectedAtStart } : { status: "none" })
            }
        })


    
        el.addEventListener("drag", e => {
            const coords = coordinateHelper.currentBoardCoordinates.get()
            current.set(coords)
            const bounds = rect.get()!

            if (dragAction.action === "select") {
                // Do not select container if drag originates from within container
                const overlapping = board.get().items.filter(i => !isContainerWhereDragStarted(i) && overlaps(i, bounds))
                if (dragAction.dragStartedOn === null) {
                    if (overlapping[0]?.type === "container") {
                        dragAction.dragStartedOn = overlapping[0]
                        overlapping.shift()
                    } else {
                        dragAction.dragStartedOn = ELSEWHERE
                    }
                }

                const toBeSelected = new Set(overlapping.map(i => i.id).concat([...dragAction.selectedAtStart]))

                toBeSelected.size > 0
                    ? focus.set({ status: "selected", ids: toBeSelected })
                    : focus.set({ status: "none" })
            }
            else if (dragAction.action === "move") {
                const s = start.get()
                const c = current.get()
                s && c && (el.style.transform = `translate(${coordinateHelper.emToPx(s.x - c.x) / 2}px, ${coordinateHelper.emToPx(s.y - c.y) / 2}px)`)
            }
        })
    
        el.addEventListener("drop", end)

        el.addEventListener("dragend", reset)

        function reset() {
            if (dragAction.action === "move") {
                boardElem.get()!.style.transform = "translate(0, 0)"
                if (!start.get() || !current.get()) return
                const s = document.querySelector(".scroll-container")!
                const { x: startX, y: startY } = start.get()!
                const { x, y } = current.get()!
                const xDiff = coordinateHelper.emToPx(x - startX) / 2
                const yDiff = coordinateHelper.emToPx(y - startY) / 2
                s.scrollBy(xDiff, yDiff)
            }
            dragAction = { action: "none" }
        }
         
        function end() {
            reset()
            if (start.get()) {
                start.set(null)
                current.set(null)
            }        
        }
    });    

    return L.view(rect, r => {
        if (!r || dragAction.action !== "select") return null

        return <span className="rectangular-selection" style={{
            left: r.x + "em",
            top: r.y + "em",
            width: r.width + "em",
            height: r.height + "em"
        }}/>
    })
}