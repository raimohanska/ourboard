import { h, ListView } from "harmaja"
import * as L from "lonna"
import { Board, Item } from "../../../../common/src/domain"
import { Rect } from "../../../../common/src/geometry"
import { DND_GHOST_HIDING_IMAGE } from "../item-drag"
import { onSingleTouch } from "../touchScreen"

export const MiniMapView = ({ viewRect, board }: { viewRect: L.Atom<Rect>; board: L.Property<Board> }) => {
    const minimapWidthPx = 125
    const minimapDimensions = L.view(board, (rect) => {
        return { width: minimapWidthPx, height: (minimapWidthPx / rect.width) * rect.height }
    })
    const minimapAspectRatio = L.view(minimapDimensions, board, (mm, b) => mm.width / b.width)
    const minimapStyle = L.view(minimapDimensions, (d) => ({ width: d.width + "px", height: d.height + "px" }))

    const viewAreaStyle = L.view(viewRect, minimapDimensions, board, (vr, mm, b) => {
        return {
            width: `${(vr.width * mm.width) / b.width}px`,
            height: `${(vr.height * mm.height) / b.height}px`,
            left: `${Math.max(0, (vr.x * mm.width) / b.width)}px`,
            top: `${Math.max(0, (vr.y * mm.height) / b.height)}px`,
        }
    })
    let startDrag: JSX.DragEvent | null = null
    let startViewRect: Rect | null = null
    function onDragEnd(e: JSX.DragEvent) {
        startDrag = null
    }
    function onDragStart(e: JSX.DragEvent) {
        startDrag = e
        startViewRect = viewRect.get()
        e.dataTransfer?.setDragImage(DND_GHOST_HIDING_IMAGE, 0, 0)
    }
    function onDragOver(e: JSX.DragEvent) {
        if (startDrag && startViewRect) {
            const xDiff = e.clientX - startDrag.clientX
            const yDiff = e.clientY - startDrag.clientY
            const ar = minimapAspectRatio.get()
            const newRect = { ...startViewRect, x: startViewRect.x + xDiff / ar, y: startViewRect.y + yDiff / ar }
            viewRect.set(newRect)
        }
    }
    const contentElement = L.atom<HTMLDivElement | null>(null)
    function onClick(e: JSX.MouseEvent | Touch) {
        const elementArea = contentElement.get()!.getBoundingClientRect()
        const ar = minimapAspectRatio.get()
        const x = (e.clientX - elementArea.x) / ar
        const y = (e.clientY - elementArea.y) / ar
        viewRect.modify((rect) => ({
            ...rect,
            x: x - rect.width / 2,
            y: y - rect.height / 2,
        }))
    }

    function onTouchStart(e: JSX.TouchEvent) {
        e.preventDefault()
        onSingleTouch(e, (touch) => onClick(touch))
    }
    function onTouchMove(e: JSX.TouchEvent) {
        e.preventDefault()
        onSingleTouch(e, (touch) => onClick(touch))
    }
    function onTouchEnd(e: JSX.TouchEvent) {
        e.preventDefault()
        onSingleTouch(e, (touch) => onClick(touch))
    }

    return (
        <div
            className="minimap"
            style={minimapStyle}
            onDragOver={onDragOver}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={onClick}
        >
            <div className="content" ref={contentElement.set}>
                <ListView
                    observable={L.view(L.view(board, "items"), Object.values)}
                    renderObservable={renderItem}
                    getKey={(i) => i.id}
                />
                <div
                    className="viewarea"
                    draggable={true}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    style={viewAreaStyle}
                />
            </div>
        </div>
    )

    function renderItem(id: string, item: L.Property<Item>) {
        const style = L.view(item, minimapAspectRatio, (item, ratio) => ({
            left: item.x * ratio + "px",
            top: item.y * ratio + "px",
            width: item.width * ratio + "px",
            height: item.height * ratio + "px",
        }))
        const type = item.get().type
        return <span className={"item " + type} style={style} />
    }
}
