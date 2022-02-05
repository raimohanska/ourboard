import { h } from "harmaja"
import * as L from "lonna"
import { Board, isTextItem, Item } from "../../../../common/src/domain"
import { DecreaseFontSizeIcon, IncreaseFontSizeIcon } from "../../components/Icons"
import { Dispatch } from "../../store/board-store"

type Props = {
    focusedItems: L.Property<Item[]>
    board: L.Property<Board>
    dispatch: Dispatch
}

export function fontSizesMenu({ board, focusedItems, dispatch }: Props) {
    const textItems = L.view(focusedItems, (items) => items.filter(isTextItem))
    const anyText = L.view(textItems, (items) => items.length > 0)

    return L.view(anyText, (any) =>
        !any
            ? []
            : [
                  <div className="font-size icon-group">
                      <span className="icon" onClick={increaseFont} title="Bigger font">
                          <IncreaseFontSizeIcon />
                      </span>
                      <span className="icon" onClick={decreaseFont} title="Smaller font">
                          <DecreaseFontSizeIcon />
                      </span>
                  </div>,
              ],
    )

    function increaseFont() {
        dispatch({
            action: "item.font.increase",
            boardId: board.get().id,
            itemIds: textItems.get().map((i) => i.id),
        })
    }
    function decreaseFont() {
        dispatch({
            action: "item.font.decrease",
            boardId: board.get().id,
            itemIds: textItems.get().map((i) => i.id),
        })
    }
}
