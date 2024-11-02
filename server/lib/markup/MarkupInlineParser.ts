import { MarkupSubTree, MarkupNode } from "./markup.ts"
import { TagDictionary } from "./TagDictionary.ts"

const specialTag = (name: string, opener: string, closer: string) => ({ name, opener, closer })

export class MarkupInlineParser {
    private readonly inlineElemStart = /\[([a-zA-Z][a-zA-Z0-9]*)/;
    private readonly inlineElemSep = /^\s*:\s?/;
    private readonly inlineElemEnd = "]";
    private readonly specialFormatters = [
        // TODO: Move to TagDictionary
        specialTag("strong", "**", "**"),
        specialTag("del", "~~", "~~"),
        specialTag("em", "*", "*"),
        specialTag("code", "`", "`"),
    ];

    private readonly dict: TagDictionary
    private text: string
    private nodes: MarkupSubTree = [];
    private parserStack: { node: MarkupNode; closer: string} [] = [];
    private parentTag: string | null = null
    private skipUntilNextCloser = false
    private copyConsumedTextTo: string[] | null = null

    constructor(dict: TagDictionary) {
        this.text = ""
        this.dict = dict
    }


    parseBlockTag(text: string, parentTag: string | null, tagStart: RegExp, tagEnd: RegExp) {
        this.init(text, parentTag)
        let tag = this.consumeMatch(tagStart)
        let {attributes, params, errored} = this.parseTagAttributes(tagEnd)
        const trailingText = this.text

        if (tag) {
            tag = this.dict.getNormalizedBlockTagName(tag, parentTag)
            errored = errored || !tag
        }

        return { tag, attributes, params, trailingText, errored }
    }

    parse(text: string, parentBlockTag: string | null, insertEolIndicator = false) {
        if (text == "") { return [""]} 

        this.init(text, parentBlockTag)

        while (this.text.length > 0) {
            this.processLandmark()
        }

        if (insertEolIndicator && typeof this.nodes.at(-1) != "string") {
            this.nodes.push("")
        }

        return this.nodes
    }


    private init(text: string, parentTag: string | null) {
        this.text = text
        this.nodes = []
        this.parserStack = []
        this.parentTag = parentTag
        this.skipUntilNextCloser = false
        this.copyConsumedTextTo = null
    }

    private processLandmark() {
        // 1: Find the nearest landmark
        const closing = this.findClosingTag()
        const openingSpecial = this.findOpeningSpecialTag()
        const opening = this.findOpeningTag()
        let nearest = [closing, openingSpecial, opening]
            .filter(v => v[0] != -1)
            .toSorted((a, b) => a[0] - b[0])[0]

        // Skip until the next closer?
        if (this.skipUntilNextCloser) {
            nearest = closing
        }

        // No more landmarks?
        if (!nearest) {
            this.addChild(this.consumeText(0, this.text.length))
            return
        }

        // 2: Push the remaining text before the landmark
        const [index, length, tag, closer] = nearest
        const textBefore = this.consumeText(0, index)
        this.addChild(textBefore)

        // 3: Parse the nearest landmark
        if (nearest == closing) {
            this.consumeText(0, length)
            this.endTag()
            return
        }

        if (nearest == openingSpecial) {
            this.consumeText(0, length)
            this.startTag(
                { tag, attributes: {}, params: [], children: [], block: false },
                closer!
            )
            return
        }

        if (nearest == opening) {
            const consumed1 = this.consumeText(0, length)
            const { attributes, params, errored, originalText: consumed2 } = this.parseTagAttributes()

            const ok = !errored && this.startTag(
                { tag, attributes, params, children: [], block: false },
                closer!
            )

            if (!ok) {
                this.addChild(consumed1 + consumed2.join(""))
            }
            return
        }
    }

    private findClosingTag() {
        const target = this.parserStack.at(-1)?.closer
        if (!target) { return [-1, 0, "", null] as const} 

        const index = this.text.indexOf(target)
        const length = target.length
        return [index, length, "", null] as const
    }

    private findOpeningSpecialTag() {
        const indexSpecial = this.specialFormatters
            .map(v => [this.text.indexOf(v.opener), v.opener.length, v.name, v.closer] as const)
            .filter(v => v[0] != -1)
            .reduce((a, b) => (a[0] > b[0] ? b : a), [Infinity, 0, "", ""] as const)

        const [index, length, tag, closer] = indexSpecial
        if (index == Infinity) { return [-1, 0, "", ""] as const} 

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

        this.copyConsumedTextTo = []
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

        const originalText = this.copyConsumedTextTo
        this.copyConsumedTextTo = null

        return {attributes, params, errored, originalText} as const
    }

    private tryParseString() {
        const quote = this.text.match(/^\s*(["'])/)
        if (!quote) { return null} 

        const endQuoteIdx = this.text.indexOf(quote[1], quote[0].length)
        if (endQuoteIdx == -1) { return null} 

        const str = this
            .consumeText(quote[0].length, endQuoteIdx, quote[1].length)

        return str
    }

    private tryParseWord() {
        return this.consumeMatch(/^\s*([a-zA-Z0-9-_.]*)/)
    }

    private tryParseValue() {
        const str = this.tryParseString()
        if (str) { return str} 

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

        if (this.copyConsumedTextTo != null) {
            const rawText = this.text.slice(0, end + endPadding)
            this.copyConsumedTextTo.push(rawText)
        }

        this.text = this.text.slice(end + endPadding)
        return text
    }

    private getParent() {
        return this.parserStack.at(-1)?.node?.tag ?? this.parentTag
    }


    private startTag(node: MarkupNode, closer: string) {
        const tag = this.dict.getNormalizedInlineTagName(node.tag, this.getParent())
        if (!tag) { return false }
        node.tag = tag

        this.addChild(node)
        this.parserStack.push({ node, closer })

        if (this.dict.shouldPlainText(tag)) {
            this.skipUntilNextCloser = true
        }

        return true
    }

    private endTag() {
        // Trim the children
        const children = this.parserStack.at(-1)!.node.children
        while (children.at(-1) == "") {
            children.pop()
        }

        // Pop the stack
        this.parserStack.pop()
        this.skipUntilNextCloser = false
    }

    private addChild(node: MarkupNode | string) {
        if (node == "") { return} 
        const children = this.parserStack.at(-1)?.node.children ?? this.nodes

        if (typeof node == "string" && typeof children.at(-1) == "string") {
            // Merge adjacent text nodes
            children.push(children.pop() + node)
        } else {
            children.push(node)
        }
    }
}
