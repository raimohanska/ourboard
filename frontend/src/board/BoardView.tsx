import * as H from "harmaja";
import { componentScope, h, ListView } from "harmaja";
import * as L from "lonna";
import { boardCoordinateHelper } from "./board-coordinates"
import {AppEvent, Color, Container, Id, Image, Item, Note, UserCursorPosition} from "../../../common/domain";
import { ItemView } from "./ItemView"
import { BoardAppState } from "./board-store";
import { ContextMenuView, ContextMenu, HIDDEN_CONTEXT_MENU } from "./ContextMenuView"
import { PaletteView } from "./PaletteView";
import { CursorsView } from "./CursorsView";
import { ImageView } from "./ImageView";
import { imageUploadHandler } from "./image-upload"
import { AssetStore } from "./asset-store";
import { cutCopyPasteHandler } from "./cut-copy-paste"
import { RectangularDragSelection } from "./RectangularDragSelection"
import { add, multiply } from "./geometry";
import { maybeAddToContainer } from "./item-setcontainer";

export type BoardFocus = 
  { status: "none" } | 
  { status: "selected", ids: Id[] } | 
  { status: "dragging", ids: Id[] } | 
  { status: "editing", id: Id }

export type ItemFocus = "none" | "selected" | "editing" | "dragging"

export const BoardView = (
  { boardId, cursors, state, assets, dispatch }: 
  { boardId: string, cursors: L.Property<UserCursorPosition[]>, state: L.Property<BoardAppState>, 
    assets: AssetStore, dispatch: (e: AppEvent) => void }
) => {
  const board = L.view(state, s => s.board!)
  const locks = L.view(state, s => s.locks)
  const userId = L.view(state, s => s.userId)
  const sessions = L.view(state, s => s.users)
  const zoom = L.atom(1);
  const style = L.combineTemplate({
    fontSize: L.view(zoom, z => z + "em"),
    width: L.view(board, b => b.width + "em"),
    height: L.view(board, b => b.height + "em")
  })
  const element = L.atom<HTMLElement | null>(null);
  
  const contextMenu = L.atom<ContextMenu>(HIDDEN_CONTEXT_MENU)
  const focus = L.atom<BoardFocus>({status: "none" })
  const coordinateHelper = boardCoordinateHelper(element)

  cutCopyPasteHandler(board, focus, coordinateHelper, dispatch)

  const ref = (el: HTMLElement) => {
    element.set(el)
    function onURL(assetId: string, url: string) {
      board.get().items.forEach(i => {
        if (i.type === "image" && i.assetId === assetId && i.src != url) {
          dispatch({ action: "item.update", boardId, item: { ...i, src: url }  })
        }
      })      
    }
    imageUploadHandler(el, assets, coordinateHelper, focus, onAdd, onURL)
  }

  locks.forEach(l => {
    const user = userId.get()
    if (!user) {
      focus.set({ status: "none" })
      return
    }

    const f = focus.get()

    const hasLockOn = Object.keys(l).filter(itemId => l[itemId] === user)

    if (hasLockOn.length === 0) {
      focus.set({ status: "none" })
      return
    }

    if (f.status === "none") {
      focus.set({ status: "selected", ids: hasLockOn })
      return
    }

    if (f.status === "editing" && !hasLockOn.includes(f.id)) {
      focus.set({ status: "selected", ids: hasLockOn })
      return
    }

    if (f.status === "dragging" || f.status === "selected") {
      focus.set({ status: f.status, ids: hasLockOn })
    }    
  })

  L.fromEvent<JSX.KeyboardEvent>(document, "keyup").pipe(L.applyScope(componentScope())).forEach(e => {
    if (e.keyCode === 8 || e.keyCode === 46) { // del or backspace
      const s = focus.get()
      if (s.status === "selected") {
        s.ids.forEach(id => dispatch({ action: "item.delete", boardId, itemId: id}))
      }      
    }
  })

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
    const { x, y } = add(coordinateHelper.currentBoardCoordinates.get(), { x: -item.width / 2, y: -item.height / 2 })
    item = { ...item, x, y }

    dispatch({ action: "item.add", boardId, item })
    maybeAddToContainer(item, board.get(), dispatch)
    
    if (item.type === "note") {
      focus.set({ status: "editing", id: item.id })
    } else {
      focus.set({ status: "selected", ids: [item.id] })
    }
  }

  return (
    <div className="board-container">      
      <div className="controls">
        <span data-test="board-name" id="board-name">{L.view(board, "name")}</span>
        <button onClick={() => zoom.modify((z) => z * 1.1)}>+</button>
        <button onClick={() => zoom.modify((z) => z / 1.1)}>-</button>
        <PaletteView {...{ onAdd }}/>
      </div>
      <div className="scroll-container">
        <div className="border-container" style={style}>
          <div className="board" draggable={true} ref={ref} onClick={onClick}>
            <ListView
              observable={L.view(board, "items")}
              renderObservable={renderItem}
              getKey={(i) => i.id}
            />
            <RectangularDragSelection {...{ board, boardElem: element, coordinateHelper, focus, userId, locks, dispatch }}/>
            <CursorsView {...{ cursors, sessions, coordinateHelper }}/>
          </div>
          <ContextMenuView {...{contextMenu, setColor } } />
        </div>        
      </div>
    </div>
  );

  function renderItem(id: string, item: L.Property<Item>) {
    return L.view(L.view(item, "type"), t => {
      switch (t) {
        case "container":
        case "text":
        case "note" : return <ItemView {...{ 
            board, id, type: t, item: item as L.Property<Note>, 
            locks,
            userId,
            focus,
            coordinateHelper, dispatch,
            contextMenu
        }} />
        case "image": return <ImageView {...{
          id, image: item as L.Property<Image>, assets, locks,
          userId, board, focus, coordinateHelper, dispatch, contextMenu
        }}/>        
        default: throw Error("Unsupported item: " + t)
      }
    })    
  }
}