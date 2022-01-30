import { componentScope } from "harmaja"
import * as L from "lonna"

export function installDoubleClickHandler(action: (e: JSX.MouseEvent) => void) {
    L.fromEvent<JSX.MouseEvent>(window, "dblclick")
        .pipe(L.applyScope(componentScope()))
        .forEach((e) => {
            e.preventDefault()
            action(e)
        })
}
