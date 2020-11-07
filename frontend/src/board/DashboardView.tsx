import { h } from "harmaja";
import * as L from "lonna";
import * as uuid from "uuid";
import { exampleBoard, Board, Item, Containee, BoardStub, isFullyFormedBoard } from "../../../common/domain";
import { TextInput } from "../components/components";
import { Dispatch } from "./board-store";

export const DashboardView = ({ dispatch }: {dispatch: Dispatch }) => {
  const boardName = L.atom("")
  const disabled = L.view(boardName, n => !n)

  function createBoard(e: JSX.FormEvent) {
      e.preventDefault();
      const templateName = chosenTemplate.get()
      const template = allTemplates[templateName]
      if (!template) {
        throw Error("Template" + templateName + "not found??")
      }
      const newBoard = generateFromTemplate(template)
      dispatch({ action: "board.add", payload: newBoard })
  }
  function generateFromTemplate(t: Board | BoardStub): Board | BoardStub {
    if (!isFullyFormedBoard(t)) {
      return { name: boardName.get() || t.name, id: uuid.v4() }
    }
    const itemMapper = new Map<string,string>()
    t.items.forEach(i => {
      itemMapper.set(i.id, uuid.v4())
    })
  
    function newId(i: Item) {
      const newItem = {
        ...i,
        id: itemMapper.get(i.id)!
      }
  
      if (i.type !== "container" && i.containerId) {
        (newItem as Containee).containerId = itemMapper.get(i.containerId)!
      }
  
      return newItem
    }
  
    return {
      ...t,
      id: uuid.v4(),
      name: boardName.get() || ("Board from template " + t.name), // todo better UX, no-one will intuitively realize these buttons use the same input field
      items: t.items.map(newId)
    }
  }

  const maybeTemplates = localStorage.getItem("rboard_templates")
  const defaultTemplates = { "Empty board": { id: "default", name: "Empty board" } }
  const userTemplates = (() => {
    if (!maybeTemplates) return {};
    
    try {
      return JSON.parse(maybeTemplates) as Record<string,Board>
    } catch(e) {
      return {}
    }
  })()

  const allTemplates: Record<string, Board | BoardStub> = { ...defaultTemplates, ...userTemplates }

  const templateOptions = Object.keys(defaultTemplates).concat(Object.keys(userTemplates))

  const chosenTemplate = L.atom<string>(defaultTemplates["Empty board"].name)

  chosenTemplate.forEach(console.log)

  return <div className="dashboard">
    <form onSubmit={createBoard} className="create-board">
      <h2>Create a board</h2>
      <TextInput value={boardName} placeholder="Enter board name" />
      <small><label htmlFor="template-select">Use template</label></small>
      <select onChange={e => chosenTemplate.set(e.target.value)} name="templates" id="template-select">
        {templateOptions.map(name => 
            <option value={name}>
              {name}
            </option>
        )}
      </select>
      <input data-test="create-board-submit"type="submit" disabled={ disabled }>Create</input>
    </form>
    <p>
      Or try the <a href={`/b/${exampleBoard.id}`}>Example Board</a>!
    </p>
  </div>
}