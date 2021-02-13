import * as L from "lonna"
import { h, componentScope } from "harmaja"

export function onClickOutside(elem: L.Property<HTMLElement | null>, handler: () => any) {
    L.fromEvent<JSX.KeyboardEvent>(window, "mousedown")
        .pipe(L.applyScope(componentScope()))
        .forEach((event) => {
            if (!elem.get()?.contains(event.target as Node)) {
                handler()
            }
        })
}
