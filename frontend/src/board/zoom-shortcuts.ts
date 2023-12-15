import { BoardZoom, ZoomAndScrollControls } from "./board-scroll-and-zoom"
import { controlKey, installKeyboardShortcut } from "./keyboard-shortcuts"
import * as L from "lonna"

export function installZoomKeyboardShortcuts({ resetZoom, increaseZoom, decreaseZoom }: ZoomAndScrollControls) {
    installKeyboardShortcut(controlKey("+"), increaseZoom)
    installKeyboardShortcut(controlKey("-"), decreaseZoom)
    installKeyboardShortcut(controlKey("0"), resetZoom)
}
