import { localStorageAtom } from "./local-storage-atom"
import * as L from "lonna"
import { componentScope } from "harmaja"

export type Tool = "pan" | "select" | "connect"
export type ControlSettings = {
    tool: Tool
    hasUserManuallySetTool: boolean
}

export type ToolController = ReturnType<typeof ToolController>

export function ToolController() {
    const controlSettings = localStorageAtom<ControlSettings>("controlSettings", {
        tool: "pan",
        hasUserManuallySetTool: false,
    })
    const tool = L.view(controlSettings, "tool")
    const defaultTool = tool.pipe(L.filter((t: Tool) => t === "pan" || t === "select", componentScope()))

    const useDefaultTool = () => {
        tool.set(defaultTool.get())
    }

    return {
        controlSettings,
        tool,
        useDefaultTool,
    }
}
