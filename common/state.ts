import { AppEvent, Board, Id, Item } from "./domain";
import _ from "lodash"

export function boardReducer(board: Board, event: AppEvent): Board {
    switch (event.action) {
      case "item.add":
        if (board.items.find(i => i.id === event.item.id)) {
          console.warn(new Error("Adding duplicate item " + JSON.stringify(event.item)))
          return board
        }
        return { ...board, items: sortItems(board.items.concat(event.item)) };
      case "item.update":
        return {
          ...board,
          items: board.items.map((p) => (p.id === event.item.id ? event.item : p))
        };
      case "item.move":
        return {
          ...board,
          items: moveItems(board.items, event.itemId, event.x, event.y)
        };
      case "item.delete": {
        const item = board.items.find(i => i.id === event.itemId)
        if (!item) {
          console.warn("Deleting non-existing item " + event.itemId)
          return board
        }
        const idsToDelete = new Set(item.type === "container" ? item.items.concat(event.itemId) : [event.itemId])
        return {
          ...board,
          items: board.items
            .filter(i => !idsToDelete.has(i.id))
            .map(i => i.type === "container" ? { ...i, items: i.items.filter(child => child !== event.itemId) } : i)
        }
      }
      case "item.front":
        const item = board.items.find(i => i.id === event.itemId)
        if (!item) {
          console.warn(`Cannot bring unknown item ${event.itemId} to front`)
          return board
        }
        return {
          ...board,
          items: sortItems(board.items.filter((p) => p.id !== event.itemId).concat(item))
        }
      case "item.setcontainer":
        return {
          ...board,
          items: board.items.map(i => {
            if (i.type !== "container") return i
            return {
              ...i,
              items: event.containerId === i.id
                ? (i.items.includes(event.itemId) ? i.items : i.items.concat(event.itemId))
                : i.items.filter(i => i !== event.itemId)
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