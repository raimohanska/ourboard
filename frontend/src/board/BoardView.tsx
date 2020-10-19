import * as H from "harmaja";
import { h, ListView } from "harmaja";
import * as L from "lonna";
import io from "socket.io-client";
import { AppEvent, Board, PostIt } from "../../../common/domain";

export const BoardView = ({ boardId, board, dispatch }: { boardId: string, board: L.Property<Board>, dispatch: (e: AppEvent) => void}) => {
    const zoom = L.atom(1);
    const style = zoom.pipe(L.map((z) => ({ fontSize: z + "em" })));
    return (
      <div className="board">
        <h1>{L.view(board, "name")}</h1>
        <div className="controls">
          <button onClick={() => zoom.modify((z) => z * 1.1)}>+</button>
          <button onClick={() => zoom.modify((z) => z / 1.1)}>-</button>
        </div>
        <div className="board" style={style}>
          <ListView
            observable={L.view(board, "items")}
            renderObservable={(id: string, postIt) => <PostItView {...{ boardId, id, postIt, dispatch }} />}
            getKey={(postIt) => postIt.id}
          />
        </div>
      </div>
    );
}

export const PostItView = ({ boardId, id, postIt, dispatch }: { boardId: string, id: string; postIt: L.Property<PostIt>, dispatch: (e: AppEvent) => void }) => {
    let dragStart: JSX.DragEvent | null = null;
    const element = L.atom<HTMLElement | null>(null);
    function onDragStart(e: JSX.DragEvent) {
      dragStart = e;
    }
    function onDragEnd(dragEnd: JSX.DragEvent) {
      const current = postIt.get();
      const xDiff = pxToEm(dragEnd.clientX - dragStart!.clientX, element.get()!);
      const yDiff = pxToEm(dragEnd.clientY - dragStart!.clientY, element.get()!);
      const x = current.x + xDiff;
      const y = current.y + yDiff;
      dispatch({ action: "item.update", boardId, item: { ...current, x, y } });
    }
  
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
          padding: "1em"
        })))}
        color={L.view(postIt, "color")}
      >
        <span className="text">{L.view(postIt, "text")}</span>
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
  