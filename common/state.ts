import { AppEvent, Board } from "./domain";

export function boardReducer(board: Board, event: AppEvent): Board {
    switch (event.action) {
      case "item.add":
        if (board.items.find(i => i.id === event.item.id)) {
          console.warn(new Error("Adding duplicate item " + JSON.stringify(event.item)))
          return board
        }
        return { ...board, items: board.items.concat(event.item) };
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
        console.log("to front", event)
        const item = board.items.find(i => i.id === event.itemId)
        if (!item) {
          console.warn(`Cannot bring unknown item ${event.itemId} to front`)
          return board
        }
        console.log("to front", item)
        return {
          ...board,
          items: board.items.filter((p) => p.id !== event.itemId).concat(item)
        }
      default:
        console.warn("Unknown event", event);
        return board
    }
  }