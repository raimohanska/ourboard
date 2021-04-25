import { h, Fragment } from "harmaja"
import * as L from "lonna"
import { ZoomInIcon, ZoomOutIcon } from "../../components/Icons"

export function ZoomControls({ zoom }: { zoom: L.Atom<number> }) {
    return (
        <span className="zoom-controls">
            <span className="icon" title="Zoom in" onClick={() => zoom.modify((z) => z * 1.1)}>
                <ZoomInIcon />
            </span>
            <span className="icon" title="Zoom out" onClick={() => zoom.modify((z) => z / 1.1)}>
                <ZoomOutIcon />
            </span>
        </span>
    )
}
