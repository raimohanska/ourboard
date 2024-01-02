import * as t from "io-ts"
import { Left, isLeft, left } from "fp-ts/lib/Either"
import { PathReporter } from "io-ts/lib/PathReporter"

export function decodeOrThrow<T>(codec: t.Type<T, any>, input: any): T {
    const validationResult = codec.decode(input)
    if (isLeft(validationResult)) {
        throw new ValidationError(validationResult)
    }
    return validationResult.right
}

class ValidationError extends Error {
    constructor(errors: Left<t.Errors>) {
        super(report_(errors.left))
    }
}

function report_(errors: t.Errors) {
    return PathReporter.report(left(errors)).join("\n")
}
