import { h } from "harmaja";
import * as L from "lonna";
import * as uuid from "uuid";
import { exampleBoard } from "../../../common/domain";
import { TextInput } from "../components/components";
import { Dispatch } from "./board-store";

export const DashboardView = ({ dispatch }: {dispatch: Dispatch }) => {
  const boardName = L.atom("")
  const disabled = L.view(boardName, n => !n)
  function createBoard(e: JSX.MouseEvent) {
    dispatch({ action: "board.add", boardId: uuid.v4(), name: boardName.get() })
    e.preventDefault()
  }
  return <div className="dashboard">
    <form className="create-board">
      <h2>Create a board</h2>
      <TextInput value={boardName} placeholder="Enter board name" />
      <button onClick={createBoard} disabled={ disabled }>Create</button>
    </form>
    <p>
      Or try the <a href={`/b/${exampleBoard.id}`}>Example Board</a>!
    </p>
  </div>
}