import * as Y from "yjs"
import { Board, Id, Item, QuillDelta, isTextItem } from "./domain"

export function getCRDTField(doc: Y.Doc, itemId: Id, fieldName: string) {
    return doc.getText(`items.${itemId}.${fieldName}`)
}

export function augmentBoardWithCRDT(doc: Y.Doc, board: Board): Board {
    const items = augmentItemsWithCRDT(doc, Object.values(board.items))
    return {
        ...board,
        items: Object.fromEntries(items.map((i) => [i.id, i])),
    }
}

export function augmentItemsWithCRDT(doc: Y.Doc, items: Item[]): Item[] {
    return items.map((item) => {
        if (isTextItem(item) && item.crdt) {
            const field = getCRDTField(doc, item.id, "text")
            const textAsDelta = field.toDelta() as QuillDelta
            const text = field.toString()
            return { ...item, textAsDelta, text }
        }
        return item
    })
}

export function importItemsIntoCRDT(doc: Y.Doc, items: Item[], options?: { fallbackToText: boolean }) {
    for (const item of items) {
        if (isTextItem(item) && item.crdt) {
            if (item.textAsDelta) {
                getCRDTField(doc, item.id, "text").applyDelta(item.textAsDelta)
            } else if (options?.fallbackToText) {
                getCRDTField(doc, item.id, "text").insert(0, item.text)
            } else {
                throw Error("textAsDelta is missing ")
            }
        }
    }
}
