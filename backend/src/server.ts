require("dotenv").config()
import express from "express"
import * as Http from "http"
import IO from "socket.io"
import { connectionHandler } from "./connection-handler"
import { initDB } from "./db"

const app = express();
let http = new Http.Server(app);
let io = IO(http);

app.use("/", express.static("../frontend/dist"))
app.use("/", express.static("../frontend/public"))
io.on("connection", connectionHandler)

const port = process.env.PORT || 1337

initDB()
    .then(() => {
        http.listen(port, () => {
            console.log("Listening on port " + port)
        })        
    })
    .catch(e => {
        throw e;
    })