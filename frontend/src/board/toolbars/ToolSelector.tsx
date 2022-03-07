import { Fragment, h, HarmajaChild } from "harmaja"
import { capitalize } from "lodash"
import * as L from "lonna"
import { Color } from "../../../../common/src/domain"
import { black } from "../../components/UIColors"
import { Tool, ToolController } from "../tool-selection"
import { IS_TOUCHSCREEN } from "../touchScreen"

export const ToolSelector = ({ toolController }: { toolController: ToolController }) => {
    const tool = toolController.tool
    return (
        <>
            {!IS_TOUCHSCREEN && (
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
            )}
            <ToolIcon
                {...{
                    name: "pan",
                    tooltip: "Pan tool",
                    currentTool: tool,
                    svg: (c) => (
                        <svg viewBox="0 0 34 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M17.5657 0.934315C17.2533 0.621895 16.7467 0.621895 16.4343 0.934315L11.3431 6.02548C11.0307 6.3379 11.0307 6.84443 11.3431 7.15685C11.6556 7.46927 12.1621 7.46927 12.4745 7.15685L17 2.63137L21.5255 7.15685C21.8379 7.46927 22.3444 7.46927 22.6569 7.15685C22.9693 6.84443 22.9693 6.3379 22.6569 6.02548L17.5657 0.934315ZM16.4343 34.0657C16.7467 34.3781 17.2533 34.3781 17.5657 34.0657L22.6569 28.9745C22.9693 28.6621 22.9693 28.1556 22.6569 27.8431C22.3444 27.5307 21.8379 27.5307 21.5255 27.8431L17 32.3686L12.4745 27.8431C12.1621 27.5307 11.6556 27.5307 11.3431 27.8431C11.0307 28.1556 11.0307 28.6621 11.3431 28.9745L16.4343 34.0657ZM16.2 1.5V33.5H17.8V1.5H16.2Z"
                                fill={c}
                            />
                            <path
                                d="M33.5657 18.0657C33.8781 17.7533 33.8781 17.2467 33.5657 16.9343L28.4745 11.8431C28.1621 11.5307 27.6556 11.5307 27.3431 11.8431C27.0307 12.1556 27.0307 12.6621 27.3431 12.9745L31.8686 17.5L27.3431 22.0255C27.0307 22.3379 27.0307 22.8444 27.3431 23.1569C27.6556 23.4693 28.1621 23.4693 28.4745 23.1569L33.5657 18.0657ZM0.434315 16.9343C0.121895 17.2467 0.121895 17.7533 0.434315 18.0657L5.52548 23.1569C5.8379 23.4693 6.34443 23.4693 6.65685 23.1569C6.96927 22.8444 6.96927 22.3379 6.65685 22.0255L2.13137 17.5L6.65685 12.9745C6.96927 12.6621 6.96927 12.1556 6.65685 11.8431C6.34443 11.5307 5.8379 11.5307 5.52548 11.8431L0.434315 16.9343ZM33 16.7L1 16.7L1 18.3L33 18.3L33 16.7Z"
                                fill={c}
                            />
                        </svg>
                    ),
                }}
            />
            <ToolIcon
                {...{
                    name: "connect",
                    tooltip: "Connect tool",
                    currentTool: tool,
                    svg: (c) => (
                        <svg viewBox="0 -9 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M31.4589 25.5L25.1773 17.9585L34.8493 16.2892L31.4589 25.5ZM2.3871 3.04943C9.59422 1.52064 15.8128 1.84779 20.7217 4.27343C25.6572 6.71218 29.1382 11.2072 30.9758 17.7302L29.3395 18.1911C27.6044 12.0318 24.3875 7.98098 19.9687 5.79752C15.5233 3.60094 9.73115 3.22942 2.73986 4.71243L2.3871 3.04943Z"
                                fill={c}
                            />
                            <circle
                                r="2.25"
                                transform="matrix(1 0 0 -1 3.54199 3.2746)"
                                fill="white"
                                stroke={c}
                                stroke-width="1.5"
                            />
                            <circle
                                r="2.3"
                                transform="matrix(1 0 0 -1 21.7061 5.97119)"
                                fill="white"
                                stroke={c}
                                stroke-width="1.4"
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
    const selectTool = () => currentTool.set(name)
    return (
        <span
            className={L.view(currentTool, (s) => (s === name ? "tool active" : "tool") + " " + name)}
            title={tooltip}
            onClick={selectTool}
            onTouchStart={selectTool}
        >
            <span className="icon">{L.view(currentTool, (s) => svg(black))}</span>
            <span className="text">{capitalize(name)}</span>
        </span>
    )
}
