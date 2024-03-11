import { Browser, Locator, Page, expect, selectors, test } from "@playwright/test"
import { DashboardPage, navigateToDashboard } from "./DashboardPage"
import { sleep } from "../../../common/src/sleep"
import { assertNotNull } from "../../../common/src/assertNotNull"

export async function navigateToBoard(page: Page, browser: Browser, boardId: string) {
    selectors.setTestIdAttribute("data-test")
    await page.goto("http://localhost:1337/b/" + boardId)
    return BoardPage(page, browser)
}

export type NewBoardOptions = Partial<{
    boardName: string
    useCRDT: boolean
}>

export const navigateToNewBoard = (page: Page, browser: Browser, options?: NewBoardOptions) =>
    test.step("Create new board", async () => {
        const dashboard = await navigateToDashboard(page, browser)
        return await dashboard.createNewBoard(options)
    })

export const semiUniqueId = () => {
    const now = String(Date.now())
    return now.substring(now.length - 5)
}

export type BoardPage = ReturnType<typeof BoardPage>
export function BoardPage(page: Page, browser: Browser) {
    const board = page.locator(".online .board")
    const boardName = page.locator("#board-name").locator(`[contentEditable]`)
    const newNoteOnPalette = page.getByTestId("palette-new-note")
    const newTextOnPalette = page.getByTestId("palette-new-text")
    const newContainerOnPalette = page.getByTestId("palette-new-container")
    const scrollContainer = page.locator(`div [class="scroll-container"]`)
    async function waitForThrottle() {
        await sleep(50) // for UI throttling to take effect
    }

    async function moveMouseTo(newPos: { x: number; y: number }) {
        const clientPos = await itemToClientPos(newPos)
        await page.mouse.move(clientPos.clientX, clientPos.clientY, { steps: 10 })
        await waitForThrottle()
    }

    async function itemToClientPos(itemPos: { x: number; y: number }) {
        const scrollContainer = page.locator(`div [class="scroll-container"]`)
        const scPos = assertNotNull(await scrollContainer.boundingBox())
        return { clientX: itemPos.x + scPos.x, clientY: itemPos.y + scPos.y }
    }

    async function clientToElementPos(clientPos: { clientX: number; clientY: number }) {
        const scrollContainer = page.locator(`div [class="scroll-container"]`)
        const scPos = assertNotNull(await scrollContainer.boundingBox())
        return { x: Math.round(clientPos.clientX - scPos.x), y: Math.round(clientPos.clientY - scPos.y) }
    }

    async function getElementPosition(item: Locator) {
        const scPos = assertNotNull(await scrollContainer.boundingBox())
        const clientPos = assertNotNull(await item.boundingBox())
        return await clientToElementPos({
            clientX: clientPos.x + clientPos.width / 2,
            clientY: clientPos.y + clientPos.height / 2,
        })
    }

    async function getElementSize(item: Locator) {
        const { width, height } = assertNotNull(await item.boundingBox())
        return { width, height }
    }

    async function createNew(paletteItem: Locator, x: number, y: number) {
        await expect(paletteItem).toBeVisible()
        await paletteItem.dispatchEvent("dragstart")
        await paletteItem.dispatchEvent("dragover")
        await moveMouseTo({ x, y })
        await paletteItem.dispatchEvent("dragend")
    }

    async function dragElementOnBoard(element: Locator, x: number, y: number) {
        return await test.step(`Drag item to (${x}, ${y})`, async () => {
            const itemPos = await getElementPosition(element)
            await moveMouseTo(itemPos)
            await element.dispatchEvent("dragstart", await itemToClientPos(itemPos))
            await element.dispatchEvent("drag")
            page.locator(`.online .board`).dispatchEvent("dragover", await itemToClientPos(itemPos))
            await moveMouseTo({ x, y })
            page.locator(`.online .board`).dispatchEvent("dragover", await itemToClientPos({ x, y }))
            await waitForThrottle()
            await element.dispatchEvent("drag")
            await element.dispatchEvent("dragend")
        })
    }

    async function selectText(el: Locator, text: string) {
        await test.step("Select text " + text, async () => {
            // below code selects the given word from the line. text is the word I want to //select
            await el.evaluate((element, text: string) => {
                const selection = window.getSelection()!
                const content = (element as HTMLElement).innerText
                const range = document.createRange()
                const index = content.indexOf(text)
                if (index === -1) {
                    throw Error(`Text ${text} not found in ${content}`)
                }
                const textNode = element.firstChild!
                console.log("Textnode", textNode.textContent)
                range.setStart(textNode, index)
                console.log("Length", (textNode.textContent as any).length)
                range.setEnd(textNode, index + text.length)
                selection.removeAllRanges()
                selection.addRange(range)
            }, text)
        })
    }

    async function selectAll(el: Locator) {
        const textToSelect = (await el.textContent()) ?? ""
        selectText(el, textToSelect)
    }

    return {
        page,
        board,
        scrollContainer,
        newNoteOnPalette,
        newTextOnPalette,
        newContainerOnPalette,
        cloneButton: page.locator(".tool.duplicate"),
        getBoardId() {
            return assertNotNull(page.url().split("/").pop())
        },
        async assertBoardName(name: string) {
            await expect(boardName).toHaveText(name)
        },
        async getBoardName() {
            return assertNotNull(await boardName.textContent())
        },
        async renameBoard(name: string) {
            await test.step("Rename board", async () => {
                await boardName.click()
                await selectAll(boardName)
                await boardName.pressSequentially(name)
                await boardName.press("Enter")
                await this.assertBoardName(name)
            })
        },
        async assertStatusMessage(message: string) {
            await expect(page.locator(".board-status-message")).toHaveText(message)
        },
        async cloneBoard() {
            await page.getByTitle("Make a copy").click()
        },
        async goToDashBoard() {
            await page.getByRole("link", { name: "All boards" }).click()
            return DashboardPage(page, browser)
        },
        async createNoteWithText(x: number, y: number, text: string) {
            return await test.step("Create note " + text, async () => {
                await createNew(this.newNoteOnPalette, x, y)
                await page.keyboard.type(`${text}`)
                await page.keyboard.press("Escape")
                await expect(this.getNote(text)).toBeVisible()
                const result = this.getNote(text)
                await expect(result).toHaveText(text)
                return result
            })
        },
        async createText(x: number, y: number, text: string) {
            return await test.step("Create text " + text, async () => {
                await createNew(this.newTextOnPalette, x, y)
                await this.getText("HELLO")
                    .locator(".text")
                    .click({ position: { x: 5, y: 5 } })
                await page.keyboard.press("Delete")
                await page.keyboard.press("Delete")
                await page.keyboard.press("Delete")
                await page.keyboard.press("Delete")
                await page.keyboard.press("Delete")
                await page.keyboard.type(`${text}`)
                await expect(this.getText(text)).toBeVisible()
                const result = this.getText(text)
                await expect(result).toHaveText(text)
                return result
            })
        },
        async createArea(x: number, y: number, text: string) {
            return await test.step("Create area " + text, async () => {
                await createNew(this.newContainerOnPalette, x, y)
                await this.getArea("Unnamed area").locator(".text").dblclick()
                await page.keyboard.type(`${text}`)
                await expect(this.getArea(text)).toBeVisible()
                const result = this.getArea(text)
                await expect(result).toHaveText(text)
                return result
            })
        },
        async dragItem(item: Locator, x: number, y: number) {
            await dragElementOnBoard(item, x, y)
        },
        async dragSelectionBottomCorner(x: number, y: number) {
            const bottomCorner = board.locator(".corner-resize-drag.bottom.right")
            await dragElementOnBoard(bottomCorner, x, y)
        },
        getNote(name: string) {
            return page.locator(`.board > .note`).filter({ hasText: name })
        },
        getText(name: string) {
            return page.locator(`.board > .text`).filter({ hasText: name })
        },
        getArea(name: string) {
            return page.locator(`.board > .container`).filter({ hasText: name })
        },
        async assertItemPosition(item: Locator, x: number, y: number) {
            return await test.step(`Assert item position at (${x}, ${y})`, async () => {
                const pos = await getElementPosition(item)
                expect(pos.x).toBeGreaterThan(x - 5)
                expect(pos.x).toBeLessThan(x + 5)
                expect(pos.y).toBeGreaterThan(y - 5)
                expect(pos.y).toBeLessThan(y + 5)
            })
        },
        async assertItemSize(item: Locator, width: number, height: number) {
            return await test.step(`Assert item size (${width}, ${height})`, async () => {
                const size = await getElementSize(item)
                expect(size.width).toBeGreaterThan(width - 5)
                expect(size.width).toBeLessThan(width + 5)
                expect(size.height).toBeGreaterThan(height - 5)
                expect(size.height).toBeLessThan(height + 5)
            })
        },
        async getItemPosition(item: Locator) {
            return await getElementPosition(item)
        },
        async assertItemColor(item: Locator, color: string) {
            await expect(item.locator(".shape")).toHaveCSS("background-color", color)
        },

        async changeItemText(item: Locator, text: string) {
            await item.click()
            await item.locator(".text").dblclick()
            await page.keyboard.type(text)
        },
        async assertSelected(item: Locator, selected: boolean = true) {
            if (selected) {
                await expect(item).toHaveClass(/selected/)
            } else {
                await expect(item).not.toHaveClass(/selected/)
            }
        },
        async assertLocked(item: Locator, locked: boolean = true) {
            if (locked) {
                await expect(item).toHaveClass(/locked/)
            } else {
                await expect(item).not.toHaveClass(/locked/)
            }
        },
        async clickOnBoard(position: { x: number; y: number }) {
            await scrollContainer.click({ position })
        },
        async dragOnBoard(
            from: { x: number; y: number },
            to: { x: number; y: number },
            options: { altKey?: boolean } = {},
        ) {
            const startDrag: DragEventInit = { ...(await itemToClientPos(from)), ...options }
            const endDrag: DragEventInit = { ...(await itemToClientPos(to)), ...options }

            await moveMouseTo(from)
            await this.board.dispatchEvent("dragstart", startDrag)
            await this.board.dispatchEvent("drag", startDrag)
            await this.board.dispatchEvent("dragover", startDrag)

            await this.board.dispatchEvent("dragover", endDrag)
            await waitForThrottle()
            await this.board.dispatchEvent("drag", endDrag)
            await this.board.dispatchEvent("dragend", endDrag)
        },
        async selectItems(...items: Locator[]) {
            for (let i = 0; i < items.length; i++) {
                await this.assertLocked(items[i], false)
                if (i === 0) {
                    await items[i].click({ position: { x: 5, y: 5 } })
                } else {
                    await items[i].click({ modifiers: ["Shift"], position: { x: 5, y: 5 } })
                }
                await this.assertSelected(items[i], true)
            }
        },
        async setNickname(nickname: string) {
            await page
                .locator(".user-info .icon")
                .or(page.locator(".user-info .nickname"))
                .first()
                .click({ force: true })
            await page.locator(".user-info .nickname input").fill(nickname)
            await page.locator(".user-info button").click()
        },
        contextMenu: ContextMenu(page),
        async deleteIndexedDb() {
            await page.evaluate(async (boardId) => {
                const request = indexedDB.deleteDatabase(`b/${boardId}`)
                await new Promise((resolve, reject) => {
                    request.onsuccess = resolve
                    request.onerror = reject
                })
            }, this.getBoardId())
            expect
                .poll(async () => {
                    try {
                        const databases = await page.evaluate(async (boardId) => {
                            return await indexedDB.databases()
                        }, this.getBoardId())
                        return databases
                    } catch (e) {
                        console.warn("indexedDB.databases call failed. This is not supported in Firefox")
                        return []
                    }
                })
                .not.toContain(expect.objectContaining({ name: `b/${this.getBoardId()}` }))
        },
        async openBoardInNewBrowser() {
            const boardId = this.getBoardId()
            const newBoard = await navigateToBoard(await (await browser.newContext()).newPage(), browser, boardId)
            return newBoard
        },
        async setOfflineMode(offline: boolean) {
            await page.evaluate((offline) => {
                ;(window as any).forceOffline.set(offline)
            }, offline)
            if (offline) {
                await expect(page.locator(".offline-status")).toBeVisible()
            } else {
                await expect(page.locator(".offline-status")).not.toBeVisible()
            }
        },
    }
}

function ContextMenu(page: Page) {
    const contextMenu = page.locator(".context-menu")
    return {
        async openColorsAndShapes() {
            await contextMenu.locator(".colors-shapes .icon").click()
            return {
                async selectColor(color: string) {
                    await page.locator(`.submenu .colors .icon.${color}`).click()
                },
            }
        },
        async openHorizontalAlign() {
            await contextMenu.locator(".icon-group.align .icon").first().click()
            const submenu = page.locator(`.submenu.alignment.x`)
            return {
                left: submenu.getByTitle("Align left"),
                center: submenu.getByTitle("Align center"),
                right: submenu.getByTitle("Align right"),
            }
        },
        async openVerticalAlign() {
            await contextMenu.locator(".icon-group.align .icon").nth(1).click()
            const submenu = page.locator(`.submenu.alignment.y`)
            return {
                top: submenu.getByTitle("Align top"),
                middle: submenu.getByTitle("Align middle"),
                bottom: submenu.getByTitle("Align bottom"),
            }
        },
        async toggleContentsHidden() {
            await contextMenu.locator(".visibility .icon").click()
        },
    }
}
