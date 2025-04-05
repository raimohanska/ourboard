import { Page, expect, test } from "@playwright/test"

export function BoardApi(page: Page) {
    return {
        async getBoard(accessToken: string, boardId: string) {
            const response = await page.request.get(`/api/v1/board/${boardId}`, {
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            return response.json()
        },
        async getBoardHierarchy(accessToken: string, boardId: string) {
            const response = await page.request.get(`/api/v1/board/${boardId}/hierarchy`, {
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            return response.json()
        },
        async getBoardHistory(accessToken: string, boardId: string) {
            const response = await page.request.get(`/api/v1/board/${boardId}/history`, {
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            return response.json()
        },
        async getBoardCsv(accessToken: string, boardId: string) {
            const response = await page.request.get(`/api/v1/board/${boardId}/csv`, {
                headers: {
                    API_TOKEN: accessToken,
                },
            })
            return response.text()
        },
        async createNote(accessToken: string, boardId: string, text: string, attributes?: object) {
            return await test.step("Add item " + text, async () => {
                const response = await page.request.post(`/api/v1/board/${boardId}/item`, {
                    data: {
                        type: "note",
                        text,
                        color: "#000000",
                        ...attributes,
                    },
                    headers: {
                        API_TOKEN: accessToken,
                    },
                })
                expect(response.status()).toEqual(200)
                return await response.json()
            })
        },
        async createBoard(data: any) {
            const { id, accessToken } = await test.step("Create board", async () => {
                const response = await page.request.post("/api/v1/board", {
                    data,
                })
                return await response.json()
            })
            return { id, accessToken }
        },
        async updateBoard(accessToken: string, boardId: string, data: any) {
            await test.step("Update board", async () => {
                const response = await page.request.put(`/api/v1/board/${boardId}`, {
                    data,
                    headers: {
                        API_TOKEN: accessToken,
                    },
                })
                expect(response.status()).toEqual(200)
            })
        },
        async updateItem(accessToken: string, boardId: string, itemId: string, data: any) {
            await test.step("Update item", async () => {
                const response = await page.request.put(`/api/v1/board/${boardId}/item/${itemId}`, {
                    data,
                    headers: {
                        API_TOKEN: accessToken,
                    },
                })
                expect(response.status()).toEqual(200)
            })
        },
    }
}
