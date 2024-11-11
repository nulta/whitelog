import { MarkupNode } from "./markup.ts"

export class TagDictionary {
    private readonly tags: Map<string, TagDefinition> = new Map();
    private readonly config: TagDictConfig

    constructor(tags: TagDefinition[], config: TagDictConfig = {}) {
        this.config = config

        tags = JSON.parse(JSON.stringify(tags))
        for (const tag of tags) {
            if (this.tags.has(tag.name)) {
                const existing = this.tags.get(tag.name)!
                if (tag.block) { existing.block = tag.block} 
                if (tag.inline) { existing.inline = tag.inline} 
            } else {
                this.tags.set(tag.name, tag)
            }
        }
    }

    extend(tags: TagDefinition[], config: TagDictConfig = {}) {
        const globalAllowedAttributes = [...new Set([
            ...config.globalAllowedAttributes ?? [],
            ...this.config.globalAllowedAttributes ?? [],
        ])]

        const globalAllowedClasses = [...new Set([
            ...config.globalAllowedClasses ?? [],
            ...this.config.globalAllowedClasses ?? [],
        ])]


        return new TagDictionary([
            ...this.tags.values(),
            ...tags
        ], {
            ...this.config,
            ...config,
            globalAllowedAttributes,
            globalAllowedClasses,
        })
    }


    get regularizeTarget() {
        return this.config.regularizeTarget ?? "p"
    }

    shouldRegularizeChildren(tag: string, parent?: string | null) {
        return this.getBlock(tag, parent)?.regularize ?? false
    }

    shouldPlainText(tag: string, parent?: string | null) {
        return this.getBlock(tag, parent)?.plainText ?? false
    }

    shouldHaveNoChildren(tag: string, parent?: string | null) {
        return this.getBlock(tag, parent)?.noContent ?? false
    }

    getNormalizedBlockTagName(tag: string, parent?: string | null) {
        parent = parent?.split(">")?.at(-1)
        tag = tag.split(">").at(-1)!

        const parentName = `${parent}>${tag}`
        if (parent && this.tags.get(parentName)?.block) {
            return parentName
        } else if (this.tags.get(tag)?.block) {
            return tag
        } else {
            return this.config.unsafelyAllowAnyTags ? tag : null
        }
    }

    getNormalizedInlineTagName(tag: string, parent?: string | null) {
        parent = parent?.split(">")?.at(-1)
        tag = tag.split(">").at(-1)!

        const parentName = `${parent}>${tag}`
        if (parent && this.tags.get(parentName)?.inline) {
            return parentName
        } else if (this.tags.get(tag)?.inline) {
            return tag
        } else {
            return this.config.unsafelyAllowAnyTags ? tag : null
        }
    }

    blockExists(tag: string, parent?: string | null) {
        if (this.config.unsafelyAllowAnyTags) { return true }
        return this.getBlock(tag, parent) != null
    }

    inlineExists(tag: string, parent?: string | null) {
        if (this.config.unsafelyAllowAnyTags) { return true }
        return this.getInline(tag, parent) != null
    }

    /**
     * Sanitize a tree of node, removing any attributes or classes that are not allowed.
     * Parameters are attributified according to the tag dictionary.
     * 
     * This method manipulates the original node tree.
     */
    sanitizeNode(node: MarkupNode | string): void {
        if (this.config.unsafelySkipSanitization) {
            // Well, they asked for it
            return
        }

        if (typeof node == "string") {
            return
        }

        // We assume node.tag to be already normalized (from parsing step)
        let trans = node.block ? this.getBlock(node.tag) : this.getInline(node.tag)
        if (!trans) {
            if (this.config.unsafelyAllowAnyTags) {
                // Process according to global rules
                this.sanitizeAttributes(node, [])
                this.sanitizeClasses(node, [])
                node.params = []
                return
            } else {
                // what??
                node.tag = this.regularizeTarget
                node.block = true

                trans = this.getBlock(node.tag)
                if (!trans) {
                    // why????
                    node.attributes = {}
                    node.params = []
                    node.children.forEach(c => this.sanitizeNode(c))
                    return
                }
            }
        }

        // Sanitize attributes & classes
        this.sanitizeAttributes(node, trans.allowedAttributes ?? [])
        this.sanitizeClasses(node, trans.allowedClasses ?? [], trans.allowAnyClasses)

        // Apply default attributes
        if (trans.defaultAttributes) {
            for (const [attr, val] of Object.entries(trans.defaultAttributes)) {
                if (!node.attributes[attr]) {
                    node.attributes[attr] = val
                }
            }
        }

        // Apply default classes
        if (trans.defaultClasses?.length) {
            const classArr = node.attributes.class?.split(" ") ?? []
            node.attributes.class = [
                ...new Set([...trans.defaultClasses, ...classArr])
            ].join(" ")
        }

        // Apply parameters to attributes
        // It bypasses the allowedAttributes check
        if (trans.paramsToAttribute) {
            node.params.forEach((value, idx) => {
                const attr = trans.paramsToAttribute![idx]
                if (attr) {
                    node.attributes[attr] = value
                }
            })
        }
        node.params = []

        // Enforce certain rules on children
        if (trans.noContent) {
            node.children = []
        }

        if (trans.plainText) {
            // Just in case if there's any non-string children...
            node.children = node.children.filter(c => typeof c == "string")
        }

        // Recursively sanitize children
        node.children.forEach(c => this.sanitizeNode(c))
    }

    getHtmlTag(nodeName: string, isBlock: boolean): string | null {
        const tag = isBlock ? this.getBlock(nodeName) : this.getInline(nodeName)
        if (!tag) {
            return this.config.unsafelyAllowAnyTags ? nodeName : null
        }

        return tag.elem
    }

    private sanitizeAttributes(node: MarkupNode, allowed: string[]) {
        const globalAllowed = this.config.globalAllowedAttributes ?? []
        const allowedSet = new Set([...allowed, ...globalAllowed, "class"])

        for (const key in node.attributes) {
            if (!allowedSet.has(key)) {
                delete node.attributes[key]
            }
        }
    }

    private sanitizeClasses(node: MarkupNode, allowed: string[], allowAny = false) {
        allowAny ||= this.config.globalAllowAnyClasses ?? false
        const globalAllowed = this.config.globalAllowedClasses ?? []
        const allowedSet = new Set([...allowed, ...globalAllowed])

        if (!node.attributes.class) {
            return
        }

        const classArr = node.attributes.class.split(" ")
        const filteredClasses = [...new Set(
            classArr.filter(c => allowAny || allowedSet.has(c))
        )].join(" ")

        if (filteredClasses) {
            node.attributes.class = filteredClasses
        } else {
            delete node.attributes.class
        }
    }

    private getBlock(name: string, parent?: string | null) {
        const normalizedName = this.getNormalizedBlockTagName(name, parent)
        if (!normalizedName) { return null }

        return this.tags.get(normalizedName)?.block ?? null
    }
    
    private getInline(name: string, parent?: string | null) {
        const normalizedName = this.getNormalizedInlineTagName(name, parent)
        if (!normalizedName) { return null }

        return this.tags.get(normalizedName)?.inline ?? null
    }
}

export type TagTranslation = {
    elem: string

    plainText?: boolean
    regularize?: boolean
    noContent?: boolean

    defaultAttributes?: Record<string, string>
    allowedAttributes?: string[]
    paramsToAttribute?: string[]

    defaultClasses?: string[]
    allowedClasses?: string[]
    allowAnyClasses?: boolean

    overrideRendering?: (node: MarkupNode) => string
}

type TagDefinition = {
    name: string
    block?: TagTranslation
    inline?: TagTranslation
}

type TagDictConfig = {
    globalAllowedAttributes?: string[]
    globalAllowedClasses?: string[]
    globalAllowAnyClasses?: boolean
    regularizeTarget?: string
    
    unsafelyAllowAnyTags?: boolean
    unsafelySkipSanitization?: boolean
}