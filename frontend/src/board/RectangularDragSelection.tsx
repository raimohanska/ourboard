import { h } from "harmaja"
import * as L from "lonna"
import { Rect } from "./geometry"
import { DragAction } from "./board-drag"

export const RectangularDragSelection = (
    { rect, getDragAction }: 
    { rect: L.Property<Rect | null>
      getDragAction: () => DragAction
    }
) => {
    return L.view(rect, r => {
        if (!r || getDragAction().action !== "select") return null

        return <span className="rectangular-selection" style={{
            left: r.x + "em",
            top: r.y + "em",
            width: r.width + "em",
            height: r.height + "em"
        }}/>
    })
}