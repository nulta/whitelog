type MarkupNode = {
    tag: string,
    attributes: Record<string, string>,
    params: string[],
    children: MarkupSubTree,
    block: boolean,
}

type MarkupTree = MarkupNode[]
type MarkupSubTree = (MarkupNode|string)[]

const specialTag = (name: string, opener: string, closer: string) => ({ name, opener, closer })


export class MarkupParser {
    private readonly blockElemStart = /^\[([a-zA-Z][a-zA-Z0-9]*)/
    private readonly blockElemEnd = /^\s*\]\s?/
    private readonly indentations = 4
    private readonly defaultTag = "p"

    static parse(text: string): MarkupTree {
        return new MarkupParser(text).parse()
    }


    private lines: string[]
    private lineIndex: number = 0
    private blockIndents: number = 0

    private constructor(text: string) {
        this.lines = text.split("\n")
    }
    
    private parse(): MarkupTree {
        const contents: MarkupSubTree = this.parseBlockChildren()
        return this.regularizeSubTree(contents)
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


    private parseBlockTag(text: string): MarkupNode | null {
        const match = text.match(this.blockElemStart)
        if (!match) { return null }

        const { tag, attributes, params, trailingText, errored } =
            MarkupInlineParser.parseBlockTag(text, this.blockElemStart, this.blockElemEnd)
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

    private parseBlockChildren(): MarkupSubTree {
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

            // Do we enter a new sub-block?
            const subBlock = this.parseBlockTag(line)
            if (subBlock) {
                // Recursively parse the sub-block
                this.blockIndents++
                subBlock.children.push(
                    ...this.parseBlockChildren()
                )
                children.push(subBlock)
                this.blockIndents--
            } else {
                // Append the line to the current block
                children.push(line)
            }
        }

        // Remove trailing empty lines
        while (children.at(-1) == "") {
            children.pop()
        }

        // Format the text lines
        children = children
            .map(line => (typeof line == "string") ? this.parseInlineMarkup(line) : line)
            .flat()

        return children
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
                    tag: this.defaultTag,
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

    private parseInlineMarkup(text: string): MarkupSubTree {
        return MarkupInlineParser.parse(text)
    }
}

export class MarkupInlineParser {
    private readonly inlineElemStart = /\[([a-zA-Z][a-zA-Z0-9]*)/
    private readonly inlineElemSep = /^\s*:\s?/
    private readonly inlineElemEnd = "]"
    private readonly specialFormatters = [
        specialTag("strong", "**", "**"),
        specialTag("del", "~~", "~~"),
        specialTag("em", "*", "*"),
        specialTag("code", "`", "`"),
    ]

    static parse(text: string): MarkupSubTree {
        if (text == "") { return [""] }
        return new MarkupInlineParser(text).parse()
    }

    static parseBlockTag(text: string, tagStart: RegExp, tagEnd: RegExp) {
        const parser = new MarkupInlineParser(text)
        const tag = parser.consumeMatch(tagStart)
        const [attributes, params, errored] = parser.parseTagAttributes(tagEnd)
        const trailingText = parser.text

        return { tag, attributes, params, trailingText, errored }
    }


    private text: string
    private nodes: MarkupSubTree = []
    private parserStack: {node: MarkupNode, closer: string}[] = []

    private constructor(text: string) {
        this.text = text
    }

    private parse() {
        while (this.text.length > 0) {
            // 1: Find the nearest landmark
            const closing = this.findClosingTag()
            const openingSpecial = this.findOpeningSpecialTag()
            const opening = this.findOpeningTag()
            const nearest = [closing, openingSpecial, opening]
                .filter(v => v[0] != -1)
                .toSorted((a, b) => a[0] - b[0])[0]

            // No more landmarks?
            if (!nearest) {
                this.addChild(this.consumeText(0, this.text.length))
                break
            }

            // 2: Push the remaining text before the landmark
            const [index, length, tag, closer] = nearest
            const textBefore = this.consumeText(0, index, length)
            this.addChild(textBefore)

            // 3: Parse the nearest landmark
            if (nearest == closing) {
                this.endTag()
                continue
            }
            
            if (nearest == openingSpecial) {
                this.startTag(
                    { tag, attributes: {}, params: [], children: [], block: false },
                    closer!
                )
                continue
            }

            if (nearest == opening) {
                const [attributes, params] = this.parseTagAttributes()
                this.startTag(
                    { tag, attributes, params, children: [], block: false },
                    closer!
                )
                continue
            }
        }

        return this.nodes
    }


    private findClosingTag() {
        const target = this.parserStack.at(-1)?.closer
        if (!target) { return [-1, 0, "", null] as const }

        const index = this.text.indexOf(target)
        const length = target.length
        return [index, length, "", null] as const
    }

    private findOpeningSpecialTag() {
        const indexSpecial = this.specialFormatters
            .map(v => [ this.text.indexOf(v.opener), v.opener.length, v.name, v.closer ] as const)
            .filter(v => v[0] != -1)
            .reduce((a, b) => (a[0] > b[0] ? b : a), [Infinity, 0, "", ""] as const)

        const [index, length, tag, closer] = indexSpecial
        if (index == Infinity) { return [-1, 0, "", ""] as const }

        return [index, length, tag, closer] as const
    }

    private findOpeningTag() {
        const match = this.text.match(this.inlineElemStart)
        const index = match?.index ?? -1
        const length = match?.[0].length ?? 0
        const tag = match?.[1] ?? ""

        return [index, length, tag, this.inlineElemEnd] as const
    }


    private parseTagAttributes(parseUntil = this.inlineElemSep) {
        const attributes: Record<string, string> = {}
        const params: string[] = []
        let errored = false

        while (!this.consumeMatch(parseUntil)) {
            const str = this.tryParseString()
            const classSign = !str ? this.consumeMatch(/^\s*\./) : false
            const word = !str ? this.tryParseWord() : null
            const key = str ?? word

            // Invalid attribute?
            if (!key) {
                errored = true
                break
            }

            // Check if it's a class
            if (classSign) {
                const classes = attributes["class"]
                attributes["class"] = classes ? `${classes} ${key}` : key
                continue
            }

            // Check if it's a key-value pair
            const equals = this.consumeMatch(/^\s*=/)
            if (equals) {
                const val = this.tryParseValue() ?? ""
                attributes[key] = val
            } else {
                params.push(key)
            }
        }

        return [attributes, params, errored] as const
    }

    private tryParseString() {
        const quote = this.text.match(/^\s*(["'])/)
        if (!quote) { return null }

        const endQuoteIdx = this.text.indexOf(quote[1], quote[0].length)
        if (endQuoteIdx == -1) { return null }

        const str = this
            .consumeText(quote[0].length, endQuoteIdx, quote[1].length)

        return str
    }

    private tryParseWord() {
        return this.consumeMatch(/^\s*([a-zA-Z0-9-_.]*)/)
    }

    private tryParseValue() {
        const str = this.tryParseString()
        if (str) { return str }

        return this.tryParseWord()
    }

    private consumeMatch(regex: RegExp) {
        const match = this.text.match(regex)
        if (!match) { return null }

        this.consumeText(0, match[0].length)
        return match[1] ?? match[0]
    }

    private consumeText(start: number, end: number, endPadding: number = 0) {
        const text = this.text.slice(start, end)
        this.text = this.text.slice(end + endPadding)
        return text
    }


    private startTag(node: MarkupNode, closer: string) {
        this.addChild(node)
        this.parserStack.push({ node, closer })
    }

    private endTag() {
        // Trim the children
        const children = this.parserStack.at(-1)!.node.children
        while (children.at(-1) == "") {
            children.pop()
        }

        // Pop the stack
        this.parserStack.pop()
    }

    private addChild(node: MarkupNode | string) {
        if (node == "") { return }
        const children = this.parserStack.at(-1)?.node.children ?? this.nodes
        children.push(node)
    }
}


type TagTranslation = {
    elem: string,

    keepLineBreaks?: boolean,
    plainText?: boolean,
    regularize?: boolean,
    noContent?: boolean,

    defaultAttributes?: Record<string, string>,
    allowedAttributes?: string[],
    paramsToAttribute?: string[],

    defaultClasses?: string[],
    allowedClasses?: string[],

    overrideRendering?: (node: MarkupNode) => string,
}

type TagDefinition = {
    name: string,
    block?: TagTranslation,
    inline?: TagTranslation,
}

type TagDictConfig = {
    globalAllowedAttributes?: string[],
    globalAllowedClasses?: string[],
    defaultRegularizeTag?: string,
}

export class TagDictionary {
    private readonly tags: Map<string, TagDefinition> = new Map()
    private readonly config: TagDictConfig

    constructor(tags: TagDefinition[], config: TagDictConfig = {}) {
        this.config = config

        tags = JSON.parse(JSON.stringify(tags))
        for (const tag of tags) {
            if (this.tags.has(tag.name)) {
                const existing = this.tags.get(tag.name)!
                if (tag.block) { existing.block = tag.block }
                if (tag.inline) { existing.inline = tag.inline }
            } else {
                this.tags.set(tag.name, tag)
            }
        }
    }

    hasBlock(name: string) {
        return this.tags.get(name)?.block != null
    }

    hasInline(name: string) {
        return this.tags.get(name)?.inline != null
    }

    getBlock(name: string) {
        return this.tags.get(name)?.block ?? null
    }

    getInline(name: string) {
        return this.tags.get(name)?.inline ?? null
    }


}


const inlineTag = (name: string, elem = name, options: Partial<TagTranslation> = {}) => ({
    name,
    inline: { elem, ...options },
})
const blockTag = (name: string, elem = name, options: Partial<TagTranslation> = {}) => ({
    name,
    block: { elem, ...options },
})

export const defaultTagDictionary = new TagDictionary([
    blockTag("p"),
    blockTag("h1"),
    blockTag("h2"),
    blockTag("h3"),
    blockTag("h4"),
    blockTag("h5"),
    blockTag("h6"),
    blockTag("blockquote"),

    blockTag("code", "pre", { keepLineBreaks: true, plainText: true }),
    inlineTag("code", "code", { plainText: true }),
    blockTag("math", undefined, { plainText: true }),
    inlineTag("math", undefined, { plainText: true }),

    inlineTag("strong"),
    inlineTag("b", "strong"),
    inlineTag("em"),
    inlineTag("i", "em"),
    inlineTag("del"),
    inlineTag("small"),

    inlineTag("a", undefined, {
        allowedAttributes: ["href", "title"],
        paramsToAttribute: ["href"]
    }),

    inlineTag("img", undefined, {
        allowedAttributes: ["src", "alt", "width", "height"],
        paramsToAttribute: ["src"],
        noContent: true,
        defaultClasses: ["img-inline"],
    }),
    blockTag("img", undefined, {
        allowedAttributes: ["src", "alt", "width", "height"],
        paramsToAttribute: ["src"],
        noContent: true,
    }),

    blockTag("section", undefined, { regularize: true }),
    blockTag("aside", undefined, { regularize: true }),
    blockTag("figure", undefined),
    blockTag("figcaption", undefined),
    inlineTag("cite"),
], {
    globalAllowedAttributes: [],
    globalAllowedClasses: [],
})