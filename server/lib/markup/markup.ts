export type MarkupNode = {
    tag: string,
    attributes: Record<string, string>,
    params: string[],
    children: MarkupSubTree,
    block: boolean,
}

export type MarkupTree = MarkupNode[]
export type MarkupSubTree = (MarkupNode|string)[]

export { TagDictionary } from "./TagDictionary.ts"
export { MarkupInlineParser } from "./MarkupInlineParser.ts"
export { MarkupParser } from "./MarkupParser.ts"
export { defaultTagDictionary } from "./defaultTagDictionary.ts"
