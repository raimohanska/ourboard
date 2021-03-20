import { h } from "harmaja"
import { Id } from "../../../../common/src/domain"

export function BackToAllBoardsLink({ navigateToBoard }: { navigateToBoard: (boardId: Id | undefined) => void }) {
    return (
        <a
            href="/"
            className="navigation"
            onClick={(e) => {
                navigateToBoard(undefined)
                e.preventDefault()
            }}
        >
            <span className="icon back" />
            All boards
        </a>
    )
}
