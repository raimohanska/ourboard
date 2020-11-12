import { AppEvent, Board, Id, Item } from "./domain";
import _ from "lodash"

export function boardReducer(board: Board, event: AppEvent): [Board, AppEvent | null] {
    switch (event.action) {
      case "item.add":
        if (board.items.find(i => event.items.some(a => a.id === i.id))) {
          console.warn(new Error("Adding duplicate item " + JSON.stringify(event.items)))
          return [board, null]
        }
        return [
          { ...board, items: sortItems(board.items.concat(event.items)) }, 
          { action: "item.delete", boardId: board.id, itemIds: event.items.map(i => i.id)}
        ];
      case "item.update":
        return [{
          ...board,
          items: board.items.map((p) => {
            const updated = event.items.find(i => i.id === p.id)
            if (updated) return updated
            return p
          })
        }, {
          action: "item.update",
          boardId: board.id,
          items: event.items.map(item => findItem(board)(item.id))
        }];
      case "item.move":
        return [{
          ...board,
          items: event.items.reduce((itemsBeforeMove, i) => moveItems(itemsBeforeMove, i.id, i.x, i.y), board.items)
        }, {
          action: "item.move",
          boardId: board.id,
          items: event.items.map(i => {
            const item = findItem(board)(i.id)
            return { id: i.id, x: item.x, y: item.y }
          })
        }];
      case "item.delete": {
        const idsToDelete = new Set<Id>()
        for (let id of event.itemIds) {
          const item = board.items.find(i => i.id === id)
          if (!item) {
            console.warn("Deleting non-existing item " + id)
            continue;
          }
          idsToDelete.add(id)
          if (item.type === "container") {
            board.items.forEach(i => i.type !== "container" && i.containerId === item.id && idsToDelete.add(i.id))
          }          
        }        
        return [{
          ...board,
          items: board.items.filter(i => !idsToDelete.has(i.id))
        }, {
          action: "item.add",
          boardId: board.id,
          items: Array.from(idsToDelete).map(findItem(board)) // TODO: the deleted items should be assigned to containers when restoring. This happens now only if the container was removed too
        }]
      }
      case "item.front":        
        let maxZ = 0
        for (let i of board.items) {
          maxZ = Math.max(maxZ, i.z)
        }
        return [{
          ...board,
          items: sortItems(board.items.map(i => i.type !== "container" && event.itemIds.includes(i.id) ? { ...i, z: maxZ + 1 } : i))
        }, null] // TODO: return item.back
      case "item.lock":
      case "item.unlock":
        return [board, null];
      default:
        console.warn("Unknown event", event);
        return [board, null]
    }
  }

  const findItem = (board: Board) => (id: Id) => {
    const item = board.items.find(i => i.id === id)
    if (!item) throw Error("Item not found: " + id)
    return item
  }

  const moveItems = (items: Item[], id: Id, x: number, y: number) => {
    const item = items.find(i => i.id === id)
    if (!item) {
      console.warn("Moving unknown item", id)
      return items
    }
    const xDiff = x - item.x
    const yDiff = y - item.y

    const containedBy = (i: Item) => i.type !== "container" && i.containerId === item.id
    const movedItems = new Set(item.type === "container" ? items.filter(containedBy).map(i => i.id).concat(id) : [id])

    return items.map((i) => movedItems.has(i.id) ? { ...i, x: i.x + xDiff, y: i.y + yDiff } : i)
  }

  const sortItems = (items: Item[]) => _.sortBy(items, i => i.type === "container" ? 0 : 1) // containers first to keep them on background