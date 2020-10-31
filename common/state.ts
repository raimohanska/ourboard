import { AppEvent, Board, Item } from "./domain";
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
      case "item.delete":
        return {
          ...board,
          items: board.items.filter((p) => p.id !== event.itemId)
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
      case "item.lock":
      case "item.unlock":
        return board;
      default:
        console.warn("Unknown event", event);
        return board
    }
  }

  const sortItems = (items: Item[]) => _.sortBy(items, i => i.type === "container" ? 0 : 1) // containers first to keep them on background