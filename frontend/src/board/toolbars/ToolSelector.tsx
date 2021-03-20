import { h } from "harmaja"
import * as L from "lonna"
import { ControlSettings } from "../BoardView"

export const ToolSelector = ({ controlSettings }: { controlSettings: L.Atom<ControlSettings> }) => {
    return (
        <span className="tool-selector">
            <span
                className={L.view(controlSettings, (s) =>
                    s.tool === "select" ? "icon cursor-arrow active" : "icon cursor-arrow",
                )}
                title="Select tool"
                onClick={() => controlSettings.set({ tool: "select", hasUserManuallySetTool: true })}
            />
            <span
                className={L.view(controlSettings, (s) => (s.tool === "pan" ? "icon pan active" : "icon pan"))}
                title="Pan tool"
                onClick={() => controlSettings.set({ tool: "pan", hasUserManuallySetTool: true })}
            />
            <span
                className={L.view(controlSettings, (s) =>
                    s.tool === "connect" ? "icon connection active" : "icon connection",
                )}
                title="Connect tool"
                onClick={() => controlSettings.set({ tool: "connect", hasUserManuallySetTool: true })}
            />
        </span>
    )
}
