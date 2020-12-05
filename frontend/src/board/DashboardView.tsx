import { h, Fragment } from "harmaja";
import * as L from "lonna";
import { exampleBoard } from "../../../common/src/domain";
import { generateFromTemplate, getUserTemplates } from "./templates"
import { TextInput } from "../components/components";
import { BoardAppState, Dispatch } from "./board-store";
import { getRecentBoards } from "./recent-boards";

export const DashboardView = ({ state, dispatch }: { state: L.Property<BoardAppState>, dispatch: Dispatch }) => {
  return <div id="root" className="dashboard">
    <h1 id="app-title" data-test="app-title">
    R-Board         
    </h1>
    <RecentBoards/>
    <CreateBoard dispatch={dispatch}/>
  </div>
}

const RecentBoards = () => {
  const recent = getRecentBoards().slice(0, 5)
  if (recent.length === 0) return <Welcome/>
  return <div>
    <h2>Recent boards</h2>
    <ul>
      {
        recent.map(b => <li><a href={`/b/${b.id}`}>{ b.name }</a></li> )
      }
    </ul>
  </div>
}

const Welcome = () => {
  return <div>
    <h2>Welcome to R-Board!</h2>
    <p>
      Please try the <a href={`/b/${exampleBoard.id}`}>Example Board</a>, or create a new board below.
    </p>
  </div>
}
const CreateBoard = ({ dispatch }: {dispatch: Dispatch }) => {
  const boardName = L.atom("")
  const disabled = L.view(boardName, n => !n)

  function createBoard(e: JSX.FormEvent) {
      e.preventDefault();
      const templateName = chosenTemplate.get()
      const template = templates[templateName]
      if (!template) {
        throw Error("Template" + templateName + "not found??")
      }
      const newBoard = generateFromTemplate(boardName.get(), template)
      dispatch({ action: "board.add", payload: newBoard })
  }

  const { templates, templateOptions, defaultTemplate } = getUserTemplates();
  const chosenTemplate = L.atom<string>(defaultTemplate.name)

  return <form onSubmit={createBoard} className="create-board">
      <h2>Create a board</h2>
      <TextInput value={boardName} placeholder="Enter board name" />
      { templateOptions.length > 1 &&
        <>
        <small><label htmlFor="template-select">Use template</label></small>
        <select onChange={e => chosenTemplate.set(e.target.value)} name="templates" id="template-select">
          {templateOptions.map(name => 
              <option value={name}>
                {name}
              </option>
          )}
        </select>      
        </>
      }      
      <input data-test="create-board-submit"type="submit" value="Create" disabled={ disabled } />
  </form>    
}