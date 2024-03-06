import { componentScope } from "harmaja"
import * as L from "lonna"
import { IS_TOUCHSCREEN, isSingleTouch } from "./touchScreen"

export function installDoubleClickHandler(action: (e: JSX.UIEvent) => void) {
    if (IS_TOUCHSCREEN) {
        let previousClick = 0
        L.fromEvent<JSX.TouchEvent>(window, "touchstart")
            .pipe(L.applyScope(componentScope()))
            .forEach((e) => {
                if (isSingleTouch(e)) {
                    if (!!(e as any).PREVENT_DBL_CLICK) {
                        return
                    }
                    const now = new Date().getTime()
                    if (now - previousClick < 300) {
                        action(e)
                    }
                    previousClick = now
                }
            })
    } else {
        L.fromEvent<JSX.MouseEvent>(window, "dblclick")
            .pipe(L.applyScope(componentScope()))
            .forEach((e) => {
                e.preventDefault()
                action(e)
            })
    }
}

export function preventDoubleClick(e: JSX.TouchEvent) {
    ;(e as any).PREVENT_DBL_CLICK = true
}
