import { h } from "harmaja"
import { ZoomInIcon, ZoomOutIcon } from "../../components/Icons"
import { ZoomAndScrollControls } from "../board-scroll-and-zoom"

export function ZoomControls({
    increaseZoom,
    decreaseZoom,
}: Pick<ZoomAndScrollControls, "increaseZoom" | "decreaseZoom">) {
    return (
        <span className="zoom-controls">
            <span className="icon" title="Zoom in" onClick={() => increaseZoom("preserveCenter")}>
                <ZoomInIcon />
            </span>
            <span className="icon" title="Zoom out" onClick={() => decreaseZoom("preserveCenter")}>
                <ZoomOutIcon />
            </span>
        </span>
    )
}
