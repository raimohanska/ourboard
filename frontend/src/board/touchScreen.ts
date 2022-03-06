export const IS_TOUCHSCREEN = "ontouchstart" in window

export function getSingleTouch(e: TouchEvent | JSX.TouchEvent) {
    if (e.touches.length === 1) return e.touches[0]
    return null
}

export function isSingleTouch(e: TouchEvent | JSX.TouchEvent) {
    return getSingleTouch(e) !== null
}

export function onSingleTouch(e: TouchEvent | JSX.TouchEvent, callback: (touch: Touch) => void) {
    const touch = getSingleTouch(e)
    if (touch) {
        callback(touch)
    }
}
