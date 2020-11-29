import * as uuid from "uuid";
import { Board, BoardStub, Item, isFullyFormedBoard, migrateBoard } from "../../../common/src/domain"

export function generateFromTemplate(boardName: string, tmpl: Board | BoardStub): Board | BoardStub {
    if (!isFullyFormedBoard(tmpl)) {
      return { name: boardName, id: uuid.v4() }
    }
    const itemMapper = new Map<string,string>()
    tmpl.items.forEach(i => {
      itemMapper.set(i.id, uuid.v4())
    })
  
    function newId(i: Item) {
      const newItem = {
        ...i,
        id: itemMapper.get(i.id)!
      }
  
      if (i.containerId) {
        newItem.containerId = itemMapper.get(i.containerId)!
      }
  
      return newItem
    }
  
    return {
      ...tmpl,
      id: uuid.v4(),
      name: boardName,
      items: tmpl.items.map(newId)
    }
  }

export function getUserTemplates() {
    const defaultTemplates = { "Empty board": { id: "default", name: "Empty board" } }
    const userTemplates = (() => {
      const maybeTemplates = localStorage.getItem("rboard_templates")
      if (!maybeTemplates) return {};
      
      try {
        const tmpls = JSON.parse(maybeTemplates) as Record<string,Board>
        Object.keys(tmpls).forEach(t => {
            tmpls[t] = migrateBoard(tmpls[t])
        })
        return tmpls
      } catch(e) {
        return {}
      }
    })()
  
    const allTemplates: Record<string, Board | BoardStub> = { ...defaultTemplates, ...userTemplates }
  
    const templateOptions = Object.keys(defaultTemplates).concat(Object.keys(userTemplates))
  
    return {
        templates: allTemplates,
        templateOptions,
        defaultTemplate: defaultTemplates["Empty board"]
    }
}