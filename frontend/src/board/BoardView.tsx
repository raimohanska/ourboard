import * as H from "harmaja";
import { componentScope, h, ListView } from "harmaja";
import * as L from "lonna";
import { boardCoordinateHelper } from "./board-coordinates"
import { Image, Item, newNote, Note, UserCursorPosition} from "../../../common/domain";
import { ItemView } from "./ItemView"
import { BoardAppState, Dispatch } from "./board-store";
import { PaletteView } from "./PaletteView";
import { CursorsView } from "./CursorsView";
import { ImageView } from "./ImageView";
import { imageUploadHandler } from "./image-upload"
import { AssetStore } from "./asset-store";
import { cutCopyPasteHandler } from "./item-cut-copy-paste"
import { RectangularDragSelection } from "./RectangularDragSelection"
import { add } from "./geometry";
import { withCurrentContainer } from "./item-setcontainer";
import { synchronizeFocusWithServer } from "./synchronize-focus-with-server"
import { itemDeleteHandler } from "./item-delete"
import { itemUndoHandler } from "./item-undo-redo"

export const BoardView = (
  { boardId, cursors, state, assets, dispatch }: 
  { boardId: string, cursors: L.Property<UserCursorPosition[]>, state: L.Property<BoardAppState>, 
    assets: AssetStore, dispatch: Dispatch }
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

  const focus = synchronizeFocusWithServer(board, locks, userId, dispatch)

  const coordinateHelper = boardCoordinateHelper(element)
  
  cutCopyPasteHandler(board, focus, coordinateHelper, dispatch)

  const ref = (el: HTMLElement) => {
    element.set(el)
    function onURL(assetId: string, url: string) {
      board.get().items.forEach(i => {
        if (i.type === "image" && i.assetId === assetId && i.src != url) {
          dispatch({ action: "item.update", boardId, items: [{ ...i, src: url }]  })
        }
      })      
    }
    imageUploadHandler(el, assets, coordinateHelper, focus, onAdd, onURL)
  }

  itemDeleteHandler(boardId, dispatch, focus)
  itemUndoHandler(dispatch)

  L.fromEvent<JSX.KeyboardEvent>(window, "click").pipe(L.applyScope(componentScope())).forEach(event => {
    if (!element.get()!.contains(event.target as Node)) {
      // Click outside => reset selection
      focus.set({ status: "none" })
    }
  })

  function onClick(e: JSX.MouseEvent) {
    if (e.target === element.get()) {
      focus.set({ status: "none" })
    }
  }

  L.fromEvent<JSX.KeyboardEvent>(window, "dblclick").pipe(L.applyScope(componentScope())).forEach(event => {
    if (event.target === element.get()! || element.get()!.contains(event.target as Node)) {
      onDoubleClickAddNewNote()
    }
  })

  let lastAddedColor = "yellow"
  function onDoubleClickAddNewNote() {
    const newItem = newNote(["Crikey", "Blimey", "Gosh darn"][(Math.random() * 3) | 0], lastAddedColor)
    onAdd(newItem)
  }

  function onAdd(item: Item) {
    const { x, y } = add(coordinateHelper.currentBoardCoordinates.get(), { x: -item.width / 2, y: -item.height / 2 })
    item = withCurrentContainer({ ...item, x, y }, board.get())

    if (item.type === "note") {
      lastAddedColor = item.color
    }

    dispatch({ action: "item.add", boardId, items: [item] })
    
    if (item.type === "note" || item.type === "text") {
      focus.set({ status: "editing", id: item.id })
    } else {
      focus.set({ status: "selected", ids: new Set([item.id]) })
    }
  }

  coordinateHelper.currentBoardCoordinates.pipe(L.throttle(30)).forEach(position => {
    dispatch({ action: "cursor.move", position, boardId })
  })

  return (
    <div className="board-container">      
      <div className="controls">
        <span data-test="board-name" id="board-name">{L.view(board, "name")}</span>
        <button className="mini" onClick={() => zoom.modify((z) => z * 1.1)}>+</button>
        <button className="mini" onClick={() => zoom.modify((z) => z / 1.1)}>-</button>
        <PaletteView {...{ onAdd, board }}/>
      </div>
      <div className="scroll-container">
        <div className="border-container" style={style}>
          <div className="board" draggable={true} ref={ref} onClick={onClick}>
            <ListView
              observable={L.view(board, "items")}
              renderObservable={renderItem}
              getKey={(i) => i.id}
            />
            <RectangularDragSelection {...{ board, boardElem: element, coordinateHelper, focus, dispatch }}/>
            <CursorsView {...{ cursors, sessions, coordinateHelper }}/>
          </div>          
        </div>        
      </div>
    </div>
  );

  function renderItem(id: string, item: L.Property<Item>) {
    const isLocked = L.combineTemplate({ locks, userId })
      .pipe(L.map(({ locks, userId }) => !!locks[id] && locks[id] !== userId ))
    return L.view(L.view(item, "type"), t => {
      switch (t) {
        case "container":
        case "text":
        case "note" : return <ItemView {...{ 
            board, id, type: t, item: item as L.Property<Note>, 
            isLocked,
            focus,
            coordinateHelper, dispatch
        }} />
        case "image": return <ImageView {...{
          id, image: item as L.Property<Image>, assets, board,
          isLocked, focus, coordinateHelper, dispatch
        }}/>        
        default: throw Error("Unsupported item: " + t)
      }
    })    
  }
}