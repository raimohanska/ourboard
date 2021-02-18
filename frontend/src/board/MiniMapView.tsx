import { h, ListView } from "harmaja"
import * as L from "lonna"
import _ from "lodash"
import { Board, Item } from "../../../common/src/domain"
import { Rect } from "./geometry"

export const MiniMapView = ({ viewRect, board }: { viewRect: L.Property<Rect>; board: L.Property<Board> }) => {
    const minimapDimensions = L.view(viewRect, (rect) => {
        const minimapWidthEm = 10
        return { width: minimapWidthEm, height: (minimapWidthEm / rect.width) * rect.height }
    })
    const minimapAspectRatio = L.view(minimapDimensions, board, (mm, b) => mm.width / b.width)
    const minimapStyle = L.view(minimapDimensions, (d) => ({ width: d.width + "em", height: d.height + "em" }))
    const viewAreaStyle = L.view(viewRect, minimapDimensions, board, (vr, mm, b) => {
        return {
            width: (vr.width * mm.width) / b.width + "em",
            height: (vr.height * mm.height) / b.height + "em",
            left: Math.max(0, (vr.x * mm.width) / b.width) + "em",
            top: Math.max(0, (vr.y * mm.height) / b.height) + "em",
            border: "1px solid red",
        }
    })
    return (
        <div className="minimap" style={minimapStyle}>
            <div className="viewarea" style={viewAreaStyle} />
            <ListView observable={L.view(board, "items")} renderObservable={renderItem} getKey={(i) => i.id} />
        </div>
    )

    function renderItem(id: string, item: L.Property<Item>) {
        const style = L.view(item, minimapAspectRatio, (item, ratio) => ({
            left: item.x * ratio + "em",
            top: item.y * ratio + "em",
            width: item.width * ratio + "em",
            height: item.height * ratio + "em",
        }))
        return <span className="item" style={style} />
    }
}
