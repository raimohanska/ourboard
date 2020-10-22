import * as H from "harmaja";
import { componentScope, h, ListView } from "harmaja";
import * as L from "lonna";
import { boardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board, CursorPosition, Id, PostIt } from "../../../common/domain";
import { NewPostIt } from "./NewPostIt"
import { PostItView } from "./PostItView"

export const BoardView = ({ boardId, cursors, board, dispatch }: { boardId: string, cursors: L.Property<CursorPosition[]>, board: L.Property<Board>, dispatch: (e: AppEvent) => void }) => {
  const zoom = L.atom(1);
  const style = zoom.pipe(L.map((z) => ({ fontSize: z + "em" })));
  const element = L.atom<HTMLElement | null>(null);
  const fontSize = style.pipe(L.map(((s: { fontSize: string; }) => s.fontSize)))

  const selected = L.atom<Id | null>(null);
  L.fromEvent<JSX.KeyboardEvent>(document, "keyup").pipe(L.applyScope(componentScope())).forEach(e => {
    if (e.keyCode === 8 || e.keyCode === 46) { // del or backspace
      const s = selected.get()
      if (s) {
        dispatch({ action: "item.delete", boardId, itemId: s})
      }      
    }
  })
  const coordinateHelper = boardCoordinateHelper(element, fontSize)

  coordinateHelper.currentBoardCoordinates.pipe(L.throttle(30)).forEach(position => {
    dispatch({ action: "cursor.move", position, boardId })
  })

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
      <div className="board" style={style} ref={element.set}>
        <ListView
          observable={L.view(board, "items")}
          renderObservable={(id: string, postIt) => <PostItView {...{ 
              boardId, id, postIt, 
              selected: L.atom(L.view(selected, s => s ? s === id : false), s => selected.set(s ? id : null)), 
              coordinateHelper, dispatch 
          }} />}
          getKey={(postIt) => postIt.id}
        />
        <ListView
          observable={cursors}
          renderObservable={({ x, y }: CursorPosition) => <span style={{ 
            transform: "rotate(-35deg)", 
            display: "block", 
            width: "0px", height:"0px", 
            borderLeft: "5px solid transparent", 
            borderRight: "5px solid transparent", 
            borderBottom: "10px solid tomato", 
            position: "absolute", 
            left: x + "em", top: y + "em" 
          }}></span> }
          getKey={(c: CursorPosition) => c}
        />
      </div>
    </div>
  );
}