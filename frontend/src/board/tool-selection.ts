import { localStorageAtom } from "./local-storage-atom"
import * as L from "lonna"

export type Tool = "pan" | "select" | "connect" | "note" | "container" | "text"
export type ControlSettings = {
    tool: Tool
    defaultTool?: Tool
}

export type ToolController = ReturnType<typeof ToolController>

export function ToolController() {
    const controlSettings = localStorageAtom<ControlSettings>("controlSettings", {
        tool: "pan",
    })
    const tool = L.atom(L.view(controlSettings, "tool"), (t) => {
        controlSettings.modify((s) => ({
            tool: t,
            defaultTool: t === "pan" || t === "select" ? t : s.defaultTool,
        }))
    })
    const defaultTool = L.view(controlSettings, (s) => s.defaultTool || "pan")

    const useDefaultTool = () => {
        tool.set(defaultTool.get())
    }

    return {
        controlSettings,
        tool,
        useDefaultTool,
    }
}
