import { Id } from "../../../common/src/domain";

export type BoardFocus = 
  { status: "none" } | 
  { status: "selected", ids: Set<Id> } | 
  { status: "dragging", ids: Set<Id> } | 
  { status: "editing", id: Id }

export function getSelectedIds(f: BoardFocus): Set<Id> {
    switch (f.status) {
        case "none": return new Set()
        case "editing": return new Set([f.id])
        case "selected":
        case "dragging": return f.ids
    }
}