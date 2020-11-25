import { Id } from "../../../common/src/domain";

export type BoardFocus = 
  { status: "none" } | 
  { status: "selected", ids: Set<Id> } | 
  { status: "dragging", ids: Set<Id> } | 
  { status: "editing", id: Id }