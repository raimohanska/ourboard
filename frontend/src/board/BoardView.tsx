import * as H from "harmaja";
import { componentScope, h, ListView } from "harmaja";
import * as L from "lonna";
import { boardCoordinateHelper } from "./board-coordinates"
import {AppEvent, Color, Id, Image, Item, PostIt, UserCursorPosition} from "../../../common/domain";
import { PostItView } from "./PostItView"
import { BoardAppState } from "./board-store";
import { ContextMenuView, ContextMenu, HIDDEN_CONTEXT_MENU } from "./ContextMenuView"
import { PaletteView } from "./PaletteView";
import { CursorsView } from "./CursorsView";
import { ImageView } from "./ImageView";
import { imageUploadHandler } from "./image-upload"
import { AssetStore } from "./asset-store";

export type BoardFocus = 
  { status: "none" } | 
  { status: "selected", ids: Id[] } | 
  { status: "editing", id: Id }

export const BoardView = (
  { boardId, cursors, state, assets, dispatch }: 
  { boardId: string, cursors: L.Property<UserCursorPosition[]>, state: L.Property<BoardAppState>, 
    assets: AssetStore, dispatch: (e: AppEvent) => void }
) => {
  const board = L.view(state, s => s.board!)
  const sessions = L.view(state, s => s.users)
  const zoom = L.atom(1);
  const style = zoom.pipe(L.map((z) => ({ fontSize: z + "em" })));
  const element = L.atom<HTMLElement | null>(null);
  const fontSize = style.pipe(L.map(((s: { fontSize: string; }) => s.fontSize)))
  const contextMenu = L.atom<ContextMenu>(HIDDEN_CONTEXT_MENU)
  const focus = L.atom<BoardFocus>({status: "none" })

  const ref = (el: HTMLElement) => {
    element.set(el)
    function onURL(assetId: string, url: string) {
      board.get().items.forEach(i => {
        if (i.type === "image" && i.assetId === assetId && i.src != url) {
          dispatch({ action: "item.update", boardId, item: { ...i, src: url }  })
        }
      })      
    }
    imageUploadHandler(el, assets, coordinateHelper, onAdd, onURL)
  }

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

  function onClick(e: JSX.MouseEvent) {
    if (e.target === element.get()) {
      focus.set({ status: "none" })
      contextMenu.set(HIDDEN_CONTEXT_MENU)
    }
  }

  function setColor(color: Color) {
    const f = focus.get()
    const b = board.get()
    if (f.status === "selected") {
      f.ids.forEach(id => {
        const current = b.items.find(i => i.id === id)
        if (!current) throw Error("Item not found: " + id)
        dispatch({ action: "item.update", boardId: b.id, item: { ...current, color } as Item  }); // TODO: this is post-it specific, not for all Items
      })
      contextMenu.set(HIDDEN_CONTEXT_MENU)
    }
  }

  function onAdd(item: Item) {
    dispatch({ action: "item.add", boardId, item })
    focus.set({ status: "editing", id: item.id })
  }

  return (
    <div className="board-container">
      <h1 id="board-name">{L.view(board, "name")}</h1>
      <div className="controls">
        <button onClick={() => zoom.modify((z) => z * 1.1)}>+</button>
        <button onClick={() => zoom.modify((z) => z / 1.1)}>-</button>
        <PaletteView {...{ coordinateHelper, onAdd }}/>
      </div>
      <div className="board" style={style} ref={ref} onClick={onClick}>
        <ListView
          observable={L.view(board, "items")}
          renderObservable={renderItem}
          getKey={(postIt) => postIt.id}
        />
        <CursorsView {...{ cursors, sessions, coordinateHelper }}/>
      </div>
      <ContextMenuView {...{contextMenu, setColor } } />
    </div>
  );

  function renderItem(id: string, item: L.Property<Item>) {
    return L.view(L.view(item, "type"), t => {
      switch (t) {
        case "note" : return <PostItView {...{ 
            board, id, postIt: item as L.Property<PostIt>, 
            focus,
            coordinateHelper, dispatch,
            contextMenu
        }} />
        case "image": return <ImageView {...{
          id, image: item as L.Property<Image>, assets,
          board, focus, coordinateHelper, dispatch, contextMenu
        }}/>
        default: throw Error("Unsupported item: " + t)
      }
    })    
  }
}