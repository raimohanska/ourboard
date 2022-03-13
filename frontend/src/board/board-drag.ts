import { componentScope } from "harmaja"
import * as _ from "lodash"
import * as L from "lonna"
import { connectionRect } from "../../../common/src/connection-utils"
import { Board, Connection, Point } from "../../../common/src/domain"
import { containedBy, overlaps, Rect, rectFromPoints } from "../../../common/src/geometry"
import { Dispatch } from "../store/server-connection"
import { BoardCoordinateHelper, BoardCoordinates } from "./board-coordinates"
import { BoardFocus, getSelectedConnectionIds, getSelectedItemIds, isAnythingSelected, noFocus } from "./board-focus"
import { newConnectionCreator } from "./item-connect"
import { DND_GHOST_HIDING_IMAGE } from "./item-drag"
import { ToolController } from "./tool-selection"
import { onSingleTouch } from "./touchScreen"

export type DragAction =
    | { action: "select"; selectedAtStart: BoardFocus }
    | { action: "pan" }
    | { action: "none" }
    | { action: "connect"; startPos: Point }

export function boardDragHandler({
    boardElem,
    coordinateHelper,
    latestConnection,
    board,
    toolController,
    focus,
    dispatch,
}: {
    boardElem: L.Property<HTMLElement | null>
    coordinateHelper: BoardCoordinateHelper
    latestConnection: L.Property<Connection | null>
    board: L.Property<Board>
    toolController: ToolController
    focus: L.Atom<BoardFocus>
    dispatch: Dispatch
}) {
    let start: L.Atom<BoardCoordinates | null> = L.atom(null)
    let current: L.Atom<BoardCoordinates | null> = L.atom(null)
    let rect: L.Property<Rect | null> = L.view(start, current, (s, c) => {
        if (!s || !c) return null
        return rectFromPoints(s, c)
    })
    const tool = toolController.tool

    const connector = newConnectionCreator(board, focus, latestConnection, dispatch)

    const dragAction = L.atom<DragAction>({ action: "none" })

    boardElem.forEach((el) => {
        if (!el) return
        el.addEventListener("dragstart", (e) => {
            const t = tool.get()
            const shouldDragSelect = t === "pan" ? !!e.altKey || !!e.shiftKey : !e.altKey
            e.dataTransfer?.setDragImage(DND_GHOST_HIDING_IMAGE, 0, 0)
            const pos = coordinateHelper.pageToBoardCoordinates({ x: e.pageX, y: e.pageY })
            start.set(pos)
            current.set(pos)
            if (t === "connect") {
                dragAction.set({ action: "connect", startPos: pos })
            } else if (!shouldDragSelect) {
                dragAction.set({ action: "pan" })
            } else {
                const f = focus.get()
                const selectedAtStart = e.shiftKey ? f : noFocus
                const anySelected = isAnythingSelected(selectedAtStart)
                focus.set(
                    anySelected
                        ? {
                              status: "selected",
                              itemIds: getSelectedItemIds(selectedAtStart),
                              connectionIds: getSelectedConnectionIds(selectedAtStart),
                          }
                        : noFocus,
                )
                dragAction.set({ action: "select", selectedAtStart })
            }
        })

        el.addEventListener(
            "drag",
            _.throttle(
                (e: DragEvent) => {
                    const coords = coordinateHelper.currentBoardCoordinates.get()
                    current.set(coords)
                    const da = dragAction.get()
                    if (da.action === "select") {
                        const bounds = rect.get()!
                        const startPoint = start.get()!
                        const b = board.get()

                        const itemIds = new Set([
                            ...Object.values(b.items)
                                .filter((i) => overlaps(i, bounds) && !containedBy(startPoint, i)) // Do not select container if drag originates from within container
                                .map((i) => i.id),
                            ...getSelectedItemIds(da.selectedAtStart),
                        ])

                        const connectionIds = new Set([
                            ...b.connections.filter((c) => overlaps(connectionRect(b)(c), bounds)).map((i) => i.id),
                            ...getSelectedConnectionIds(da.selectedAtStart),
                        ])

                        itemIds.size + connectionIds.size > 0
                            ? focus.set({ status: "selected", itemIds, connectionIds })
                            : focus.set(noFocus)
                    } else if (da.action === "pan") {
                        const s = start.get()
                        const c = current.get()
                        s &&
                            c &&
                            (el.style.transform = `translate(${coordinateHelper.emToPagePx(
                                c.x - s.x,
                            )}px, ${coordinateHelper.emToPagePx(c.y - s.y)}px)`)
                    } else if (da.action === "connect") {
                        connector.whileDragging(da.startPos, coords)
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
            if (da.action === "pan") {
                boardElem.get()!.style.transform = "translate(0, 0)"
                if (!start.get() || !current.get()) return
                const s = document.querySelector(".scroll-container")!
                const { x: startX, y: startY } = start.get()!
                const { x, y } = current.get()!
                const xDiff = coordinateHelper.emToPagePx(startX - x)
                const yDiff = coordinateHelper.emToPagePx(startY - y)
                s.scrollBy(xDiff, yDiff)
            } else if (da.action === "connect") {
                toolController.useDefaultTool()
                connector.endDrag()
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

        let touchStart: Touch | null = null
        function preventDefaultTouch(e: TouchEvent) {
            if (e.target === boardElem.get()) {
                e.preventDefault()
            }
        }
        const onTouch = (e: TouchEvent) => {
            preventDefaultTouch(e)
            onSingleTouch(e, (touch) => {
                if (touchStart) {
                    const xDiff = touchStart.pageX - touch.pageX
                    const yDiff = touchStart.pageY - touch.pageY
                    const s = document.querySelector(".scroll-container")!
                    s.scrollBy(xDiff, yDiff)
                }
                touchStart = touch
            })
        }
        el.addEventListener("touchmove", onTouch)
        el.addEventListener("touchend", (e) => {
            preventDefaultTouch(e)
            touchStart = null
        })
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
