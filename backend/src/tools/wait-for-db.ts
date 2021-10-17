import TcpPortUsed from "tcp-port-used"
const port = 13338
;(async function () {
    console.log(`Waiting for DB to bind port ${port}...`)
    try {
        await TcpPortUsed.waitUntilUsed(port, 100, 10000)
    } catch {
        console.error("Timed out waiting for DB")
        process.exit(1)
    }
})()
