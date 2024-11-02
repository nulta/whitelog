import { MarkupTree, MarkupNode, MarkupSubTree } from "./markup.ts"
import { TagDictionary } from "./TagDictionary.ts"
import { MarkupInlineParser } from "./MarkupInlineParser.ts"


export class MarkupParser {
    private readonly blockElemStart = /^\[([a-zA-Z][a-zA-Z0-9]*)/;
    private readonly blockElemEnd = /^\s*\]\s?/;
    private readonly indentations = 4;

    private readonly dict: TagDictionary
    private readonly inlineParser: MarkupInlineParser
    private lines: string[] = [];
    private lineIndex: number = 0;
    private blockIndents: number = 0;


    constructor(dict: TagDictionary) {
        this.dict = dict
        this.inlineParser = new MarkupInlineParser(dict)
    }

    parse(text: string): MarkupTree {
        this.init(text)

        const parsed = this.parseChildren(null)
        const contents = this.regularizeSubTree(parsed)
        contents.forEach(content => this.dict.sanitizeNode(content))
        return contents
    }


    private init(text: string) {
        this.lines = text.split("\n")
        this.lineIndex = 0
        this.blockIndents = 0
    }

    private parseBlockTag(text: string, parentTag: string | null): MarkupNode | null {
        const match = text.match(this.blockElemStart)
        if (!match) { return null }

        const { tag, attributes, params, trailingText, errored } =
            this.inlineParser.parseBlockTag(text, parentTag, this.blockElemStart, this.blockElemEnd)
        if (!tag || errored) { return null }

        const children = [trailingText.trimEnd()].filter(Boolean)
        return {
            tag,
            attributes,
            params,
            children,
            block: true,
        }
    }

    private parseChildren(parentTag: string | null): MarkupSubTree {
        let children: MarkupSubTree = []

        // Parse the block children
        while (!this.isEof()) {
            // Skip empty lines
            if (this.isWhitespace(this.peek())) {
                children.push("")
                this.next()
                continue
            }

            // Look for the indentation level, and then advance
            const line = this.trimIndent(this.peek()!, this.blockIndents)?.trimEnd()
            if (!line) { break }
            this.next()

            // Assume no child?
            if (this.dict.shouldHaveNoChildren(parentTag ?? "")) {
                continue
            }

            // Do we enter a new sub-block?
            const plainText = this.dict.shouldPlainText(parentTag ?? "")
            const subBlock = this.parseBlockTag(line, parentTag)
            if (!plainText && subBlock) {
                // Recursively parse the sub-block
                this.blockIndents++
                subBlock.children.push(
                    ...this.parseChildren(subBlock.tag)
                )
                children.push(subBlock)
                this.blockIndents--
            } else {
                // Append the line to the current block
                children.push(line)
            }
        }

        children = this.afterParse(children, parentTag)
        return children
    }

    private afterParse(children: MarkupSubTree, parentTag: string | null): MarkupSubTree {
        // Format the text lines
        if (!this.dict.shouldPlainText(parentTag ?? "")) {
            children = children
                .map(line => (typeof line == "string") ? this.parseInlineMarkup(line, parentTag) : line)
                .flat()
        }

        // Regularize
        if (this.dict.shouldRegularizeChildren(parentTag ?? "")) {
            children = this.regularizeSubTree(children)
        }

        // Remove trailing empty lines
        while (children.at(-1) == "") {
            children.pop()
        }

        return children
    }

    private next() {
        return this.lines[this.lineIndex++]
    }

    private peek() {
        return this.lines[this.lineIndex]
    }

    private isEof() {
        return this.lineIndex >= this.lines.length
    }

    private isWhitespace(text: string) {
        return text.trim() == ""
    }

    private parseIndents(line: string) {
        const regexp = new RegExp(`^((?:[ ]{${this.indentations}})*)(.*)`)
        const splits = line.match(regexp)!

        if (!splits[1]) {
            return {
                indentLevel: 0,
                str: line
            }
        }

        return {
            indentLevel: splits[1].length / this.indentations,
            str: splits[2]
        }
    }

    private trimIndent(line: string, indentLevel: number): string | null {
        if (this.parseIndents(line).indentLevel < indentLevel) {
            return null
        }

        // Only assuming space indentation for now
        return line.slice(indentLevel * this.indentations)
    }

    private regularizeSubTree(contents: MarkupSubTree): MarkupTree {
        const tree: MarkupTree = []

        // Merge consecutive top-level text lines into a single <p> block
        let currentDefaultBlock: MarkupNode | null = null
        for (const content of contents) {
            // Pass through block node
            if (typeof content != "string" && content.block) {
                currentDefaultBlock = null
                tree.push(content)
                continue
            }

            // Split the block by empty lines
            if (content == "") {
                currentDefaultBlock = null
                continue
            }

            // Create a new <p> block
            if (!currentDefaultBlock) {
                currentDefaultBlock = {
                    tag: this.dict.regularizeTarget,
                    attributes: {},
                    params: [],
                    children: [],
                    block: true,
                }
                tree.push(currentDefaultBlock)
            }

            // Append the text to the current <p> block
            currentDefaultBlock.children.push(content)
        }

        return tree
    }

    private parseInlineMarkup(text: string, parent: string | null): MarkupSubTree {
        return this.inlineParser.parse(text, parent, true)
    }
}
