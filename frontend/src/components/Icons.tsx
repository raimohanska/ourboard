import { h } from "harmaja"
import { Color } from "../../../common/src/domain"
import * as L from "lonna"
import { black, disabledColor } from "../components/UIColors"

export const ZoomInIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
        <path
            d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Zm-40-60v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z"
            fill="currentColor"
        />
    </svg>
)

export const ZoomOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
        <path
            d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400ZM280-540v-80h200v80H280Z"
            fill="currentColor"
        />
    </svg>
)

export const ResetZoomIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
        <path
            d="M822-142 592-372q-32 26-71 39t-81 13q-42 0-80-12.5T290-368l58-58q20 12 43 19t49 7q75 0 127.5-52.5T620-580q0-75-52.5-127.5T440-760q-69 0-119.5 46.5T262-598l50-50 56 56-148 148L72-592l56-56 54 52q6-103 80-173.5T440-840q109 0 184.5 75.5T700-580q0 42-13 82t-39 70l230 230-56 56Z"
            fill="currentColor"
        />
    </svg>
)

export const ShapeSquareIcon = (color: Color, fill?: Color) => (
    <svg viewBox="-2 -2 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
            x="0.5"
            y="0.5"
            width="31"
            height="31"
            rx="1.5"
            stroke={color}
            stroke-width="3"
            stroke-linecap="round"
            fill={fill}
        />
    </svg>
)

export const ShapeRoundIcon = (color: Color, fill?: Color) => (
    <svg viewBox="-2 -2 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
            x="0.5"
            y="0.5"
            width="31"
            height="31"
            rx="15.5"
            stroke={color}
            stroke-width="3"
            stroke-linecap="round"
            fill={fill}
        />
    </svg>
)

export const ShapeRectIcon = (color: Color, fill?: Color) => (
    <svg viewBox="-2 -2 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
            x="0.5"
            y="6.5"
            width="31"
            height="20"
            rx="1.5"
            stroke={color}
            stroke-width="3"
            stroke-linecap="round"
            fill={fill}
        />
    </svg>
)

export const ShapeDiamondIcon = (color: Color, fill?: Color) => (
    <svg viewBox="-2 -2 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
            fill={fill}
            x="4"
            y="4"
            width="23"
            height="23"
            rx="1.5"
            stroke={color}
            stroke-width="3"
            stroke-linecap="round"
            transform="rotate(45 15.5 15.5)"
        />
    </svg>
)

const enabledColor = (enabled: L.Property<boolean>) => L.view(enabled, (c) => (c ? black : disabledColor))

export const IncreaseFontSizeIcon = () => (
    <svg viewBox="0 -3 25 21" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M7.11072 0.959999H8.93472L15.8947 18H13.5907L11.5747 13.008H4.42272L2.43072 18H0.126719L7.11072 0.959999ZM11.0947 11.328L8.02272 3.456L4.85472 11.328H11.0947ZM24.9129 8.616V10.344H22.0809V13.416H20.1609V10.344H17.3289V8.616H20.1609V5.544H22.0809V8.616H24.9129Z"
            fill="currentColor"
        />
    </svg>
)

export const DecreaseFontSizeIcon = () => (
    <svg viewBox="0 -4 25 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M5.01913 0.639999H6.23513L10.8751 12H9.33913L7.99513 8.672H3.22713L1.89913 12H0.363125L5.01913 0.639999ZM7.67513 7.552L5.62713 2.304L3.51513 7.552H7.67513ZM12.0553 8.272V6.992H16.7753V8.272H12.0553Z"
            fill="currentColor"
        />
    </svg>
)

export const UndoIcon = ({ enabled }: { enabled: L.Property<boolean> }) => {
    const undoColor = enabledColor(enabled)
    return (
        <svg width="100%" viewBox="0 0 36 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M4.57075 16.0193C8.69107 8.20216 18.4669 5.25727 26.4057 9.44172C29.6423 11.1477 32.0739 13.7753 33.5397 16.8193"
                stroke={undoColor}
                stroke-width="2"
                stroke-linecap="round"
            />
            <path
                d="M2.43115 11.5003L4.54688 17.1371L10.3929 15.6968"
                stroke={undoColor}
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    )
}

export const RedoIcon = ({ enabled }: { enabled: L.Property<boolean> }) => {
    const redoColor = L.view(enabled, (c) => (c ? black : disabledColor))
    return (
        <svg width="100%" viewBox="0 0 35 29" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M30.3954 16.1554C26.5718 8.18892 16.9135 4.87867 8.82307 8.76176C5.52461 10.3449 2.99598 12.8793 1.41683 15.8659"
                stroke={redoColor}
                stroke-width="2"
                stroke-linecap="round"
            />
            <path
                d="M32.7031 11.72L30.377 17.2733L24.5893 15.6143"
                stroke={redoColor}
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    )
}

export const TextAlignHorizontalLeftIcon = () => (
    <svg viewBox="0 0 24 24">
        <path
            fill="currentColor"
            d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"
        ></path>
    </svg>
)

export const TextAlignHorizontalRightIcon = () => (
    <svg viewBox="0 0 24 24">
        <path
            fill="currentColor"
            d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"
        ></path>
    </svg>
)

export const TextAlignHorizontalCenterIcon = () => (
    <svg viewBox="0 0 24 24">
        <path
            fill="currentColor"
            d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"
        ></path>
    </svg>
)

export const TextAlignVerticalBottomIcon = () => (
    <svg viewBox="0 0 24 24">
        <path fill="currentColor" d="M16 13h-3V3h-2v10H8l4 4 4-4zM4 19v2h16v-2H4z"></path>
    </svg>
)

export const TextAlignVerticalMiddleIcon = () => (
    <svg viewBox="0 0 24 24">
        <path fill="currentColor" d="M8 19h3v4h2v-4h3l-4-4-4 4zm8-14h-3V1h-2v4H8l4 4 4-4zM4 11v2h16v-2H4z"></path>
    </svg>
)

export const TextAlignVerticalTopIcon = () => (
    <svg viewBox="0 0 24 24">
        <path fill="currentColor" d="M8 11h3v10h2V11h3l-4-4-4 4zM4 3v2h16V3H4z"></path>
    </svg>
)

export const AlignHorizontalLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M4 22H2V2h2v20zM22 7H6v3h16V7zm-6 7H6v3h10v-3z" />
    </svg>
)

export const AlignHorizontalRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M20,2h2v20h-2V2z M2,10h16V7H2V10z M8,17h10v-3H8V17z" />
    </svg>
)

export const AlignHorizontalCenterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <polygon
            fill="currentColor"
            points="11,2 13,2 13,7 21,7 21,10 13,10 13,14 18,14 18,17 13,17 13,22 11,22 11,17 6,17 6,14 11,14 11,10 3,10 3,7 11,7"
        />
    </svg>
)

export const AlignVerticalTopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M22 2v2H2V2h20zM7 22h3V6H7v16zm7-6h3V6h-3v10z" />
    </svg>
)

export const AlignVerticalCenterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <polygon
            fill="currentColor"
            points="22,11 17,11 17,6 14,6 14,11 10,11 10,3 7,3 7,11 1.84,11 1.84,13 7,13 7,21 10,21 10,13 14,13 14,18 17,18 17,13 22,13"
        />
    </svg>
)

export const AlignVerticalBottomIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M22,22H2v-2h20V22z M10,2H7v16h3V2z M17,8h-3v10h3V8z" />
    </svg>
)

export const HorizontalDistributeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M4 22H2V2h2v20zM22 2h-2v20h2V2zm-8.5 5h-3v10h3V7z" />
    </svg>
)

export const VerticalDistributeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M22 2v2H2V2h20zM7 10.5v3h10v-3H7zM2 20v2h20v-2H2z" />
    </svg>
)

export const TileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path
            fill="currentColor"
            d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z"
            fill-rule="evenodd"
        />
    </svg>
)

export const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8l8 8l1.41-1.41L7.83 13H20v-2z" />
    </svg>
)

export const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89l.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7s-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54l.72-1.21l-3.5-2.08V8H12z" />
    </svg>
)

export const UserIcon = () => (
    <svg viewBox="0 0 18 19" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse
            cx="9.00008"
            cy="5.44441"
            rx="4.44441"
            ry="4.44441"
            stroke="#566570"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
        <path
            d="M17 18C17 13.5817 13.4183 10 9 10C4.58172 10 1 13.5817 1 18"
            stroke="#566570"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
    </svg>
)

export const ConnectionLeftArrowIcon = () => (
    <svg width="30" height="12" viewBox="0 0 30 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M-1.90735e-06 6L10 11.7735V0.226497L-1.90735e-06 6ZM30 5L9 5V7L30 7V5Z" fill="currentColor" />
    </svg>
)

export const ConnectionCenterLineIcon = () => (
    <svg width="36" height="2" viewBox="0 0 36 2" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line y1="1" x2="36" y2="1" stroke="currentColor" stroke-width="2" />
    </svg>
)

export const ConnectionRightArrowIcon = () => (
    <svg width="30" height="12" viewBox="0 0 30 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 6L20 0.226497V11.7735L30 6ZM0 7L21 7V5L0 5L0 7Z" fill="currentColor" />
    </svg>
)

export const ConnectionEndLineIcon = () => (
    <svg width="30" height="2" viewBox="0 0 30 2" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line y1="1" x2="30" y2="1" stroke="currentColor" stroke-width="2" />
    </svg>
)

export const ConnectionLeftDotIcon = () => (
    <svg width="30" height="8" viewBox="0 0 30 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="3" y1="4" x2="30" y2="4" stroke="currentColor" stroke-width="2" />
        <circle cx="4" cy="4" r="4" fill="currentColor" />
    </svg>
)

export const ConnectionRightDotIcon = () => (
    <svg width="30" height="8" viewBox="0 0 30 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="27" y1="4" y2="4" stroke="currentColor" stroke-width="2" />
        <circle cx="26" cy="4" r="4" transform="rotate(-180 26 4)" fill="currentColor" />
    </svg>
)

export const ConnectionCenterCurveIcon = () => (
    <svg width="46" height="26" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M5.07492 8.4044C4.61425 11.5105 17.3143 24.2626 23.054 8.24941C28.7936 -7.76379 41.033 8.09442 41.033 8.09442"
            stroke="currentColor"
            stroke-width="2"
        />
    </svg>
)

export const LockIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"></path>
    </svg>
)

export const UnlockIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"></path>
    </svg>
)

export const ConnectionCenterCurveDotIcon = () => (
    <svg width="46" height="26" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M5.07492 8.4044C4.61425 11.5105 17.3143 24.2626 23.054 8.24941C28.7936 -7.76379 41.033 8.09442 41.033 8.09442"
            stroke="currentColor"
            stroke-width="2"
        />
        <circle cx="23" cy="9" r="4" fill="currentColor" />
    </svg>
)

export const VisibilityIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5m0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3"></path>
    </svg>
)

export const VisibilityOffIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7M2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2m4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3z"></path>
    </svg>
)
