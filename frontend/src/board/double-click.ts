import { componentScope } from "harmaja"
import * as L from "lonna"
import { IS_TOUCHSCREEN } from "./touchScreen"

export function installDoubleClickHandler(action: (e: JSX.MouseEvent) => void) {
    if (IS_TOUCHSCREEN) {
        let previousClick = 0;
        L.fromEvent<JSX.MouseEvent>(window, "click")
        .pipe(L.applyScope(componentScope()))
        .forEach((e) => {
            const now = new Date().getTime()
            if (now - previousClick < 300) {
                action(e)
            }
            previousClick = now
        })
    } else 
    {
        L.fromEvent<JSX.MouseEvent>(window, "dblclick")
        .pipe(L.applyScope(componentScope()))
        .forEach((e) => {
            e.preventDefault()
            action(e)
        })
    }
}
