import * as H from "harmaja";
import { h, ListView } from "harmaja";
import * as L from "lonna";
import { item } from "lonna/dist/lens";

import { AppEvent, Board, Color, PostIt, newPostIt, CursorPosition } from "../../../common/domain";
import { EditableSpan } from "../components/components"

type Coordinates = { x: number, y: number }
type ClientCoordinates = Coordinates
type BoardCoordinates = Coordinates

export const BoardView = ({ boardId, cursors, board, dispatch }: { boardId: string, cursors: L.Property<CursorPosition[]>, board: L.Property<Board>, dispatch: (e: AppEvent) => void }) => {
  const zoom = L.atom(1);
  const style = zoom.pipe(L.map((z) => ({ fontSize: z + "em" })));
  const element = L.atom<HTMLElement | null>(null);

  const coordinateHelper = boardCoordinateHelper(element)

  return (
    <div className="board" ref={element.set}>
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
      <div className="board-inner" style={style} >
        <ListView
          observable={L.view(board, "items")}
          renderObservable={(id: string, postIt) => <PostItView {...{ boardId, id, postIt, coordinateHelper, dispatch }} />}
          getKey={(postIt) => postIt.id}
        />
        <ListView
          observable={cursors}
          renderObservable={({ x, y }: CursorPosition) => <span style={{ transform: "rotate(-35deg)", display: "block", width: "0px", height:"0px", borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "10px solid tomato", position: "fixed", left: x + "px", top: y + "px" }}></span> }
          getKey={(c: CursorPosition) => c}
        />
      </div>
    </div>
  );
}

export const NewPostIt = (
  { boardId, color, dispatch, coordinateHelper }: 
  { boardId: string, color: Color, coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void }
) => {
  const style = {
    background: color
  }
  
  const element = L.atom<HTMLElement | null>(null);
  
  function onDragEnd(dragEnd: JSX.DragEvent) {
    const {x, y} = coordinateHelper.currentBoardCoordinates()

    const item = newPostIt("HELLO", color, x, y)

    dispatch({ action: "item.add", boardId, item });
  }
  return <span ref={element.set} onDragEnd={onDragEnd} className="postit" draggable={true} style={style}>
    <span className="text"></span>
  </span>
}


export const PostItView = ({ boardId, id, postIt, coordinateHelper, dispatch }: { boardId: string, id: string; postIt: L.Property<PostIt>, coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void }) => {
  let dragStart: JSX.DragEvent | null = null;
  function onDragStart(e: JSX.DragEvent) {
    dragStart = e;
  }
  function onDragEnd(event: JSX.DragEvent) {
    console.log("Drag end")

    const { x: xDiff, y: yDiff } = coordinateHelper.boardCoordDiffFromThisClientPoint({x: dragStart!.clientX, y: dragStart!.clientY })
    const current = postIt.get();
    const x = current.x + xDiff;
    const y = current.y + yDiff;
    dispatch({ action: "item.update", boardId, item: { ...current, x, y } });
  }

  const textAtom = L.atom(L.view(postIt, "text"), text => dispatch({ action: "item.update", boardId, item: { ...postIt.get(), text } }))
  const editingThis = L.atom(false)

  return (
    <span
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="postit"
      style={postIt.pipe(L.map((p: PostIt) => ({
        top: p.y + "em",
        left: p.x + "em",
        height: "5em",
        width: "5em",
        background: p.color,
        padding: "1em",
        position: "absolute"
      })))}
      color={L.view(postIt, "color")}
    >
      <span className="text">
        <EditableSpan {...{
          value: textAtom, editingThis
        }} />
      </span>
    </span>
  );
};

function pxToEm(px: number, element: HTMLElement) {
  element = element === null || element === undefined ? document.documentElement : element;
  var temporaryElement: HTMLDivElement = document.createElement("div");
  temporaryElement.style.setProperty("position", "absolute", "important");
  temporaryElement.style.setProperty("visibility", "hidden", "important");
  temporaryElement.style.setProperty("font-size", "1em", "important");
  element.appendChild(temporaryElement);
  var baseFontSize = parseFloat(getComputedStyle(temporaryElement).fontSize);
  temporaryElement.parentNode!.removeChild(temporaryElement);
  return px / baseFontSize;
}


function boardCoordinateHelper(boardElem: L.Atom<HTMLElement | null>) {
  let currentClientPos = { x: 0, y: 0 }
  function coordDiff(a: Coordinates, b: Coordinates) {
    return { x: a.x - b.x, y: a.y - b.y }
  }

  function clientToBoardCoordinates(clientCoords: ClientCoordinates): Coordinates {
    const rect = boardElem.get()!.getBoundingClientRect()
    return { 
      x: pxToEm(clientCoords.x - rect.x, boardElem.get()!), 
      y: pxToEm(clientCoords.y - rect.y, boardElem.get()!)
    }
  }

  function clientCoordDiffToThisPoint(coords: ClientCoordinates) {
    return coordDiff(currentClientPos, coords)
  }

  boardElem.forEach(elem => {
    if (!elem) return
    elem.addEventListener("dragover", e => {
       //console.log("Drag over board")
    currentClientPos = { x: e.clientX, y: e.clientY }
    e.preventDefault() // To disable Safari slow animation
    })
  })

  const currentBoardCoordinates = () => clientToBoardCoordinates(currentClientPos)

  return {
    clientToBoardCoordinates,
    clientCoordDiffToThisPoint,
    currentClientCoordinates: () => currentClientPos,
    currentBoardCoordinates,
    boardCoordDiffFromThisClientPoint: (coords: ClientCoordinates) => coordDiff(currentBoardCoordinates(), clientToBoardCoordinates(coords))
  }
}

type BoardCoordinateHelper = ReturnType<typeof boardCoordinateHelper>