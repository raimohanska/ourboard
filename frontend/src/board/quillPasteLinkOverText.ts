import Quill from "quill"
import { isURL } from "../components/sanitizeHTML"

declare global {
    interface Window {
        Quill?: typeof Quill
    }
}

export default class PasteLinkOverText {
    quill: Quill

    constructor(quill: Quill) {
        this.quill = quill
        this.registerPasteListener()
    }
    registerPasteListener() {
        this.quill.clipboard.addMatcher(Node.TEXT_NODE, (node, delta) => {
            if (typeof node.data !== "string") {
                return undefined as any // This is how it was written
            }

            const url = node.data
            if (isURL(url)) {
                const sel = (this.quill as any).selection.savedRange as { index: number; length: number } | null
                if (sel && sel.length > 0) {
                    const existing = this.quill.getContents(sel.index, sel.length)
                    if (existing.ops.length === 1 && typeof existing.ops[0].insert === "string") {
                        const existingText = existing.ops[0].insert
                        delta.ops = [{ insert: existingText, attributes: { link: url } }]
                    }
                } else {
                    delta.ops = [{ insert: url, attributes: { link: url } }]
                }
            }

            return delta
        })
    }
}

if (window != null && window.Quill) {
    window.Quill.register("modules/pasteLinkOverText", PasteLinkOverText)
}
