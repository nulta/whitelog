import { TagDictionary } from './markup.ts'

export class MarkupRenderer {
    private readonly dict: TagDictionary

    constructor(dict: TagDictionary) {
        this.dict = dict
    }

    // TODO: 1. HTML rendering (with escaping!!!)
    // TODO: 2. DOM-like rendering? (for client-side)
    // TODO: 3. DOM-like rendering with efficient diffing?
}
