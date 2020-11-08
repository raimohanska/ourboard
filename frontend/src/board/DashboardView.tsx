import { h } from "harmaja";
import * as L from "lonna";
import { exampleBoard } from "../../../common/src/domain";
import { generateFromTemplate, getUserTemplates } from "./templates"
import { TextInput } from "../components/components";
import { Dispatch } from "./board-store";

export const DashboardView = ({ dispatch }: {dispatch: Dispatch }) => {
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
      <input data-test="create-board-submit"type="submit" value="Create" disabled={ disabled } />
    </form>
    <p>
      Or try the <a href={`/b/${exampleBoard.id}`}>Example Board</a>!
    </p>
  </div>
}