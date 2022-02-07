import { h } from "harmaja"
import * as L from "lonna"
import { Rect } from "../../../common/src/geometry"

export const RectangularDragSelection = ({ rect }: { rect: L.Property<Rect | null> }) => {
    return L.view(
        rect,
        (r) =>
            r && (
                <span
                    className="rectangular-selection"
                    style={{
                        left: r.x + "em",
                        top: r.y + "em",
                        width: r.width + "em",
                        height: r.height + "em",
                    }}
                />
            ),
    )
}
