import { Board, Item } from "../../../common/domain";
import { Dispatch } from "./board-store";
import { containedBy } from "./geometry";

export function maybeAddToContainer(item: Item, b: Board, dispatch: Dispatch) {
    if (item.type !== "container") {
        const currentContainer = b.items.find(i => (i.type === "container") && i.items.includes(item.id))
        if (currentContainer && containedBy(item, currentContainer)) return

        const newContainer = b.items.find(i => (i.type === "container") && containedBy(item, i))
        if (newContainer != currentContainer) {
            dispatch({ action: "item.setcontainer", boardId: b.id, itemIds: [item.id], containerId: newContainer ? newContainer.id : null })
        }
    }    
}