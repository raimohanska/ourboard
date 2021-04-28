import { router } from "typera-express"
import { boardCreate } from "./board-create"
import { boardHistoryGet } from "./board-history-get"
import { boardUpdate } from "./board-update"
import { githubWebhook } from "./github-webhook"
import { itemCreate } from "./item-create"
import { itemCreateOrUpdate } from "./item-create-or-update"

export default router(boardCreate, boardUpdate, githubWebhook, itemCreate, itemCreateOrUpdate, boardHistoryGet)
