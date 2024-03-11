import { Browser, Page, selectors, test } from "@playwright/test"
import { BoardPage, semiUniqueId, NewBoardOptions } from "./BoardPage"

export async function navigateToDashboard(page: Page, browser: Browser) {
    selectors.setTestIdAttribute("data-test")
    await page.goto("http://localhost:1337")
    return DashboardPage(page, browser)
}

export function DashboardPage(page: Page, browser: Browser) {
    return {
        async createNewBoard(options?: NewBoardOptions) {
            return await test.step("Create new board", async () => {
                const name = options?.boardName ?? `Test board ${semiUniqueId()}`
                const useCRDT = options?.useCRDT ?? true

                await page.getByPlaceholder("Enter board name").fill(name)
                if (useCRDT) {
                    await page.getByText("use collaborative text editor").click()
                }
                await page.getByRole("button", { name: "Create" }).click()
                const board = BoardPage(page, browser)
                // TODO: this is flaky in at least "Switching between boards"
                await board.assertBoardName(name)
                return board
            })
        },
        async goToBoard(name: string) {
            await page.locator(".recent-boards li").filter({ hasText: name }).first().click()
            return BoardPage(page, browser)
        },
        async goToTutorialBoard() {
            await page.getByText("Tutorial Board").click()
            return BoardPage(page, browser)
        },
    }
}
