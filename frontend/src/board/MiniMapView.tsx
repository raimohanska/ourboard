import {h} from "harmaja"
import * as L from "lonna"
import _ from "lodash"
import { Board } from "../../../common/src/domain"
import { Rect } from "./geometry"

export const MiniMapView = ({ viewRect, board }: { viewRect: L.Property<Rect>, board: L.Property<Board> }) => {
    const minimapDimensions = L.view(viewRect, rect => {
        const minimapWidthEm = 10
        return { width: minimapWidthEm, height: minimapWidthEm / rect.width * rect.height }
    })
    const minimapStyle = L.view(minimapDimensions, d => ({ width: d.width + "em", height: d.height + "em" }))
    const viewAreaStyle = L.view(viewRect, minimapDimensions, board, (vr, mm, b) => {
        return {
            width: vr.width * mm.width / b.width + "em",
            height: vr.height * mm.height / b.height + "em",
            left: Math.max(0, vr.x * mm.width / b.width) + "em",
            top: Math.max(0, vr.y * mm.height / b.height) + "em"
        }
    })
    return <div className="minimap" style={minimapStyle}>
        <div className="viewarea" style={viewAreaStyle}/>
    </div>
}