import { assertEquals } from "assert"
import { MarkupInlineParser, MarkupParser } from "./markup.ts"

type MarkupTree = ReturnType<typeof MarkupParser.parse>
type MarkupSubTree = (MarkupTree[number]|string)[]

const blk = (tag: string, children: MarkupSubTree, params: string[] = [], attributes: Record<string,string> = {}) =>
    ({ tag, children, block: true, params, attributes })

const inline = (tag: string, children: MarkupSubTree, params: string[] = [], attributes: Record<string,string> = {}) =>
    ({ tag, children, block: false, params, attributes })


Deno.test({
    name: "MarkupParser: block split 1",
    fn: () => {
        const text = `
[a] aaaa
    aaaa
    [b] bbbb
        bbbb
[c]
    cccc
pppp
[d]
pppp
        `

        assertEquals(MarkupParser.parse(text), [
            blk("a", ["aaaa", "aaaa", blk("b", ["bbbb", "bbbb"])]),
            blk("c", ["cccc"]),
            blk("p", ["pppp"]),
            blk("d", []),
            blk("p", ["pppp"]),
        ])
    }
})


Deno.test({
    name: "MarkupParser: block split 2",
    fn: () => {
        const text = `
[a]
    [b]
        bb
        [c] cc
        [d] dd
        bb
    [e]
        ee

        ee

        [f]

            ff

    aaaa
        aaaa
        aaaa
    aaaa
p1
p2
p3

pp1 asdf
pp2
[g] text
ppp1
        `

        assertEquals(MarkupParser.parse(text), [
            blk("a", [
                blk("b", ["bb", blk("c", ["cc"]), blk("d", ["dd"]), "bb"]),
                blk("e", ["ee", "", "ee", "", blk("f", ["", "ff"])]),
                "aaaa",
                "    aaaa",
                "    aaaa",
                "aaaa",
            ]),
            blk("p", ["p1", "p2", "p3"]),
            blk("p", ["pp1 asdf", "pp2"]),
            blk("g", ["text"]),
            blk("p", ["ppp1"]),
        ])
    }
})

Deno.test({
    name: "MarkupParser: params and attributes",
    fn: () => {
        const text = `
[a "/link.html" .class1 .class2] hyperlink
[h1] Title
[img "/image.jpg" w=100 h="200px" alt="image" .x focus]
[a aa x=1 bb x=2] hi
`

        assertEquals(MarkupParser.parse(text), [
            blk("a", ["hyperlink"], ["/link.html"], { class: "class1 class2" }),
            blk("h1", ["Title"], [], {}),
            blk("img", [], ["/image.jpg", "focus"], { w: "100", h: "200px", alt: "image", class: "x" }),
            blk("a", ["hi"], ["aa", "bb"], { x: "2" }),
        ])
    }
})

Deno.test({
    name: "MarkupParser: params and attributes",
    fn: () => {
        const text = `
[a "/link.html" .class1 .class2] hyperlink
[h1] Title
[img "/image.jpg" w=100 h="200px" alt="image" .x focus]
[a aa x=1 bb x=2] hi
    [b bb] bbb
    [c:cc][d:dd][e:[f:ff]]
    [g:gg]
`

        assertEquals(MarkupParser.parse(text), [
            blk("a", ["hyperlink"], ["/link.html"], { class: "class1 class2" }),
            blk("h1", ["Title"], [], {}),
            blk("img", [], ["/image.jpg", "focus"], { w: "100", h: "200px", alt: "image", class: "x" }),
            blk("a", [
                "hi",
                blk("b", ["bbb"], ["bb"]),
                inline("c", ["cc"]),
                inline("d", ["dd"]),
                inline("e", [inline("f", ["ff"])]),
                inline("g", ["gg"]),
            ], ["aa", "bb"], { x: "2" }),
        ])
    }
})

Deno.test({
    name: "MarkupParser: inline tags",
    fn: () => {
        const text = `hello [code:world]! [a "link.html": click [code:here]]`
        
        assertEquals(MarkupInlineParser.parse(text), [
            "hello ",
            inline("code", ["world"]),
            "! ",
            inline("a", [
                "click ", inline("code", ["here"])
            ], ["link.html"]),
        ])
    }
})

Deno.test({
    name: "MarkupParser: special inline tags",
    fn: () => {
        const text = `**bold** text, *em* text, ***bold and em*** text, \`code\`, ~~del **bold**~~`
        
        assertEquals(MarkupInlineParser.parse(text), [
            inline("strong", ["bold"]),
            " text, ",
            inline("em", ["em"]),
            " text, ",
            inline("strong", [inline("em", ["bold and em"])]),
            " text, ",
            inline("code", ["code"]),
            ", ",
            inline("del", ["del ", inline("strong", ["bold"])]),
        ])
    }
})
