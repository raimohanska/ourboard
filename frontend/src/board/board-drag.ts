import { BoardCoordinateHelper, BoardCoordinates } from "./board-coordinates"
import {Board, Item, Container } from "../../../common/src/domain"
import * as L from "lonna"
import { DND_GHOST_HIDING_IMAGE } from "./item-drag"
import { BoardFocus } from "./board-focus";
import { Rect, overlaps, rectFromPoints } from "./geometry"
import { Dispatch } from "../store/board-store"

const ELSEWHERE = { type: "OTHER" } as const
type Elsewhere = typeof ELSEWHERE

export type DragAction =
    { action: "select", selectedAtStart: Set<string>, dragStartedOn: Container | Elsewhere | null }
    | { action: "move" }
    | { action: "none" }

export function boardDragHandler (
    { boardElem, coordinateHelper, board, focus, dispatch }: 
    { boardElem: L.Property<HTMLElement | null>, coordinateHelper: BoardCoordinateHelper, board: L.Property<Board>, focus: L.Atom<BoardFocus>,
      dispatch: Dispatch
    }
) {
    let start: L.Atom<BoardCoordinates | null> = L.atom(null)
    let current: L.Atom<BoardCoordinates | null> = L.atom(null)
    let rect: L.Property<Rect | null> = L.view(start, current, (s, c) => {
        if (!s || !c) return null
        return rectFromPoints(s, c)
    })

    // TODO make this an atom, lazy af
    const state: { dragAction: DragAction } = {
        dragAction: { action: "none" }
    }

    function isContainerWhereDragStarted(i: Item) {
        return state.dragAction.action === "select" && state.dragAction.dragStartedOn?.type === "container" && i === state.dragAction.dragStartedOn;
    }

    boardElem.forEach(el => {
        if (!el) return
        el.addEventListener("dragstart", e => {
            state.dragAction = !e.altKey ? { action: "move" } : { action: "select", selectedAtStart: new Set(), dragStartedOn: null }
            e.dataTransfer?.setDragImage(DND_GHOST_HIDING_IMAGE, 0, 0);
            const pos = coordinateHelper.clientToBoardCoordinates({ x: e.clientX, y: e.clientY })
            start.set(pos)
            current.set(pos)

            if (e.shiftKey && state.dragAction.action === "select") {
                const f = focus.get()
                if (f.status === "selected") {
                    state.dragAction.selectedAtStart = f.ids
                }
                focus.set(state.dragAction.selectedAtStart.size > 0 ? { status: "selected", ids: state.dragAction.selectedAtStart } : { status: "none" })
            }
        })


    
        el.addEventListener("drag", e => {
            const coords = coordinateHelper.currentBoardCoordinates.get()
            current.set(coords)
            const bounds = rect.get()!

            if (state.dragAction.action === "select") {
                // Do not select container if drag originates from within container
                const overlapping = board.get().items.filter(i => !isContainerWhereDragStarted(i) && overlaps(i, bounds))
                if (state.dragAction.dragStartedOn === null) {
                    if (overlapping[0]?.type === "container") {
                        state.dragAction.dragStartedOn = overlapping[0]
                        overlapping.shift()
                    } else {
                        state.dragAction.dragStartedOn = ELSEWHERE
                    }
                }

                const toBeSelected = new Set(overlapping.map(i => i.id).concat([...state.dragAction.selectedAtStart]))

                toBeSelected.size > 0
                    ? focus.set({ status: "selected", ids: toBeSelected })
                    : focus.set({ status: "none" })
            }
            else if (state.dragAction.action === "move") {
                const s = start.get()
                const c = current.get()
                s && c && (el.style.transform = `translate(${coordinateHelper.emToPx(s.x - c.x) / 2}px, ${coordinateHelper.emToPx(s.y - c.y) / 2}px)`)
            }
        })
    
        el.addEventListener("drop", end)

        el.addEventListener("dragend", reset)

        function reset() {
            if (state.dragAction.action === "move") {
                boardElem.get()!.style.transform = "translate(0, 0)"
                if (!start.get() || !current.get()) return
                const s = document.querySelector(".scroll-container")!
                const { x: startX, y: startY } = start.get()!
                const { x, y } = current.get()!
                const xDiff = coordinateHelper.emToPx(x - startX) / 2
                const yDiff = coordinateHelper.emToPx(y - startY) / 2
                s.scrollBy(xDiff, yDiff)
            }
            state.dragAction = { action: "none" }
        }
         
        function end() {
            reset()
            if (start.get()) {
                start.set(null)
                current.set(null)
            }        
        }
    });    

    return {
        rect,
        getDragAction: () => state.dragAction
    }
}