import { isUndefined } from "lodash"
import * as L from "lonna"
import { getItemShape, Item, TextItem } from "../../../common/src/domain"
import { toPlainText } from "../components/sanitizeHTML"
import { BoardCoordinateHelper } from "./board-coordinates"
import { Dimensions } from "../../../common/src/geometry"

export type AutoFontSizeOptions = {
    maxFontSize: number
    maxLines: number
    hideIfNoFit: boolean
    minFontSize: number
    widthTarget: number
    heightTarget: number
}

function getElementFont(e: HTMLElement | null) {
    if (!e) return "10px arial"
    const { fontFamily, fontSize } = getComputedStyle(e)
    return `${fontSize} ${fontFamily}` // Firefox returns these properties separately, so can't just use computedStyle.font
}

const defaultOptions = {
    maxFontSize: Number.MAX_VALUE,
    minFontSize: 0,
    maxLines: Number.MAX_VALUE,
    hideIfNoFit: false,
    widthTarget: 0.65, // TODO: something fishy here, why these number need to be so low?
    heightTarget: 0.6,
}

export function autoFontSize(
    item: L.Property<TextItem>,
    fontSize: L.Property<number>,
    text: L.Property<string>,
    focused: L.Property<boolean>,
    coordinateHelper: BoardCoordinateHelper,
    element: L.Atom<HTMLElement | null>,
    options: Partial<AutoFontSizeOptions> = {},
): L.Property<string> {
    let fullOptions = { ...defaultOptions, ...options }

    return L.view(
        L.view(item, "type"),
        L.view(item, getItemShape),
        L.view(item, "width"),
        L.view(item, "height"),
        fontSize,
        text,
        (t, shape, w, h, fs, text) => {
            if (t !== "note") return fs + "em"

            const width = shape === "round" ? Math.sqrt(w ** 2 / 2) : shape === "diamond" ? w / 2 : w
            const height = shape === "round" ? Math.sqrt(h ** 2 / 2) : shape === "diamond" ? h / 2 : h

            const referenceFont = getElementFont(element.get())
            const plainText = toPlainText(text)
            const split = plainText.split(/\s/)
            const words = split
                .map((s) => s.trim())
                .filter((s) => s)
                .map((s) => getTextDimensions(s, referenceFont))
            const spaceCharSize = getTextDimensions("", referenceFont)
            const widthTarget = coordinateHelper.emToPagePx(width) * fullOptions.widthTarget
            const heightTarget = coordinateHelper.emToPagePx(height) * fullOptions.heightTarget

            const maxWidth = widthTarget
            const lineSpacingEm = 0.4

            let lowerBound = Math.max(0, fullOptions.minFontSize)
            let upperBound = Math.min(10, fullOptions.maxFontSize)
            let sizeEm = Math.min(1, upperBound)
            let fit = false
            if (words.length > 0) {
                let iterations = 1
                while (iterations < 10) {
                    // Limited binary search
                    const fitInfo = tryFit(sizeEm)
                    const fitFactor = fitInfo.fitFactor

                    //if (f) console.log(text, "Try size", sizeEm, "Total lines", fitInfo.lines.length, "V-Fit", fitInfo.heightFitFactor, "H-fit", fitInfo.widthFitFactor, "limited by", fitFactor === fitInfo.heightFitFactor ? "height" : "width")
                    if (!fit && fitFactor <= 1) fit = true
                    if (lowerBound >= upperBound) break
                    if (fitFactor < 0.95) {
                        // too small
                        lowerBound = sizeEm
                        sizeEm = (sizeEm + upperBound) / 2
                    } else if (fitFactor > 1) {
                        // too big
                        upperBound = sizeEm
                        sizeEm = (sizeEm + lowerBound) / 2
                    } else {
                        // Good enough
                        break
                    }
                    iterations++
                }
            }

            if (!fit && fullOptions.hideIfNoFit) return "0"

            return Math.min(sizeEm, fullOptions.maxFontSize) * fs + "em"

            // Try to fit text using given font size. Return fit factor (text size / max size)
            function tryFit(sizeEm: number) {
                let index = 0
                let lines: Dimensions[] = []
                let maxWordWidth = 0
                let lineWidth = 0

                while (true) {
                    // loop through lines
                    let nextWord = words[index]
                    let nextWordWidth = nextWord.width * sizeEm
                    maxWordWidth = Math.max(nextWordWidth, maxWordWidth)
                    let nextWordWidthWithSpacing =
                        (lineWidth == 0 ? nextWord.width : nextWord.width + spaceCharSize.width) * sizeEm
                    let fitFactor = (lineWidth + nextWordWidthWithSpacing) / maxWidth
                    if (fitFactor > 1) {
                        // no more words for this line
                        if (lines.length >= fullOptions.maxLines) {
                            return { lines: [], fitFactor, widthFitFactor: fitFactor, heightFitFactor: 0 }
                        } else if (lineWidth === 0) {
                            //if (f) console.log("couldn't fit a single word, return factor based on width")
                            return { lines: [], fitFactor, widthFitFactor: fitFactor, heightFitFactor: 0 }
                        } else {
                            lines.push({ width: lineWidth, height: nextWord.height * sizeEm })
                            lineWidth = 0
                        }
                    } else {
                        // add this word on the line
                        lineWidth = lineWidth + nextWordWidthWithSpacing
                        if (++index >= words.length) {
                            //if (f) console.log("All words added", words)
                            lines.push({ width: lineWidth, height: nextWord.height * sizeEm })
                            lineWidth = 0
                            break
                        }
                    }
                }
                // At this point the text was horizontally fit. Return fit factor based on height
                const totalHeight =
                    lines.reduce((h, l) => h + l.height, 0) + (lines.length - 1) * lineSpacingEm * sizeEm
                const heightFitFactor = totalHeight / heightTarget
                const widthFitFactor = maxWordWidth / widthTarget
                const fitFactor = Math.max(heightFitFactor, widthFitFactor)
                return { lines, fitFactor, heightFitFactor, widthFitFactor, totalHeight, lineCount: lines.length }
            }
        },
    )
}

export function getTextDimensions(text: string, font: string): Dimensions {
    // if given, use cached canvas for better performance
    // else, create new canvas
    var gtw: any = getTextDimensions
    var canvas: HTMLCanvasElement = gtw.canvas || (gtw.canvas = document.createElement("canvas"))
    var context = canvas.getContext("2d")!
    context.font = font
    var metrics = context.measureText(text)
    const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    const width = metrics.width

    return { height, width }
}
