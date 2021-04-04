import fetch from "node-fetch"
import _ from "lodash"

const BOARD_COUNT = parseInt(process.env.BOARD_COUNT || "1")
const DOMAIN = process.env.DOMAIN
const API_ROOT = `${DOMAIN ? "https" : "http"}://${DOMAIN ?? "localhost:1337"}`
const CREATE_BOARD_API = `${API_ROOT}/api/v1/board`

async function createBoardAndReturnId(n: number) {
    const result = await fetch(CREATE_BOARD_API, {
        method: "POST",
        body: JSON.stringify({ name: "perftest" + n }),
        headers: {
            "content-type": "application/json",
        },
    })
    const body = await result.json()
    return body.id as string
}

const promises = _.range(1, BOARD_COUNT + 1).map(createBoardAndReturnId)
Promise.all(promises).then((ids) => {
    console.log(ids.join(","))
})
