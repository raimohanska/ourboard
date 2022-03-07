import { h, Fragment, HarmajaChild } from "harmaja"
import * as L from "lonna"
import { Item, newContainer, newSimilarNote, newText, Note } from "../../../../common/src/domain"
import { BoardFocus } from "../board-focus"
import { Tool } from "../tool-selection"

export const PaletteView = ({
    latestNote,
    addItem,
    focus,
    tool,
}: {
    latestNote: L.Property<Note>
    addItem: (item: Item) => void
    focus: L.Atom<BoardFocus>
    tool: L.Atom<Tool>
}) => {
    return (
        <>
            <NewNote {...{ addItem, latestNote, focus, tool }} />
            <NewContainer {...{ addItem, focus, tool }} />
            <NewText {...{ addItem, focus, tool }} />
        </>
    )
}

export const NewText = ({
    addItem: onAdd,
    focus,
    tool,
}: {
    addItem: (i: Item) => void
    focus: L.Atom<BoardFocus>
    tool: L.Atom<Tool>
}) => {
    const svg = () => (
        <svg viewBox="0 0 44 49" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="36" cy="8.5" r="8" fill="#2F80ED" />
            <path
                d="M38.5309 8.816V8.002H36.4079V5.879H35.5939V8.002H33.4709V8.816H35.5939V10.939H36.4079V8.816H38.5309Z"
                fill="white"
            />
            <path
                d="M10.0695 17.78H12.5015L21.7815 40.5H18.7095L16.0215 33.844H6.4855L3.8295 40.5H0.7575L10.0695 17.78ZM15.3815 31.604L11.2855 21.108L7.0615 31.604H15.3815ZM22.8038 35.668C22.8038 34.6013 23.1024 33.684 23.6998 32.916C24.3184 32.1267 25.1611 31.5187 26.2278 31.092C27.2944 30.6653 28.5318 30.452 29.9398 30.452C30.6864 30.452 31.4758 30.516 32.3078 30.644C33.1398 30.7507 33.8758 30.9213 34.5158 31.156V29.94C34.5158 28.66 34.1318 27.6573 33.3638 26.932C32.5958 26.1853 31.5078 25.812 30.0998 25.812C29.1824 25.812 28.2971 25.9827 27.4438 26.324C26.6118 26.644 25.7264 27.1133 24.7878 27.732L23.7638 25.748C24.8518 25.0013 25.9398 24.4467 27.0278 24.084C28.1158 23.7 29.2464 23.508 30.4198 23.508C32.5531 23.508 34.2384 24.1053 35.4758 25.3C36.7131 26.4733 37.3318 28.116 37.3318 30.228V37.3C37.3318 37.6413 37.3958 37.8973 37.5238 38.068C37.6731 38.2173 37.9078 38.3027 38.2278 38.324V40.5C37.9504 40.5427 37.7051 40.5747 37.4918 40.596C37.2998 40.6173 37.1398 40.628 37.0118 40.628C36.3504 40.628 35.8491 40.4467 35.5078 40.084C35.1878 39.7213 35.0064 39.3373 34.9638 38.932L34.8998 37.876C34.1744 38.8147 33.2251 39.54 32.0518 40.052C30.8784 40.564 29.7158 40.82 28.5638 40.82C27.4544 40.82 26.4624 40.596 25.5878 40.148C24.7131 39.6787 24.0304 39.06 23.5398 38.292C23.0491 37.5027 22.8038 36.628 22.8038 35.668ZM33.6838 36.852C33.9398 36.5533 34.1424 36.2547 34.2918 35.956C34.4411 35.636 34.5158 35.3693 34.5158 35.156V33.076C33.8544 32.82 33.1611 32.628 32.4358 32.5C31.7104 32.3507 30.9958 32.276 30.2917 32.276C28.8624 32.276 27.6998 32.564 26.8038 33.14C25.9291 33.6947 25.4918 34.4627 25.4918 35.444C25.4918 35.9773 25.6304 36.5 25.9078 37.012C26.2064 37.5027 26.6331 37.908 27.1878 38.228C27.7638 38.548 28.4678 38.708 29.2998 38.708C30.1744 38.708 31.0064 38.5373 31.7958 38.196C32.5851 37.8333 33.2144 37.3853 33.6838 36.852Z"
                fill="black"
            />
        </svg>
    )
    return (
        <NewItem
            type="text"
            title="Text"
            tooltip="Drag to add new text area"
            svg={svg}
            focus={focus}
            createItem={newText}
            addItem={onAdd}
            tool={tool}
        />
    )
}

function lightenDarkenColor(col: string, amt: number) {
    var num = parseInt(col.replace("#", ""), 16)
    var r = (num >> 16) + amt
    var b = ((num >> 8) & 0x00ff) + amt
    var g = (num & 0x0000ff) + amt
    var newColor = g | (b << 8) | (r << 16)
    return "#" + newColor.toString(16)
}

export const NewNote = ({
    latestNote,
    addItem: onAdd,
    focus,
    tool,
}: {
    latestNote: L.Property<Note>
    addItem: (i: Item) => void
    focus: L.Atom<BoardFocus>
    tool: L.Atom<Tool>
}) => {
    const color = L.view(latestNote, "color")
    const cornerColor = L.view(color, (c) => lightenDarkenColor(c, -20))

    const noteColor = color
    const svg = () => (
        <svg viewBox="0 0 44 49" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M0 9.5C0 8.94771 0.447715 8.5 1 8.5H39C39.5523 8.5 40 8.94772 40 9.5V32.1073C40 32.3597 39.9045 32.6028 39.7328 32.7878L33.5 39.5L25.296 48.1866C25.1071 48.3866 24.8441 48.5 24.569 48.5H1C0.447716 48.5 0 48.0523 0 47.5V9.5Z"
                fill={noteColor}
            />
            <path d="M26 32.5H40L25 48.5V33.5C25 32.9477 25.4477 32.5 26 32.5Z" fill={cornerColor} />
            <circle cx="36" cy="8.5" r="8" fill="#2F80ED" />
            <path
                d="M38.5309 8.816V8.002H36.4079V5.879H35.5939V8.002H33.4709V8.816H35.5939V10.939H36.4079V8.816H38.5309Z"
                fill="white"
            />
        </svg>
    )
    return (
        <NewItem
            type="note"
            title="Note"
            tooltip="Drag to add new text note"
            svg={svg}
            focus={focus}
            createItem={() => newSimilarNote(latestNote.get())}
            addItem={onAdd}
            tool={tool}
        />
    )
}

export const NewContainer = ({
    addItem: onAdd,
    focus,
    tool,
}: {
    addItem: (i: Item) => void
    focus: L.Atom<BoardFocus>
    tool: L.Atom<Tool>
}) => {
    const svg = () => (
        <svg viewBox="0 0 44 49" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M0.5 9.5C0.5 9.22386 0.723857 9 1 9H39C39.2761 9 39.5 9.22386 39.5 9.5V32.5V47.5C39.5 47.7761 39.2761 48 39 48H25H1C0.723858 48 0.5 47.7761 0.5 47.5V9.5Z"
                fill="white"
                stroke="#BDBDBD"
            />
            <circle cx="36" cy="8.5" r="8" fill="#2F80ED" />
            <path
                d="M38.5309 8.816V8.002H36.4079V5.879H35.5939V8.002H33.4709V8.816H35.5939V10.939H36.4079V8.816H38.5309Z"
                fill="white"
            />
        </svg>
    )
    return (
        <NewItem
            type="container"
            title="Area"
            tooltip="Drag to add new area for organizing items"
            svg={svg}
            focus={focus}
            createItem={newContainer}
            addItem={onAdd}
            tool={tool}
        />
    )
}

export const NewItem = ({
    type,
    title,
    tooltip,
    createItem,
    focus,
    svg,
    addItem,
    tool,
}: {
    type: "note" | "container" | "text"
    title: string
    tooltip: string
    createItem: () => Item
    focus: L.Atom<BoardFocus>
    svg: () => HarmajaChild
    addItem: (i: Item) => void
    tool: L.Atom<Tool>
}) => {
    const startAdd = (e: JSX.UIEvent) => {
        focus.set({ status: "adding", element: svg(), item: createItem() })
        tool.set(type)
        e.preventDefault()
        e.stopPropagation()
    }
    const onEndDrag = () => {
        addItem(createItem())
    }
    return (
        <span
            className={L.view(tool, (t) => `new-item ${type} ${t === type ? "active" : ""}`)}
            onClick={startAdd}
            onTouchStart={startAdd}
        >
            <span
                className="icon"
                data-test={`palette-new-${type}`}
                title={tooltip}
                onDragEnd={onEndDrag}
                draggable={true}
            >
                {svg()}
            </span>
            <span className="text">{title}</span>
        </span>
    )
}
