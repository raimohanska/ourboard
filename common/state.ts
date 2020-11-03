import { AppEvent, Board, Id, Item } from "./domain";
import _ from "lodash"

export function boardReducer(board: Board, event: AppEvent): Board {
    switch (event.action) {
      case "item.add":
        if (board.items.find(i => event.items.some(a => a.id === i.id))) {
          console.warn(new Error("Adding duplicate item " + JSON.stringify(event.items)))
          return board
        }
        return { ...board, items: sortItems(board.items.concat(event.items)) };
      case "item.update":
        return {
          ...board,
          items: board.items.map((p) => {
            const updated = event.items.find(i => i.id === p.id)
            if (updated) return updated
            return p
          })
        };
      case "item.move":
        return {
          ...board,
          items: event.items.reduce((itemsBeforeMove, i) => moveItems(itemsBeforeMove, i.id, i.x, i.y), board.items)
        };
      case "item.delete": {
        const idsToDelete = new Set<Id>()
        for (let id of event.itemIds) {
          const item = board.items.find(i => i.id === id)
          if (!item) {
            console.warn("Deleting non-existing item " + id)
            return board
          }
          idsToDelete.add(id)
          if (item.type === "container") {
            item.items.forEach(child => idsToDelete.add(child))
          }          
        }        
        return {
          ...board,
          items: board.items
            .filter(i => !idsToDelete.has(i.id))
            .map(i => i.type === "container" ? { ...i, items: i.items.filter(child => !idsToDelete.has(child)) } : i)
        }
      }
      case "item.front":        
        const items = event.itemIds.flatMap(id => {
          const item = board.items.find(i => i.id === id)
          if (!item) {
            console.warn(`Cannot bring unknown item ${id} to front`)
            return []
          }
          return [item]
        }) 
        return {
          ...board,
          items: sortItems(board.items.filter((p) => !event.itemIds.includes(p.id)).concat(items))
        }
      case "item.setcontainer":
        return {
          ...board,
          items: board.items.map(i => {
            if (i.type !== "container") return i
            return {
              ...i,
              items: event.containerId === i.id
                ? i.items.concat(event.itemIds.filter(id => !i.items.includes(id)))
                : i.items.filter(i => !event.itemIds.includes(i))
            }
          })
        }
      case "item.lock":
      case "item.unlock":
        return board;
      default:
        console.warn("Unknown event", event);
        return board
    }
  }

  const moveItems = (items: Item[], id: Id, x: number, y: number) => {
    const item = items.find(i => i.id === id)
    if (!item) {
      console.warn("Moving unknown item", id)
      return items
    }
    const xDiff = x - item.x
    const yDiff = y - item.y
    const movedItems = new Set(item.type === "container" ? item.items.concat(id) : [id])

    return items.map((i) => movedItems.has(i.id) ? { ...i, x: i.x + xDiff, y: i.y + yDiff } : i)
  }

  const sortItems = (items: Item[]) => _.sortBy(items, i => i.type === "container" ? 0 : 1) // containers first to keep them on background