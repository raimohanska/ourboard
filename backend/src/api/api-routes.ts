import { router } from "typera-express"
import { boardCreate } from "./board-create"
import { boardCSVGet } from "./board-csv-get"
import { boardGet } from "./board-get"
import { boardHierarchyGet } from "./board-hierarchy-get"
import { boardHistoryGet } from "./board-history-get"
import { boardUpdate } from "./board-update"
import { githubWebhook } from "./github-webhook"
import { itemCreate } from "./item-create"
import { itemCreateOrUpdate } from "./item-create-or-update"

export default router(
    boardGet,
    boardHierarchyGet,
    boardCSVGet,
    boardCreate,
    boardUpdate,
    githubWebhook,
    itemCreate,
    itemCreateOrUpdate,
    boardHistoryGet,
)
