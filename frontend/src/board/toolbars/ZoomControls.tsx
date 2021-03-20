import { h, Fragment } from "harmaja"
import * as L from "lonna"

export function ZoomControls({ zoom }: { zoom: L.Atom<number> }) {
    return (
        <span className="zoom-controls">
            <span className="icon zoom_in" title="Zoom in" onClick={() => zoom.modify((z) => z * 1.1)}></span>
            <span className="icon zoom_out" title="Zoom out" onClick={() => zoom.modify((z) => z / 1.1)}></span>
        </span>
    )
}
