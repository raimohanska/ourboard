import { Page, expect, selectors } from "@playwright/test"
import { navigateToDashboard } from "./DashboardPage"

export async function navigateToBoard(page: Page, boardId: string) {
    selectors.setTestIdAttribute("data-test")
    await page.goto("http://localhost:1337/b/" + boardId)
    return BoardPage(page)
}

export async function navigateToNewBoard(page: Page, boardName: string) {
    const dashboard = await navigateToDashboard(page)
    return await dashboard.createNewBoard(boardName)
}

export function BoardPage(page: Page) {
    return {
        newNoteOnPalette: page.getByTestId("palette-new-note"),
        getBoardId() {
            return assertNotNull(page.url().split("/").pop())
        },
        async assertBoardName(name: string) {
            await expect(page.locator("#board-name")).toHaveText(name)
        },
        async assertStatusMessage(message: string) {
            await expect(page.locator(".board-status-message")).toHaveText(message)
        },
        async goToDashBoard() {
            await page.getByRole("link", { name: "All boards" }).click()
        },
        async createNoteWithText(offset: number, text: string) {
            const container = (await page.$(`div [class="border-container"]`))!
            const { width, height } = (await container.boundingBox())!

            await expect(this.newNoteOnPalette).toBeVisible()

            await this.newNoteOnPalette.dispatchEvent("dragstart")
            await this.newNoteOnPalette.dispatchEvent("dragover")
            await page.mouse.move(width / 2 + offset, height / 2 + offset, { steps: 10 })
            await this.newNoteOnPalette.dispatchEvent("dragend")

            await this.newNoteOnPalette.dispatchEvent("select")
            await page.keyboard.type(`${text}`, { delay: 100 })
        },
        async getNote(name: string) {
            return page.locator(`[data-test^="note"][data-test*="${name}"]`)
        },
        userInfo: {
            async dismiss() {
                await page.locator(".user-info button").click()
            },
        },
    }
}

function assertNotNull<T>(x: T | null | undefined): T {
    if (x === null || x === undefined) throw Error("Assertion failed: " + x)
    return x
}
