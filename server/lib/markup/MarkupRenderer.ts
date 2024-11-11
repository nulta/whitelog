import { TagDictionary, MarkupParser, MarkupSubTree, MarkupNode } from "./markup.ts"

export class MarkupRenderer {
    private readonly dict: TagDictionary
    private readonly parser: MarkupParser

    constructor(dict: TagDictionary) {
        this.dict = dict
        this.parser = new MarkupParser(dict)
    }

    render(text: string): string {
        const tree = this.parser.parse(text)
        return this.renderTree(tree)
    }

    renderTree(tree: MarkupSubTree): string {
        return tree.map(node => this.renderNode(node)).join("")
    }

    renderNode(node: MarkupNode | string): string {
        if (typeof node === "string") {
            return this.escapeHtml(node)
        }

        const tag = this.dict.getHtmlTag(node.tag, node.block)
        if (!tag) { return "" }

        const attributes = this.renderAttributes(node.attributes)
        const children = this.renderTree(node.children)

        return this.stringifyHtmlTag(tag, attributes, children)
    }


    private stringifyHtmlTag(tag: string, attributes: string, children: string): string {
        attributes = attributes ? (" " + attributes) : ""
        return `<${tag}${attributes}>${children}</${tag}>`
    }

    private renderAttributes(attributes: Record<string, string>): string {
        return Object.entries(attributes)
            .map(([key, value]) => `${key.trim()}="${this.escapeHtml(value)}"`)
            .join(" ")
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
    }

    // TODO: 2. DOM-like rendering? (for client-side)
    // TODO: 3. DOM-like rendering with efficient diffing?
}
