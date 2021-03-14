import { BoardCoordinateHelper, BoardCoordinates } from "./board-coordinates"
import { Board, Item, Container } from "../../../common/src/domain"
import * as L from "lonna"
import { DND_GHOST_HIDING_IMAGE } from "./item-drag"
import { BoardFocus } from "./board-focus"
import { Rect, overlaps, rectFromPoints, Coordinates } from "./geometry"
import * as _ from "lodash"
import { componentScope } from "harmaja"
import { Tool } from "./BoardView"

const ELSEWHERE = { type: "OTHER" } as const
type Elsewhere = typeof ELSEWHERE

export type DragAction =
    | { action: "select"; selectedAtStart: Set<string>; dragStartedOn: Container | Elsewhere | null }
    | { action: "move" }
    | { action: "none" }

export function boardDragHandler({
    boardElem,
    coordinateHelper,
    board,
    tool,
    focus,
}: {
    boardElem: L.Property<HTMLElement | null>
    coordinateHelper: BoardCoordinateHelper
    board: L.Property<Board>
    tool: L.Property<Tool>
    focus: L.Atom<BoardFocus>
}) {
    let start: L.Atom<BoardCoordinates | null> = L.atom(null)
    let current: L.Atom<BoardCoordinates | null> = L.atom(null)
    let rect: L.Property<Rect | null> = L.view(start, current, (s, c) => {
        if (!s || !c) return null
        return rectFromPoints(s, c)
    })

    // TODO make this an atom, lazy af
    const dragAction = L.atom<DragAction>({ action: "none" })

    function isContainerWhereDragStarted(i: Item) {
        const da = dragAction.get()
        return da.action === "select" && da.dragStartedOn?.type === "container" && i === da.dragStartedOn
    }

    boardElem.forEach((el) => {
        if (!el) return
        el.addEventListener("dragstart", (e) => {
            const t = tool.get()
            const shouldDragSelect = t === "pan" ? !!e.altKey : true
            dragAction.set(
                !shouldDragSelect
                    ? { action: "move" }
                    : { action: "select", selectedAtStart: new Set(), dragStartedOn: null },
            )
            e.dataTransfer?.setDragImage(DND_GHOST_HIDING_IMAGE, 0, 0)

            const pos = coordinateHelper.pageToBoardCoordinates({ x: e.pageX, y: e.pageY })
            start.set(pos)
            current.set(pos)

            const da = dragAction.get()
            if (e.shiftKey && da.action === "select") {
                const f = focus.get()

                const selectedAtStart = f.status === "selected" ? f.ids : da.selectedAtStart
                if (f.status === "selected") {
                    dragAction.set({ ...da, selectedAtStart: f.ids })
                }
                focus.set(selectedAtStart.size > 0 ? { status: "selected", ids: selectedAtStart } : { status: "none" })
            }
        })

        const itemsList = L.view(L.view(board, "items"), Object.values)

        el.addEventListener(
            "drag",
            _.throttle(
                (e: DragEvent) => {
                    const coords = coordinateHelper.currentBoardCoordinates.get()
                    current.set(coords)
                    const bounds = rect.get()!

                    const da = dragAction.get()
                    if (da.action === "select") {
                        // Do not select container if drag originates from within container
                        const overlapping = itemsList
                            .get()
                            .filter((i) => !isContainerWhereDragStarted(i) && overlaps(i, bounds))
                        if (da.dragStartedOn === null) {
                            if (overlapping[0]?.type === "container") {
                                da.dragStartedOn = overlapping[0]
                                overlapping.shift()
                            } else {
                                da.dragStartedOn = ELSEWHERE
                            }
                        }

                        const toBeSelected = new Set(overlapping.map((i) => i.id).concat([...da.selectedAtStart]))

                        toBeSelected.size > 0
                            ? focus.set({ status: "selected", ids: toBeSelected })
                            : focus.set({ status: "none" })
                    } else if (da.action === "move") {
                        const s = start.get()
                        const c = current.get()
                        s &&
                            c &&
                            (el.style.transform = `translate(${coordinateHelper.emToPx(
                                c.x - s.x,
                            )}px, ${coordinateHelper.emToPx(c.y - s.y)}px)`)
                    }
                },
                15,
                { leading: true, trailing: true },
            ),
        )

        el.addEventListener("drop", end)

        el.addEventListener("dragend", reset)

        function reset() {
            const da = dragAction.get()
            if (da.action === "move") {
                boardElem.get()!.style.transform = "translate(0, 0)"
                if (!start.get() || !current.get()) return
                const s = document.querySelector(".scroll-container")!
                const { x: startX, y: startY } = start.get()!
                const { x, y } = current.get()!
                const xDiff = coordinateHelper.emToPx(startX - x)
                const yDiff = coordinateHelper.emToPx(startY - y)
                s.scrollBy(xDiff, yDiff)
            }
            dragAction.set({ action: "none" })
        }

        function end() {
            reset()
            if (start.get()) {
                start.set(null)
                current.set(null)
            }
        }
    })

    return {
        selectionRect: L.pipe(
            L.combine(rect, dragAction, (rect: Rect | null, dragAction: DragAction) => {
                if (!rect || dragAction.action !== "select") return null

                return rect
            }),
            L.skipDuplicates<Rect | null>(_.isEqual, componentScope()),
        ),
    }
}
