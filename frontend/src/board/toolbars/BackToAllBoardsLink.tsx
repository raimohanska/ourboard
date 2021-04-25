import { h } from "harmaja"
import { Id } from "../../../../common/src/domain"
import { BackIcon } from "../../components/Icons"

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
            <span className="icon">
                <BackIcon />
            </span>
            All boards
        </a>
    )
}
