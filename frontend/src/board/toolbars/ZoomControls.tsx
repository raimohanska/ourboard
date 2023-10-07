import { Fragment, h } from "harmaja"
import { ZoomInIcon, ZoomOutIcon } from "../../components/Icons"
import { ZoomAndScrollControls } from "../board-scroll-and-zoom"

export function ZoomControls({ adjustZoom }: ZoomAndScrollControls) {
    return (
        <span className="zoom-controls">
            <span className="icon" title="Zoom in" onClick={() => adjustZoom((z) => z * 1.2, "preserveCenter")}>
                <ZoomInIcon />
            </span>
            <span className="icon" title="Zoom out" onClick={() => adjustZoom((z) => z / 1.2, "preserveCenter")}>
                <ZoomOutIcon />
            </span>
        </span>
    )
}
