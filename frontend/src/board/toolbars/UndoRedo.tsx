import { Fragment, h } from "harmaja"
import { BoardStore } from "../../store/board-store"
import { Dispatch } from "../../store/board-store"
import * as L from "lonna"
import { black, disabledColor } from "../../components/UIColors"

export function UndoRedo({ dispatch, boardStore }: { dispatch: Dispatch; boardStore: BoardStore }) {
    const undoColor = L.view(boardStore.canUndo, (c) => (c ? black : disabledColor))
    const redoColor = L.view(boardStore.canRedo, (c) => (c ? black : disabledColor))
    return (
        <div className="undo-redo">
            <span className="icon" title="Undo" onClick={() => dispatch({ action: "ui.undo" })}>
                <svg width="100%" viewBox="0 0 36 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M4.57075 16.0193C8.69107 8.20216 18.4669 5.25727 26.4057 9.44172C29.6423 11.1477 32.0739 13.7753 33.5397 16.8193"
                        stroke={undoColor}
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                    <path
                        d="M2.43115 11.5003L4.54688 17.1371L10.3929 15.6968"
                        stroke={undoColor}
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </span>
            <span className="icon" title="Redo" onClick={() => dispatch({ action: "ui.redo" })}>
                <svg width="100%" viewBox="0 0 35 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M30.3954 16.1554C26.5718 8.18892 16.9135 4.87867 8.82307 8.76176C5.52461 10.3449 2.99598 12.8793 1.41683 15.8659"
                        stroke={redoColor}
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                    <path
                        d="M32.7031 11.72L30.377 17.2733L24.5893 15.6143"
                        stroke={redoColor}
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </span>
        </div>
    )
}
