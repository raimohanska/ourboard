import { Page, expect, test } from "@playwright/test"
import { Note } from "../../../common/src/domain"
import { sleep } from "../../../common/src/sleep"
import { navigateToBoard, semiUniqueId } from "../pages/BoardPage"
import { BoardApi } from "../pages/BoardApi"

test.describe("API endpoints", () => {
    test("Create and update board", async ({ page, browser }) => {
        const Api = BoardApi(page)
        const { id, accessToken } = await Api.createBoard({ name: "API test board" })

        const board = await navigateToBoard(page, browser, id)

        await test.step("Check board name", async () => {
            await board.assertBoardName("API test board")
            const userPageNoteText = `note-${semiUniqueId()}`
            await board.createNoteWithText(100, 200, userPageNoteText)
            await board.createArea(100, 400, "API notes")
            await board.createArea(550, 400, "More API notes")
        })

        await test.step("Set board name", async () => {
            await Api.updateBoard(accessToken, id, {
                name: "Updated board name",
            })
            await board.assertBoardName("Updated board name")
        })

        const item = await Api.createNote(accessToken, id, "API note", { container: "API notes" })

        await expect(board.getNote("API note")).toBeVisible()

        await test.step("Update item", async () => {
            await Api.updateItem(accessToken, id, item.id, {
                type: "note",
                text: "Updated item",
                color: "#000000",
            })
            await expect(board.getNote("Updated item")).toBeVisible()
        })

        await test.step("Change item container", async () => {
            await board.assertItemPosition(board.getNote("Updated item"), 163, 460)
            await Api.updateItem(accessToken, id, item.id, {
                type: "note",
                text: "Updated item",
                color: "#000000",
                container: "More API notes",
            })
            await sleep(1000)
            await board.assertItemPosition(board.getNote("Updated item"), 613, 460)
        })

        const itemWithCoordinates = await test.step("Create new item with position and size", async () => {
            const itemWithCoordinates = await Api.createNote(accessToken, id, "API New note", {
                x: 100,
                y: 200,
                width: 15,
                height: 30,
            })

            const noteElement = board.getNote("API New note")
            await expect(noteElement).toBeVisible()
            const style = await noteElement.getAttribute("style")
            expect(style).toContain("transform: translate(100em, 200em)")
            expect(style).toContain("width: 15em")
            expect(style).toContain("height: 30em")
            return itemWithCoordinates
        })

        await test.step("Update item position and size", async () => {
            await Api.updateItem(accessToken, id, itemWithCoordinates.id, {
                x: 20,
                y: 20,
                type: "note",
                text: "Updated new item",
                color: "#000000",
                width: 10,
                height: 10,
            })
            const noteElement = board.getNote("Updated new item")
            await expect(noteElement).toBeVisible()
            const style = await noteElement.getAttribute("style")
            expect(style).toContain("transform: translate(20em, 20em)")
            expect(style).toContain("width: 10em")
            expect(style).toContain("height: 10em")
        })

        await test.step("Get board state", async () => {
            expect
                .poll(async () => await Api.getBoard(accessToken, id))
                .toEqual({
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

            const content = await Api.getBoard(accessToken, id)
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
            expect
                .poll(async () => await Api.getBoardHierarchy(accessToken, id))
                .toEqual({
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
            const history = (await Api.getBoardHistory(accessToken, id)).history
            expect(history.length).toBeGreaterThan(0)
        })

        await test.step("Get board as CSV", async () => {
            // CSV only includes items that are in containers
            expect(await Api.getBoardCsv(accessToken, id)).toEqual("More API notes,Updated item\n")
        })

        await test.step("Set accessPolicy", async () => {
            await Api.updateBoard(accessToken, id, {
                name: "Updated board name",
                accessPolicy: {
                    allowList: [],
                    publicRead: false,
                    publicWrite: false,
                },
            })
            await page.reload()
            await board.assertStatusMessage("This board is for authorized users only. Click here to sign in.")

            expect((await Api.getBoard(accessToken, id)).board.accessPolicy).toEqual({
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
            await Api.updateBoard(accessToken, id, {
                name: "Updated board name",
                accessPolicy: newAccessPolicy,
            })
            await page.reload()
            await expect(board.getNote("Updated item")).toBeVisible()

            expect((await Api.getBoard(accessToken, id)).board.accessPolicy).toEqual(newAccessPolicy)
        })
    })

    test("Get board contents with CRDT text", async ({ page, browser }) => {
        const Api = BoardApi(page)
        const { id, accessToken } = await Api.createBoard({ name: "API test board", crdt: true })

        const board = await navigateToBoard(page, browser, id)
        await board.createText(100, 200, "CRDT text")
        await board.createNoteWithText(100, 400, "Simple note")

        await test.step("Get board state", async () => {
            const content = await Api.getBoard(accessToken, id)
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
            const content = await Api.getBoardHierarchy(accessToken, id)

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
