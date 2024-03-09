import { Browser, Page, expect, test } from "@playwright/test"
import { sleep } from "../../../common/src/sleep"
import { BoardPage, navigateToBoard, navigateToNewBoard, semiUniqueId } from "../pages/BoardPage"
import { assertNotNull } from "../../../common/src/assertNotNull"
import { Note } from "../../../common/src/domain"

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

test.describe("API endpoints", () => {
    test("Create and update board", async ({ page, browser }) => {
        const { id, accessToken } = await test.step("Create board", async () => {
            const response = await page.request.post("/api/v1/board", {
                data: {
                    name: "API test board",
                },
            })
            return await response.json()
        })

        const board = await navigateToBoard(page, browser, id)

        await test.step("Check board name", async () => {
            await board.assertBoardName("API test board")
            const userPageNoteText = `note-${semiUniqueId()}`
            await board.createNoteWithText(100, 200, userPageNoteText)
            await board.createArea(100, 400, "API notes")
            await board.createArea(550, 400, "More API notes")
        })

        await test.step("Set board name", async () => {
            const response = await page.request.put(`/api/v1/board/${id}`, {
                data: {
                    name: "Updated board name",
                },
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            expect(response.status()).toEqual(200)
            await board.assertBoardName("Updated board name")
        })

        const item = await test.step("Add item", async () => {
            const response = await page.request.post(`/api/v1/board/${id}/item`, {
                data: {
                    type: "note",
                    text: "API note",
                    container: "API notes",
                    color: "#000000",
                },
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            expect(response.status()).toEqual(200)
            await expect(board.getNote("API note")).toBeVisible()
            return await response.json()
        })

        await test.step("Update item", async () => {
            const response = await page.request.put(`/api/v1/board/${id}/item/${item.id}`, {
                data: {
                    type: "note",
                    text: "Updated item",
                    color: "#000000",
                },
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            expect(response.status()).toEqual(200)
            await expect(board.getNote("Updated item")).toBeVisible()
        })

        await test.step("Change item container", async () => {
            await board.assertItemPosition(board.getNote("Updated item"), 163, 460)
            const response = await page.request.put(`/api/v1/board/${id}/item/${item.id}`, {
                data: {
                    type: "note",
                    text: "Updated item",
                    color: "#000000",
                    container: "More API notes",
                },
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            expect(response.status()).toEqual(200)
            await sleep(1000)
            await board.assertItemPosition(board.getNote("Updated item"), 613, 460)
        })

        await test.step("Get board state", async () => {
            const response = await page.request.get(`/api/v1/board/${id}`, {
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            const content = await response.json()
            expect(content).toEqual({
                board: {
                    id,
                    name: "Updated board name",
                    width: 800,
                    height: 600,
                    serial: expect.anything(),
                    connections: [],
                    items: expect.anything(),
                },
            })

            expect(Object.values(content.board.items)).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: "container",
                        text: "API notes",
                    }),
                    expect.objectContaining({
                        type: "note",
                        text: "Updated item",
                    }),
                ]),
            )
        })

        await test.step("Get board state hierarchy", async () => {
            const response = await page.request.get(`/api/v1/board/${id}/hierarchy`, {
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            const content = await response.json()
            expect(content).toEqual({
                board: {
                    id,
                    name: "Updated board name",
                    width: 800,
                    height: 600,
                    serial: expect.anything(),
                    connections: [],
                    items: expect.anything(),
                },
            })
        })

        await test.step("Get board history", async () => {
            const response = await page.request.get(`/api/v1/board/${id}/history`, {
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            const content = await response.json()
            expect(content).toEqual(expect.arrayContaining([]))
        })

        await test.step("Get board as CSV", async () => {
            const response = await page.request.get(`/api/v1/board/${id}/csv`, {
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            const content = await response.text()
            expect(content).toEqual("More API notes,Updated item\n")
        })

        await test.step("Set accessPolicy", async () => {
            const response = await page.request.put(`/api/v1/board/${id}`, {
                data: {
                    name: "Updated board name",
                    accessPolicy: {
                        allowList: [],
                        publicRead: false,
                        publicWrite: false,
                    },
                },
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            expect(response.status()).toEqual(200)
            await page.reload()
            await board.assertStatusMessage("This board is for authorized users only. Click here to sign in.")

            expect(
                (
                    await (
                        await page.request.get(`/api/v1/board/${id}`, {
                            headers: {
                                API_TOKEN: accessToken,
                            },
                        })
                    ).json()
                ).board.accessPolicy,
            ).toEqual({
                allowList: [],
                publicRead: false,
                publicWrite: false,
            })
        })

        await test.step("Update accessPolicy", async () => {
            const newAccessPolicy = {
                allowList: [{ email: "ourboardtester@test.com" }],
                publicRead: true,
                publicWrite: true,
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
            await expect(board.getNote("Updated item")).toBeVisible()

            expect(
                (
                    await (
                        await page.request.get(`/api/v1/board/${id}`, {
                            headers: {
                                API_TOKEN: accessToken,
                            },
                        })
                    ).json()
                ).board.accessPolicy,
            ).toEqual(newAccessPolicy)
        })
    })

    test("Create board with accessPolicy", async ({ page, browser }) => {
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

    test("Get board contents with CRDT text", async ({ page, browser }) => {
        const { id, accessToken } = await test.step("Create board", async () => {
            const response = await page.request.post("/api/v1/board", {
                data: {
                    name: "API test board",
                    crdt: true,
                },
            })
            return await response.json()
        })

        const board = await navigateToBoard(page, browser, id)
        await board.createText(100, 200, "CRDT text")
        await board.createNoteWithText(100, 400, "Simple note")

        await test.step("Get board state", async () => {
            const response = await page.request.get(`/api/v1/board/${id}`, {
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            const content = await response.json()
            expect(Object.values(content.board.items)).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: "text",
                        text: "CRDT text",
                        textAsDelta: [{ insert: "CRDT text" }],
                    }),
                    expect.objectContaining({
                        type: "note",
                        text: "Simple note",
                    }),
                ]),
            )
            expect((Object.values(content.board.items)[1] as Note).textAsDelta).toBeUndefined()
        })

        await test.step("Get board hierarchy", async () => {
            const response = await page.request.get(`/api/v1/board/${id}/hierarchy`, {
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            const content = await response.json()
            expect(Object.values(content.board.items)).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: "text",
                        text: "CRDT text",
                        textAsDelta: [{ insert: "CRDT text" }],
                    }),
                ]),
            )
        })
    })
})
