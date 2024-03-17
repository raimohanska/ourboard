import Quill from "quill"
import { isURL } from "../components/sanitizeHTML"

export default class PasteLinkOverText {
    constructor(quill: Quill) {
        quill.clipboard.addMatcher(Node.TEXT_NODE, (node, delta) => {
            if (typeof node.data !== "string") {
                return undefined as any // This is how it was written
            }

            const url = node.data
            if (isURL(url)) {
                const sel = (quill as any).selection.savedRange as { index: number; length: number } | null
                if (sel && sel.length > 0) {
                    const existing = quill.getContents(sel.index, sel.length)
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
