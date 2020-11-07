import { h } from "harmaja";
import * as L from "lonna";
import { item } from "lonna";
import * as uuid from "uuid";
import { exampleBoard, Board, Item, Containee } from "../../../common/domain";
import { TextInput } from "../components/components";
import { Dispatch } from "./board-store";

export const DashboardView = ({ dispatch }: {dispatch: Dispatch }) => {
  const boardName = L.atom("")
  const disabled = L.view(boardName, n => !n)
  function createBoard(e: JSX.MouseEvent) {
    dispatch({ action: "board.add", payload: { id: uuid.v4(), name: boardName.get() } })
    e.preventDefault()
  }
  function createBoardFromTemplate(t: Board) {
    return (e: JSX.MouseEvent) => {
      e.preventDefault();
      const newBoard = generateFromTemplate(t)
      dispatch({ action: "board.add", payload: newBoard })
    }
  }
  function generateFromTemplate(t: Board): Board {
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
  const templates = maybeTemplates ? JSON.parse(maybeTemplates) as Record<string,Board> : {}
  return <div className="dashboard">
    <form className="create-board">
      <h2>Create a board</h2>
      <TextInput value={boardName} placeholder="Enter board name" />
      <button onClick={createBoard} disabled={ disabled }>Create</button>
    </form>
    <ul className="templates">
      {/* TODO be less lazy and make a dropdown */ Object.entries(templates).map(([name, tmpl]) => 
        <li className="create-template">
          <button onClick={createBoardFromTemplate(tmpl)}>
            Create new from saved template '{name}'
          </button>
        </li>
      )}
    </ul>
    <p>
      Or try the <a href={`/b/${exampleBoard.id}`}>Example Board</a>!
    </p>
  </div>
}