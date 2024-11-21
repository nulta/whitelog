import { TagTranslation, TagDictionary } from "./TagDictionary.ts"

const inlineTag = (name: string, elem = name, options: Partial<TagTranslation> = {}) => ({
    name: name.replaceAll(" ", ""),
    inline: { elem, ...options },
})
const blockTag = (name: string, elem = name, options: Partial<TagTranslation> = {}) => ({
    name: name.replaceAll(" ", ""),
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

    inlineTag("strong"),
    inlineTag("b", "strong"),
    inlineTag("em"),
    inlineTag("i", "em"),
    inlineTag("del"),
    inlineTag("small"),

    inlineTag("img", undefined, {
        allowedAttributes: ["alt", "width", "height"],
        paramsToAttribute: ["src"],
        noContent: true,
        defaultClasses: ["img-inline"],
    }),
    blockTag("img", undefined, {
        allowedAttributes: ["alt", "width", "height"],
        paramsToAttribute: ["src"],
        noContent: true,
    }),

    inlineTag("br", undefined, { noContent: true }),

    blockTag("section", undefined, { regularize: true }),
    blockTag("aside", undefined, { regularize: true }),
    blockTag("figure", undefined),
    blockTag("figure > caption", "figcaption"),
    blockTag("figcaption", "figcaption"),
    blockTag("blockquote"),

    blockTag("code", "pre", { plainText: true, paramsToAttribute: ["lang"] }),
    inlineTag("code", "code", { plainText: true, paramsToAttribute: ["lang"] }),
    blockTag("math", undefined, { plainText: true }),
    inlineTag("math", undefined, { plainText: true }),

    inlineTag("cite"),
], {
    globalAllowedAttributes: [],
    globalAllowedClasses: [],
    regularizeTarget: "p",
})
