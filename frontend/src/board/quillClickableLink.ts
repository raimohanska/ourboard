import Quill from "quill"
var Link = Quill.import("formats/link")

export default class ClickableLink extends Link {
    static create(href: any) {
        let node = super.create(href) as HTMLAnchorElement
        node.title = href
        node.addEventListener("click", (e) => {
            e.stopPropagation()
            e.preventDefault()
            window.open(href, "_blank")
        })
        return node
    }
}
