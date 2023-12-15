import { h } from "harmaja"
import { ResetZoomIcon, ZoomInIcon, ZoomOutIcon } from "../../components/Icons"
import { ZoomAndScrollControls } from "../board-scroll-and-zoom"

export function ZoomControls({
    increaseZoom,
    decreaseZoom,
    resetZoom,
}: Pick<ZoomAndScrollControls, "increaseZoom" | "decreaseZoom" | "resetZoom">) {
    return (
        <span className="zoom-controls" onClick={(e) => e.stopPropagation()}>
            <span className="icon" title="Zoom in" onClick={() => increaseZoom("preserveCenter")}>
                <ZoomInIcon />
            </span>
            <span className="icon" title="Reset zoom" onClick={() => resetZoom("preserveCenter")}>
                <ResetZoomIcon />
            </span>
            <span className="icon" title="Zoom out" onClick={() => decreaseZoom("preserveCenter")}>
                <ZoomOutIcon />
            </span>
        </span>
    )
}
