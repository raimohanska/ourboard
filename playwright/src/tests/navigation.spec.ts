import { expect, test } from "@playwright/test"
import { navigateToBoard } from "../pages/BoardPage"

test.describe("Navigation", () => {
    test("Navigation to default board by URL", async ({ page, browser }) => {
        const board = await navigateToBoard(page, browser, "default")
        await board.assertBoardName("Test Board")
        expect(board.getBoardId()).toBe("default")
    })

    test("Navigation to non-existing board by URL", async ({ page, browser }) => {
        const board = await navigateToBoard(page, browser, "non-existing-board-id")
        await board.assertStatusMessage("Board not found. A typo, maybe?")
    })
})
