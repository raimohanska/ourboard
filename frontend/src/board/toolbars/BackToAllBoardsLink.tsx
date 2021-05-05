import { h } from "harmaja"
import { Link } from "harmaja-router"
import { Routes } from "../../board-navigation"
import { BackIcon } from "../../components/Icons"
export function BackToAllBoardsLink() {
    return (
        <Link<Routes> href="/" className="navigation">
            <span className="icon">
                <BackIcon />
            </span>
            All boards
        </Link>
    )
}
