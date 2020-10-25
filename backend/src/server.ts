require("dotenv").config()
import express from "express"
import * as Http from "http"
import IO from "socket.io"
import { connectionHandler } from "./connection-handler"
import { initDB } from "./db"
import path from "path"
import { cleanActiveBoards } from "./board-store"

const app = express();
let http = new Http.Server(app);
let io = IO(http);

app.use("/", express.static("../frontend/dist"))
app.use("/", express.static("../frontend/public"))

app.get("/b/:boardId", async (req, res) => {    
    res.sendFile(path.resolve("../frontend/dist/index.html"))
})

io.on("connection", connectionHandler)

const port = process.env.PORT || 1337

initDB()
    .then(async ({ onEvent }) => {
        http.listen(port, () => {
            console.log("Listening on port " + port)
        })

        onEvent(["clean_boards"], e => {
            if (e.channel === "clean_boards") {
                cleanActiveBoards();
            }
        })
    })
    .catch(e => {
        console.error(e)
    })