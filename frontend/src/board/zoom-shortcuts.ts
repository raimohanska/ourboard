import { ZoomAndScrollControls } from "./board-scroll-and-zoom"
import { controlKey, installKeyboardShortcut } from "./keyboard-shortcuts"

export function installZoomKeyboardShortcuts({ resetZoom, increaseZoom, decreaseZoom }: ZoomAndScrollControls) {
    installKeyboardShortcut(controlKey("+"), () => increaseZoom("preserveCursor"))
    installKeyboardShortcut(controlKey("-"), () => decreaseZoom("preserveCursor"))
    installKeyboardShortcut(controlKey("0"), () => resetZoom("preserveCursor"))
}
