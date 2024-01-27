import { test } from "@playwright/test"
import { navigateToBoard } from "../pages/BoardPage"
import { navigateToDashboard } from "../pages/DashboardPage"

test.describe("Dashboard", () => {
    test("Creating a new board", async ({ page }) => {
        const dashboard = await navigateToDashboard(page)
        const board = await dashboard.createNewBoard("My new board")
        await board.assertBoardName("My new board")
        await board.goToDashBoard()

        await test.step("Do it again to make sure it works", async () => {
            await dashboard.createNewBoard("My new board")
            await board.assertBoardName("My new board")
        })

        await test.step("Navigating to the new board by URL", async () => {
            const boardId = board.getBoardId()
            await board.goToDashBoard()
            await navigateToBoard(page, boardId)
            await board.assertBoardName("My new board")
        })

        await test.step("Navigating to the new board from the dashboard", async () => {
            await board.goToDashBoard()
            await dashboard.goToBoard("My new board")
            await board.assertBoardName("My new board")
        })
    })
    test("Personal tutorial board", async ({ page }) => {
        const dashboard = await navigateToDashboard(page)
        const board = await dashboard.goToTutorialBoard()
        await board.assertBoardName("My personal tutorial board")
    })
})
