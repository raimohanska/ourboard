import { AppEvent } from "../../../common/src/domain"
import MessageQueue from "./message-queue"

jest.useFakeTimers()

const init = () => {
    const mockServer = jest.fn((type: "app-events", events: AppEvent[], ackCallback: Function) => {
        setTimeout(ackCallback, 100)
    })
    const mockSocket = {
        send(type: "app-events", events: AppEvent[], ackCallback: Function) {
            mockServer(type, events, ackCallback)
        }
    }

    const queue = MessageQueue(mockSocket)

    return { queue, mockServer }
}

const socketPayload = (msgs: AppEvent[]) => ["app-events", msgs, expect.any(Function)]

describe("MessageQueue", () => {
    it("works", () => {
        const { queue, mockServer } = init()

        queue.enqueue({ action: "board.join", boardId: "b1" })

        jest.runAllTimers()

        expect(mockServer).toHaveBeenCalledWith(...socketPayload([{ action: "board.join", boardId: "b1" }]))
        expect(mockServer).toHaveBeenCalledTimes(1)
        expect(queue.queueSize.get()).toBe(0)
    })

    it("sends all messages in queue as a single batch", () => {
        const { queue, mockServer } = init()

        // first message sent immediately
        queue.enqueue({ action: "board.join", boardId: "b1" });

        // rest after ack
        ["b2", "b3"].forEach(boardId => {
            queue.enqueue({ action: "board.join", boardId })
        })

        jest.runAllTimers()

        expect(mockServer).toHaveBeenNthCalledWith(1, ...socketPayload([{ action: "board.join", boardId: "b1" }]))
        expect(mockServer).toHaveBeenNthCalledWith(2, ...socketPayload(["b2", "b3"].map(boardId => ({ action: "board.join", boardId }))))
        expect(mockServer).toHaveBeenCalledTimes(2)
        expect(queue.queueSize.get()).toBe(0)
    })
})