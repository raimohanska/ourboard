import { Fragment, h } from "harmaja"
import * as L from "lonna"

export function ModalContainer({ content }: { content: L.Atom<any> }) {
    const stopPropagation = (e: JSX.KeyboardEvent) => {
        e.stopPropagation() // To prevent propagating to higher handlers which, for instance prevent defaults for backspace
    }
    return L.view(content, (c) => {
        if (!c) return null
        return (
            <div className="modal-container">
                <div
                    onKeyUp={stopPropagation}
                    onKeyDown={stopPropagation}
                    onKeyPress={stopPropagation}
                    className="modal-dialog"
                >
                    <div id="modal-close" className="modal-close" onClick={() => content.set(null)}>
                        <CrossIcon />
                    </div>
                    {c}
                </div>
            </div>
        )
    })
}

const CrossIcon = () => {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={"margin: auto"}
        >
            <path
                d="M5.6297 4.46967C5.3368 4.17678 4.86193 4.17678 4.56904 4.46967C4.27614 4.76256 4.27614 5.23744 4.56904 5.53033L5.6297 4.46967ZM18.569 19.5303C18.8619 19.8232 19.3368 19.8232 19.6297 19.5303C19.9226 19.2374 19.9226 18.7626 19.6297 18.4697L18.569 19.5303ZM19.6297 5.53033C19.9226 5.23744 19.9226 4.76256 19.6297 4.46967C19.3368 4.17678 18.8619 4.17678 18.569 4.46967L19.6297 5.53033ZM4.56904 18.4697C4.27614 18.7626 4.27614 19.2374 4.56904 19.5303C4.86193 19.8232 5.3368 19.8232 5.6297 19.5303L4.56904 18.4697ZM4.56904 5.53033L11.569 12.5303L12.6297 11.4697L5.6297 4.46967L4.56904 5.53033ZM11.569 12.5303L18.569 19.5303L19.6297 18.4697L12.6297 11.4697L11.569 12.5303ZM18.569 4.46967L11.569 11.4697L12.6297 12.5303L19.6297 5.53033L18.569 4.46967ZM11.569 11.4697L4.56904 18.4697L5.6297 19.5303L12.6297 12.5303L11.569 11.4697Z"
                fill="#151515"
            />
        </svg>
    )
}
