import { AppEvent, Board } from "./domain"

export function boardReducer(board: Board, event: AppEvent): Board {
    switch (event.action) {
      case "item.add":
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
      default:
        console.warn("Unknown event", event);
        return board
    }
  }