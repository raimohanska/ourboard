import { Board, Item } from "../../../common/domain";
import { Dispatch } from "./board-store";
import { containedBy } from "./geometry";

export function maybeAddToContainer(item: Item, b: Board, dispatch: Dispatch) {
    if (item.type !== "container") {
        const currentContainer = b.items.find(i => i.type === "container" && item.containerId == i.id)
        if (currentContainer && containedBy(item, currentContainer)) return

        const newContainer = b.items.find(i => i.type === "container" && containedBy(item, i))
        if (newContainer != currentContainer) {
            dispatch({ action: "item.update", boardId: b.id, items: [{...item, containerId: newContainer?.id }] })
        }
    }    
}