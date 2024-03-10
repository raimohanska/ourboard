import { Page, expect, test } from "@playwright/test"
import { sleep } from "../../../common/src/sleep"
import { navigateToBoard } from "../pages/BoardPage"

async function loginAsTester(page: Page) {
    await test.step("Login as tester", async () => {
        await page.request.get("/test-callback")
    })
}

async function logout(page: Page) {
    await test.step("Logout", async () => {
        await page.request.get("/logout")
    })
}

// TODO: test creating accessPolicy through UI
// TODO: test changing accessPolicy through UI

test.describe("Board access policy", () => {
    test("Create board with accessPolicy using API", async ({ page, browser }) => {
        await test.step("With empty accessPolicy", async () => {
            const board = await test.step("Create board and navigate", async () => {
                const response = await page.request.post("/api/v1/board", {
                    data: {
                        name: "API restricted board",
                        accessPolicy: {
                            allowList: [],
                        },
                    },
                })
                const { id, accessToken } = await response.json()
                return await navigateToBoard(page, browser, id)
            })

            await test.step("Verify no UI access", async () => {
                await board.assertStatusMessage("This board is for authorized users only. Click here to sign in.")
                await loginAsTester(page)
                await page.reload()
                await board.assertStatusMessage("Sorry, access denied. Click here to sign in with another account.")
                await logout(page)
            })
        })

        await test.step("With non-empty accessPolicy", async () => {
            const board = await test.step("Create board and navigate", async () => {
                const response = await page.request.post("/api/v1/board", {
                    data: {
                        name: "API restricted board",
                        accessPolicy: {
                            allowList: [{ email: "ourboardtester@test.com" }],
                        },
                    },
                })
                const { id, accessToken } = await response.json()
                return await navigateToBoard(page, browser, id)
            })

            await test.step("Verify restricted access", async () => {
                await board.assertStatusMessage("This board is for authorized users only. Click here to sign in.")

                await loginAsTester(page)

                await page.reload()
                await board.assertBoardName("API restricted board")
            })

            await test.step("Rename board through UI", async () => {
                await board.renameBoard("API restricted board renamed")
                await sleep(1000)
                await page.reload()
                await board.assertBoardName("API restricted board renamed")
            })

            await test.step("Verify restricted access", async () => {
                await logout(page)
                await page.reload()
                await board.assertStatusMessage("This board is for authorized users only. Click here to sign in.")
            })
        })
    })

    test("Create restricted board with public read access using API", async ({ page, browser }) => {
        const { id, accessToken } = await test.step("Create board and navigate", async () => {
            const response = await page.request.post("/api/v1/board", {
                data: {
                    name: "API board with public read",
                    accessPolicy: {
                        publicRead: true,
                        allowList: [{ email: "ourboardtester@test.com" }],
                    },
                    crdt: true,
                },
            })
            return await response.json()
        })

        await loginAsTester(page)
        const board = await navigateToBoard(page, browser, id)

        await test.step("Create content as authorized user", async () => {
            await board.assertBoardName("API board with public read")
            await board.createNoteWithText(100, 200, "Test note")
            await board.createArea(100, 400, "Test area with CRDT")
        })

        await test.step("Verify read-only access", async () => {
            await logout(page)
            await page.reload()
            await expect(board.getNote("Test note")).toBeVisible()
            await expect(board.getArea("Test area with CRDT")).toBeVisible()

            await board.changeItemText(board.getNote("Test note"), "Updated note")
            await board.changeItemText(board.getArea("Test area with CRDT"), "I should not be able to do this")

            await expect(board.getArea("I should not be able to do this")).not.toBeVisible()
        })

        await test.step("Remove public read access", async () => {
            const newAccessPolicy = {
                allowList: [{ email: "ourboardtester@test.com" }],
                publicRead: false,
            }
            const response = await page.request.put(`/api/v1/board/${id}`, {
                data: {
                    name: "Updated board name",
                    accessPolicy: newAccessPolicy,
                },
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            expect(response.status()).toEqual(200)

            await page.reload()
            await board.assertStatusMessage("This board is for authorized users only. Click here to sign in.")
        })
    })
})
