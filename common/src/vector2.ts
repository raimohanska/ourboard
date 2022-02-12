export type Vector2 = { x: number; y: number }

export function Vector2(x: number, y: number) {
    return { x, y }
}

export function getAngleRad(v: Vector2) {
    const unit = withLength(v, 1)
    return Math.atan2(unit.y, unit.x)
}

export function getAngleDeg(v: Vector2) {
    return radToDeg(getAngleRad(v))
}

export function getLength(v: Vector2) {
    return Math.sqrt(v.x * v.x + v.y * v.y)
}

export function withLength(v: Vector2, newLength: number) {
    return multiply(v, newLength / getLength(v))
}

export function multiply(v: Vector2, multiplier: number) {
    return Vector2(v.x * multiplier, v.y * multiplier)
}

export function add(v: Vector2, other: Vector2) {
    return Vector2(v.x + other.x, v.y + other.y)
}

export function rotateRad(v: Vector2, radians: number) {
    var length = getLength(v)
    var currentRadians = getAngleRad(v)
    var resultRadians = radians + currentRadians
    var rotatedUnit = { x: Math.cos(resultRadians), y: Math.sin(resultRadians) }
    return withLength(rotatedUnit, length)
}

export function rotateDeg(v: Vector2, degrees: number) {
    return rotateRad(v, degToRad(degrees))
}

export function degToRad(degrees: number) {
    return (degrees * 2 * Math.PI) / 360
}

export function radToDeg(rad: number) {
    return (rad * 360) / 2 / Math.PI
}
