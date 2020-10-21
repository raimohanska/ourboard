import * as H from "harmaja";
import { h, ListView } from "harmaja";
import * as L from "lonna";
import { item } from "lonna/dist/lens";

import { AppEvent, Board, Color, PostIt, newPostIt, CursorPosition } from "../../../common/domain";
import { EditableSpan } from "../components/components"

export const BoardView = ({ boardId, cursors, board, dispatch }: { boardId: string, cursors: L.Property<CursorPosition[]>, board: L.Property<Board>, dispatch: (e: AppEvent) => void }) => {
  const zoom = L.atom(1);
  const style = zoom.pipe(L.map((z) => ({ fontSize: z + "em" })));
  const element = L.atom<HTMLElement | null>(null);

  function onDrag(event: JSX.DragEvent) {
    //console.log("Drag over board")
    dragOver = event
    event.preventDefault() // To disable Safari slow animation
  }
  function translateClientCoords(x: number, y: number): [number, number] {
    const rect = element.get()!.getBoundingClientRect()
    return [x - rect.x, y - rect.y]
  }
  return (
    <div className="board" onDragOver={onDrag} ref={element.set}>
      <h1>{L.view(board, "name")}</h1>
      <div className="controls">
        <button onClick={() => zoom.modify((z) => z * 1.1)}>+</button>
        <button onClick={() => zoom.modify((z) => z / 1.1)}>-</button>
        <span className="template">
          <span>Drag to add</span>
          {
            ["yellow", "pink", "cyan"].map(color =>
              <NewPostIt {...{ boardId, dispatch, color, translateClientCoords }} />
            )
          }
        </span>
      </div>
      <div className="board-inner" style={style} >
        <ListView
          observable={L.view(board, "items")}
          renderObservable={(id: string, postIt) => <PostItView {...{ boardId, id, postIt, dispatch }} />}
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
  { boardId, color, dispatch, translateClientCoords }: 
  { boardId: string, color: Color, translateClientCoords: (x: number, y: number) => [number, number], dispatch: (e: AppEvent) => void }
) => {
  const style = {
    background: color
  }
  
  const element = L.atom<HTMLElement | null>(null);
  
  function onDragEnd(dragEnd: JSX.DragEvent) {
    const coords = translateClientCoords(dragOver!.clientX, dragOver!.clientY)
    const x = pxToEm(coords[0], element.get()!);
    const y = pxToEm(coords[1], element.get()!);
    const item = newPostIt("HELLO", color, x, y)

    dispatch({ action: "item.add", boardId, item });
  }
  return <span ref={element.set} onDragEnd={onDragEnd} className="postit" draggable={true} style={style}>
    <span className="text"></span>
  </span>
}

let dragStart: JSX.DragEvent | null = null;
let dragOver: JSX.DragEvent | null = null;
let dragged: PostIt | null = null

export const PostItView = ({ boardId, id, postIt, dispatch }: { boardId: string, id: string; postIt: L.Property<PostIt>, dispatch: (e: AppEvent) => void }) => {
  const element = L.atom<HTMLElement | null>(null);
  function onDragStart(e: JSX.DragEvent) {
    dragStart = e;
    dragged = postIt.get()
  }
  function onDragEnd(event: JSX.DragEvent) {
    console.log("Drag end")
    if (!element.get() || !dragStart) return
    const xDiff = pxToEm(dragOver!.pageX - dragStart!.pageX, element.get()!);
    const yDiff = pxToEm(dragOver!.pageY - dragStart!.pageY, element.get()!);
    /*
    console.log("from", dragStart?.pageX, dragStart?.pageY)
    console.log("to", dragOver!.pageX, dragOver!.pageY)
    console.log("diff", xDiff, yDiff)
    */
    const current = postIt.get();
    const x = current.x + xDiff;
    const y = current.y + yDiff;
    dispatch({ action: "item.update", boardId, item: { ...current, x, y } });
  }

  const textAtom = L.atom(L.view(postIt, "text"), text => dispatch({ action: "item.update", boardId, item: { ...postIt.get(), text } }))
  const editingThis = L.atom(false)

  return (
    <span
      ref={element.set}
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
