import { assertEquals } from "assert"
import {
    MarkupParser, MarkupInlineParser, TagDictionary, defaultTagDictionary, MarkupRenderer
} from "./markup.ts"

type MarkupTree = ReturnType<typeof MarkupParser.prototype.parse>
type MarkupSubTree = (MarkupTree[number]|string)[]

const blk = (tag: string, children: MarkupSubTree, params: string[] = [], attributes: Record<string,string> = {}) =>
    ({ tag, children, block: true, params, attributes })

const inline = (tag: string, children: MarkupSubTree, params: string[] = [], attributes: Record<string,string> = {}) =>
    ({ tag, children, block: false, params, attributes })


const wildcardDict = new TagDictionary([], {
    unsafelyAllowAnyTags: true,
    unsafelySkipSanitization: true,
    regularizeTarget: "p",
})

const dict = defaultTagDictionary.extend([], {
    globalAllowedClasses: ["class1", "class2", "class3"],
    globalAllowedAttributes: ["w", "h", "focus"],
})


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

        assertEquals(new MarkupParser(wildcardDict).parse(text), [
            blk("a", ["aaaa\n", "aaaa\n", blk("b", ["bbbb\n", "bbbb"])]),
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

        assertEquals(new MarkupParser(wildcardDict).parse(text), [
            blk("a", [
                blk("b", ["bb\n", blk("c", ["cc"]), blk("d", ["dd"]), "bb"]),
                blk("e", ["ee\n", "\n", "ee\n", "\n", blk("f", ["\n", "ff"])]),
                "aaaa\n",
                "    aaaa\n",
                "    aaaa\n",
                "aaaa",
            ]),
            blk("p", ["p1\n", "p2\n", "p3"]),
            blk("p", ["pp1 asdf\n", "pp2"]),
            blk("g", ["text"]),
            blk("p", ["ppp1"]),
        ])
    }
})

Deno.test({
    name: "MarkupParser: params and attributes 1",
    fn: () => {
        const text = `
[a "/link.html" .class1 .class2: hyperlink]
[h1] Title
[img "/image.jpg" w=100 h="200px" alt="image" .x focus]
[p aa x=1 bb x=2] hi
`

        assertEquals(new MarkupParser(wildcardDict).parse(text), [
            blk("p", [
                inline("a", ["hyperlink"], ["/link.html"], { class: "class1 class2" }),
            ]),
            blk("h1", ["Title"], [], {}),
            blk("img", [], ["/image.jpg", "focus"], { w: "100", h: "200px", alt: "image", class: "x" }),
            blk("p", ["hi"], ["aa", "bb"], { x: "2" }),
        ])
    }
})

Deno.test({
    name: "MarkupParser: params and attributes 2",
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

        assertEquals(new MarkupParser(wildcardDict).parse(text), [
            blk("a", ["hyperlink"], ["/link.html"], { class: "class1 class2" }),
            blk("h1", ["Title"], [], {}),
            blk("img", [], ["/image.jpg", "focus"], { w: "100", h: "200px", alt: "image", class: "x" }),
            blk("a", [
                "hi\n",
                blk("b", ["bbb"], ["bb"]),
                inline("c", ["cc"]),
                inline("d", ["dd"]),
                inline("e", [inline("f", ["ff"])]),
                "\n",
                inline("g", ["gg"]),
            ], ["aa", "bb"], { x: "2" }),
        ])
    }
})

Deno.test({
    name: "MarkupParser: inline tags",
    fn: () => {
        const text = `hello [code:world]! [a "link.html": click [code:here]]`
        
        assertEquals(new MarkupInlineParser(dict).parse(text, null), [
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
        
        assertEquals(new MarkupInlineParser(dict).parse(text, null), [
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

Deno.test({
    name: "MarkupParser: should ignore unknown tags",
    fn: () => {
        const text = `
[unknown] text
[h1] [unknown: foo] bar
[blockquote]
    [unknown2] foo
        [unknown3] bar
        [h2] ignore me for wrong indentation
    [h2] parse me
`
        assertEquals(new MarkupParser(dict).parse(text), [
            blk("p", ["[unknown] text"]),
            blk("h1", ["[unknown: foo] bar"]),
            blk("blockquote", [
                "[unknown2] foo\n",
                "    [unknown3] bar\n",
                "    [h2] ignore me for wrong indentation\n",
                blk("h2", ["parse me"]),
            ]),
        ])
    }
})

Deno.test({
    name: "MarkupParser: should sanitize nodes",
    fn: () => {
        const text = `
[p .class1 .unknownclass] text
[p onload="ignore me"]
    [a "link.html" invalid params title="hello" foobar: link]
    [img "/img.jpg" "ignore me" .ignoreme ignore=me alt="image"]
    [script] doEvil()
    [iframe] evil.tld
`

        assertEquals(new MarkupParser(dict).parse(text), [
            blk("p", ["text"], [], { class: "class1" }),
            blk("p", [
                inline("a", ["link"], [], { href: "link.html", title: "hello" }),
                "\n",
                blk("img", [], [], { src: "/img.jpg", alt: "image" }),
                "[script] doEvil()\n",
                "[iframe] evil.tld",
            ]),
        ])
    }
})

Deno.test({
    name: "MarkupParser: should correctly parse plaintext nodes",
    fn: () => {
        const text = `
[h1] ~~asdf~~ \`code\` \`[b:hello]\`

[code lua]
    for k, v in pairs(t) do
        tbl[k][v] = true
    end
    
    --[[
    [h1] title
    ]]
    
    return tbl

[h1] ~~asdf~~ \`code\` \`[b:hello]\`
`

        assertEquals(new MarkupParser(dict).parse(text), [
            blk("h1", [
                inline("del", ["asdf"]),
                " ",
                inline("code", ["code"]),
                " ",
                inline("code", ["[b:hello]"]),
            ]),
            blk("code", [
                "for k, v in pairs(t) do\n",
                "    tbl[k][v] = true\n",
                "end\n",
                "\n",
                "--[[\n",
                "[h1] title\n",
                "]]\n",
                "\n",
                "return tbl",
            ], [], { lang: "lua" }),
            blk("h1", [
                inline("del", ["asdf"]),
                " ",
                inline("code", ["code"]),
                " ",
                inline("code", ["[b:hello]"]),
            ]),
        ])
    }
})

Deno.test({
    name: "MarkupRenderer: should render simple tree",
    fn: () => {
        const tree: MarkupTree = [
            blk("p", ["hello"]),
            blk("h1", ["world"]),
            blk("p", ["foo"]),
        ]

        assertEquals(
            new MarkupRenderer(dict).renderTree(tree).replaceAll("\n", ""),
            `<p>hello</p><h1>world</h1><p>foo</p>`
        )
    }
})


Deno.test({
    name: "MarkupRenderer: should render tree with proper newlines",
    fn: () => {
        const tree: MarkupTree = [
            blk("p", [
                "hello\n",
                inline("strong", ["hello"]),
                "world\n",
                "\n",
                "foo",
            ]),
        ]

        assertEquals(
            new MarkupRenderer(dict).renderTree(tree).replaceAll(" ", ""),
            `<p>hello\n<strong>hello</strong>world\n\nfoo</p>`
        )
    }
})


Deno.test({
    name: "MarkupRenderer: should render nested tree",
    fn: () => {
        const tree: MarkupTree = [
            blk("blockquote", [
                blk("blockquote", [
                    blk("p", ["nest1"]),
                    "nest2",
                ]),
                "nest3"
            ])
        ]

        assertEquals(
            new MarkupRenderer(dict).renderTree(tree).replaceAll("\n", ""),
            `<blockquote><blockquote><p>nest1</p>nest2</blockquote>nest3</blockquote>`
        )
    }
})