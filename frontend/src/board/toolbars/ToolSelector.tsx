import { h } from "harmaja"
import * as L from "lonna"
import { ToolController } from "../tool-selection"

export const ToolSelector = ({ toolController }: { toolController: ToolController }) => {
    const tool = toolController.tool
    return (
        <span className="tool-selector">
            <span
                className={L.view(tool, (s) => (s === "select" ? "icon cursor-arrow active" : "icon cursor-arrow"))}
                title="Select tool"
                onClick={() => tool.set("select")}
            />
            <span
                className={L.view(tool, (s) => (s === "pan" ? "icon pan active" : "icon pan"))}
                title="Pan tool"
                onClick={() => tool.set("pan")}
            />
            <span
                className={L.view(tool, (s) => (s === "connect" ? "icon connection active" : "icon connection"))}
                title="Connect tool"
                onClick={() => tool.set("connect")}
            />
        </span>
    )
}
