import { h, Fragment, HarmajaChild } from "harmaja"
import * as L from "lonna"
import { Color } from "../../../../common/src/domain"
import { Tool, ToolController } from "../tool-selection"
import { black, selectedColor } from "../../components/UIColors"
import { IS_TOUCHSCREEN } from "../touchScreen"

export const ToolSelector = ({ toolController }: { toolController: ToolController }) => {
    const tool = toolController.tool
    return (
        <>
            { !IS_TOUCHSCREEN && <>
            <ToolIcon
                {...{
                    name: "select",
                    tooltip: "Select tool",
                    currentTool: tool,
                    svg: (c) => (
                        <svg viewBox="0 0 24 24">
                            <path fill={c} d="M7,2l12,11.2l-5.8,0.5l3.3,7.3l-2.2,1l-3.2-7.4L7,18.5V2" />
                        </svg>
                    ),
                }}
            />
            <ToolIcon
                {...{
                    name: "pan",
                    tooltip: "Pan tool",
                    currentTool: tool,
                    svg: (c) => (
                        <svg viewBox="0 0 24 24">
                            <path
                                fill={c}
                                d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83s1.26-1.23 1.3-1.25c.22-.19.49-.29.79-.29c.22 0 .42.06.6.16c.04.01 4.31 2.46 4.31 2.46V4c0-.83.67-1.5 1.5-1.5S11 3.17 11 4v7h1V1.5c0-.83.67-1.5 1.5-1.5S15 .67 15 1.5V11h1V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z"
                            />
                        </svg>
                    ),
                }}
            /></>}
            <ToolIcon
                {...{
                    name: "connect",
                    tooltip: "Connect tool",
                    currentTool: tool,
                    svg: (c) => (
                        <svg viewBox="0 0 24 24">
                            <path d="M0 0h24v24H0z" fill="none" />
                            <path
                                fill={c}
                                d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
                            />
                        </svg>
                    ),
                }}
            />
        </>
    )
}

const ToolIcon = ({
    name,
    tooltip,
    currentTool,
    svg,
}: {
    name: Tool
    tooltip: string
    currentTool: L.Atom<Tool>
    svg: (c: Color) => HarmajaChild
}) => {
    return (
        <span
            className={L.view(currentTool, (s) => (s === name ? "tool icon active" : "tool icon"))}
            title={tooltip}
            onClick={() => currentTool.set(name)}
        >
            {L.view(currentTool, (s) => svg(s === name ? selectedColor : black))}
        </span>
    )
}
