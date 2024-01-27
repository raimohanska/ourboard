import { Browser, Page, chromium, test, expect } from "@playwright/test"
import { navigateToDashboard } from "../pages/DashboardPage"
import { navigateToBoard } from "../pages/BoardPage"

test.describe("Navigation", () => {
    test("Navigation to default board by URL", async ({ page }) => {
        const board = await navigateToBoard(page, "default")
        await board.assertBoardName("Test Board")
        expect(board.getBoardId()).toBe("default")
    })

    test("Navigation to non-existing board by URL", async ({ page }) => {
        const board = await navigateToBoard(page, "non-existing-board-id")
        await board.assertStatusMessage("Board not found. A typo, maybe?")
    })
})
