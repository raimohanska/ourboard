import * as H from "harmaja";
import { componentScope, h, ListView } from "harmaja";
import * as L from "lonna";
import { boardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board, CursorPosition, Id, PostIt, UserCursorPosition } from "../../../common/domain";
import { NewPostIt } from "./NewPostIt"
import { PostItView } from "./PostItView"
import { BoardAppState } from "./board-store";

export type BoardFocus = 
  { status: "none" } | 
  { status: "selected", ids: Id[] } | 
  { status: "editing", id: Id }

export const BoardView = ({ boardId, cursors, state, dispatch }: { boardId: string, cursors: L.Property<UserCursorPosition[]>, state: L.Property<BoardAppState>, dispatch: (e: AppEvent) => void }) => {
  const board = L.view(state, s => s.board!)
  const sessions = L.view(state, s => s.users)
  const zoom = L.atom(1);
  const style = zoom.pipe(L.map((z) => ({ fontSize: z + "em" })));
  const element = L.atom<HTMLElement | null>(null);
  const fontSize = style.pipe(L.map(((s: { fontSize: string; }) => s.fontSize)))

  const focus = L.atom<BoardFocus>({status: "none" })

  L.fromEvent<JSX.KeyboardEvent>(document, "keyup").pipe(L.applyScope(componentScope())).forEach(e => {
    if (e.keyCode === 8 || e.keyCode === 46) { // del or backspace
      const s = focus.get()
      if (s.status === "selected") {
        s.ids.forEach(id => dispatch({ action: "item.delete", boardId, itemId: id}))
      }      
    }
  })
  const coordinateHelper = boardCoordinateHelper(element, fontSize)

  coordinateHelper.currentBoardCoordinates.pipe(L.throttle(30)).forEach(position => {
    dispatch({ action: "cursor.move", position, boardId })
  })

  const onClick = (e: JSX.MouseEvent) => {
    if (e.target === element.get()) {
      focus.set({ status: "none" })
    }
  }

  return (
    <div className="board-container">
      <h1>{L.view(board, "name")}</h1>
      <div className="controls">
        <button onClick={() => zoom.modify((z) => z * 1.1)}>+</button>
        <button onClick={() => zoom.modify((z) => z / 1.1)}>-</button>
        <span className="template">
          <span>Drag to add</span>
          {
            ["yellow", "pink", "cyan"].map(color =>
              <NewPostIt {...{ boardId, dispatch, color, coordinateHelper }} />
            )
          }
        </span>
      </div>
      <div className="board" style={style} ref={element.set} onClick={onClick}>
        <ListView
          observable={L.view(board, "items")}
          renderObservable={(id: string, postIt) => <PostItView {...{ 
              board, id, postIt, 
              focus,
              coordinateHelper, dispatch 
          }} />}
          getKey={(postIt) => postIt.id}
        />
        <ListView
          observable={cursors}
          renderObservable={({ x, y, userId }: UserCursorPosition) => <span
            className="cursor"
            style={{
              position: "absolute", 
              display: "block", 
              left: coordinateHelper.getClippedCoordinate(x, 'clientWidth', 0) + "em",
              top: coordinateHelper.getClippedCoordinate(y, 'clientHeight', 2) + "em"
            }}
          >
            <span className="arrow" style={{ 
              transform: "rotate(-35deg)", 
              display: "block", 
              width: "0px", height:"0px", 
              borderLeft: "5px solid transparent", 
              borderRight: "5px solid transparent", 
              borderBottom: "10px solid tomato", 
            }}/>
            <span className="text">{sessions.get().find(s => s.userId === userId)?.nickname || null}</span>
          </span> }
          getKey={(c: UserCursorPosition) => c}
        />
      </div>
    </div>
  );
}