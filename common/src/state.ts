import { AppEvent, Board, BoardHistoryEntry, BoardWithHistory, EventFromServer, Id, isPersistableBoardItemEvent, Item } from "./domain";
import _, { max } from "lodash"
import { foldActions } from "./action-folding";

export function boardHistoryReducer(board: BoardWithHistory, appEvent: EventFromServer): [BoardWithHistory, AppEvent | null] {
  const [updatedBoard, undoAction] = boardReducer(board.board, appEvent)
  const history = updatedBoard !== board.board ? addToHistory(board.history, appEvent) : board.history
  const updatedBoardWithHistory = { board: updatedBoard, history }
  return [updatedBoardWithHistory, undoAction]
}

function addToHistory(history: BoardHistoryEntry[], appEvent: EventFromServer): BoardHistoryEntry[] {
  if (!isPersistableBoardItemEvent(appEvent)) return history
  if (history.length === 0) return [appEvent]
  const latest = history[history.length - 1]
  const folded = foldActions(latest, appEvent) as null | BoardHistoryEntry
  if (folded) {
      return [...history.slice(0, history.length - 1), folded]
  }
  return [...history, appEvent]
}

export function boardReducer(board: Board, event: AppEvent): [Board, AppEvent | null] {
    switch (event.action) {
      case "board.rename": 
        return [
          { ...board, name: event.name },
          null
        ]
      case "item.bootstrap":
        if (board.items.length > 0) throw Error("Trying to bootstrap non-empty board")
        return [
          { ...board, items: event.items },
          null
        ]
      case "item.add":
        if (board.items.find(i => event.items.some(a => a.id === i.id))) {
          throw new Error("Adding duplicate item " + JSON.stringify(event.items))
        }
        return [
          { ...board, items: board.items.concat(event.items) }, 
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
          items: event.items.map(item => getItem(board)(item.id))
        }];
      case "item.move":
        return [{
          ...board,
          items: event.items.reduce((itemsBeforeMove, i) => moveItemWithChildren(itemsBeforeMove, i.id, i.x, i.y, i.containerId), board.items)
        }, {
          action: "item.move",
          boardId: board.id,
          items: event.items.map(i => {
            const item = getItem(board)(i.id)
            return { id: i.id, x: item.x, y: item.y, containerId: item.containerId }
          })
        }];
      case "item.delete": {
        const idsToDelete = findItemIdsRecursively(event.itemIds, board)                
        return [{
          ...board,
          items: board.items.filter(i => !idsToDelete.has(i.id))
        }, {
          action: "item.add",
          boardId: board.id,
          items: Array.from(idsToDelete).map(getItem(board)) // TODO: the deleted items should be assigned to containers when restoring. This happens now only if the container was removed too
        }]
      }
      case "item.front":              
        let maxZ = 0
        let maxZCount = 0
        for (let i of board.items) {
          if (i.z > maxZ) {
            maxZCount = 1;
            maxZ = i.z
          } else if (i.z === maxZ) {
            maxZCount++
          }          
        }
        const isFine = (item: Item) => {
          return !event.itemIds.includes(item.id) || item.z === maxZ
        }
        if (maxZCount === event.itemIds.length && board.items.every(isFine)) {
          // Requested items already on front
          return [board, null]
        }
        return [{
          ...board,
          items: board.items.map(i => i.type !== "container" && event.itemIds.includes(i.id) ? { ...i, z: maxZ + 1 } : i)
        }, null] // TODO: return item.back
      case "item.lock":
      case "item.unlock":
        return [board, null];
      default:
        console.warn("Unknown event", event);
        return [board, null]
    }
  }

  export const getItem = (board: Board | Item[]) => (id: Id) => {    
    const item = findItem(board)(id)
    if (!item) throw Error("Item not found: " + id)
    return item
  }

  export const findItem = (board: Board | Item[]) => (id: Id) => {
    const items: Item[] = board instanceof Array ? board : board.items
    const item = items.find(i => i.id === id)    
    return item || null
  }

  export function findItemIdsRecursively(ids: Id[], board: Board): Set<Id> {
    const recursiveIds = new Set<Id>()
    const addIdRecursively = (id: Id) => {
      recursiveIds.add(id)
      board.items.forEach(i => i.containerId === id && addIdRecursively(i.id))          
    }
    ids.forEach(addIdRecursively)
    return recursiveIds
  }

  export function findItemsRecursively(ids: Id[], board: Board): Item[] {
    const recursiveIds = findItemIdsRecursively(ids, board)
    return [...recursiveIds].map(getItem(board))
  }

  const moveItemWithChildren = (itemsOnBoard: Item[], id: Id, x: number, y: number, containerId: Id | undefined) => {
    const mainItem = itemsOnBoard.find(i => i.id === id)
    if (mainItem === undefined) {
      console.warn("Moving unknown item", id)
      return itemsOnBoard
    }
    const xDiff = x - mainItem.x
    const yDiff = y - mainItem.y

    function containedByMainItem(i: Item): boolean { 
      if (!i.containerId) return false
      if (i.containerId === mainItem!.id) return true
      const parent = findItem(itemsOnBoard)(i.containerId)
      if (i.containerId === i.id) throw Error("Self-contained")
      if (parent == i) throw Error("self parent")
      if (!parent) return false // Don't fail here, because when folding create+move, the action is run in an incomplete board context
      return containedByMainItem(parent)
    }
    const movedItems = new Set(itemsOnBoard.filter(containedByMainItem).map(i => i.id).concat(id))

    return itemsOnBoard.map((i) => {
      if (!movedItems.has(i.id)) return i
      const updated = { ...i, x: i.x + xDiff, y: i.y + yDiff }
      return i.id === id ? { ...updated, containerId } : updated
    })
  }