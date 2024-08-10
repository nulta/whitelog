import { DOMParser, HTMLDocument, Element, Node, NodeType } from "jsr:@b-fuze/deno-dom@0.1.47"


type DeepStringStack = Array<string | DeepStringStack>
type PrimitiveType = string | number | boolean | null | Array<PrimitiveType | TemplateData>
type TemplateData = {
    [key: string]: TemplateData | PrimitiveType
}
type ImportFunc = (importStr: string) => Promise<string | null>


export class BlackPrintTemplate<const T extends TemplateData> {
    private dom: HTMLDocument
    private importFunc: ImportFunc

    constructor(template: string, importFunc: ImportFunc = (async () => await null)) {
        this.dom = new DOMParser().parseFromString(template, "text/html")
        this.importFunc = importFunc
    }

    public async render(data: T): Promise<string> {
        // TODO: better algorithm?
        const dom = this.dom.cloneNode(true) as HTMLDocument
        await this.processNode(dom.getRootNode(), data)
        return "<!DOCTYPE html>\n" + dom.documentElement!.outerHTML
    }


    private async processNode(node: Node, data: T) {
        if (node.nodeType == NodeType.ELEMENT_NODE) {
            await this.processElement(node as Element, data)

        } else if (node.nodeType == NodeType.TEXT_NODE) {
            const text = node.nodeValue ?? ""
            const newText = this.interpolateText(text, data)
            if (text != newText) {
                node.nodeValue = newText
            }

        } else if (node.nodeType == NodeType.DOCUMENT_NODE) {
            for (const child of node.childNodes) {
                await this.processNode(child, data)
            }
        }
    }

    private async processElement(element: Element, data: T) {
        const tagName = element.tagName.toLowerCase()
        switch (tagName) {
            case "for!":
                this.processForTag(element, data)
                break

            case "if!":
                this.processIfTag(element, data)
                break
            
            case "ref!":
                await this.processRefTag(element, data)
                break

            default:
                this.interpolateAttributes(element, data)
                for (const child of element.childNodes) {
                    await this.processNode(child, data)
                }
                break
        }
    }


    private async processForTag(element: Element, data: T) {
        const variable = element.getAttribute("var")
        const iteratorExpr = element.getAttribute("of")
        const reversed = element.hasAttribute("reversed")
        const limitExpr = element.getAttribute("limit")

        if (variable == null || iteratorExpr == null) {
            throw new Error("<for!> tag must have var and of attributes")
        }

        let iterator = this.evaluateExpression(iteratorExpr, data)
        if (typeof iterator === "number") {
            iterator = Array.from({length: iterator}, (_, i) => i)
        }

        if (!(iterator instanceof Array)) {
            throw new Error(`<for! of="${iteratorExpr}"> returned a non-iterable value`)
        }

        if (reversed) {
            iterator = iterator.reverse()
        }

        let limit = Infinity
        if (limitExpr != null) {
            const limitEval = this.evaluateExpression(limitExpr, data)
            if (typeof limitEval !== "number") {
                throw new Error(`<for!> tag's limit attribute "${limitExpr}" must evaluate to a number`)
            }
            limit = limitEval
        }

        for (const item of iterator) {
            if (limit-- <= 0) {
                break
            }

            const newEnv = { ...data, [variable]: item }
            const clone = element.cloneNode(true) as Element

            for (const child of clone.childNodes) {
                await this.processNode(child, newEnv)
            }

            element.before(...clone.childNodes)
        }
        element.remove()
    }


    private async processIfTag(element: Element, data: T) {
        const invert = element.hasAttribute("not")
        const cond = element.getAttribute("cond")
        const checkEmpty = element.hasAttribute("is-empty")

        if (cond == null) {
            throw new Error("<if!> tag must have a cond attribute")
        }

        const value = this.evaluateExpression(cond, data)
        let isTruthy = value != null && value !== false

        if (checkEmpty) {
            // don't allow false, but allow null and undefined
            if (value != null && !Array.isArray(value)) {
                throw new Error("<if!> tag's is-empty attribute can only be used with arrays")
            }

            isTruthy = value == null || value.length == 0
        }

        if (invert) {
            isTruthy = !isTruthy
        }

        if (isTruthy) {
            for (const child of element.childNodes) {
                await this.processNode(child, data)
            }
            element.replaceWith(...element.childNodes)
        } else {
            element.remove()
        }
    }


    private async processRefTag(element: Element, data: T) {
        const varStr = element.getAttribute("var")
        const importStr = element.getAttribute("import")

        if ((varStr == null) == (importStr == null)) {
            throw new Error("<ref!> tag must have only one of either var or import attribute")
        }

        let newHtml: string
        if (varStr != null) {
            const value = this.evaluateExpression(varStr, data)
            if (typeof value != "string") {
                throw new Error(`<ref!> tag's var attribute "${varStr}" must evaluate to a string, but got ${typeof value}`)
            }
            newHtml = value
        } else {
            const value = await this.importFunc(importStr!)
            if (value == null) {
                throw new Error(`<ref!> failed to import template "${importStr}"`)
            }
            newHtml = value
        }

        element.innerHTML = newHtml
        for (const child of element.childNodes) {
            await this.processNode(child, data)
        }

        element.replaceWith(...element.childNodes)
    }


    private interpolateAttributes(elem: Element, data: T) {
        for (const attr of elem.attributes) {
            const before = attr.value
            const after = this.interpolateText(before, data)
            if (before != after) {
                if (after == "" || after == "false") {
                    elem.removeAttribute(attr.name)
                } else {
                    elem.setAttribute(attr.name, after)
                }
            }
        }

        for (const attr of elem.attributes) {
            const before = attr.name
            const after = this.interpolateText(before, data)
            if (before != after) {
                if (after != "" && after != "false") {
                    elem.setAttribute(after, elem.getAttribute(before))
                }
                elem.removeAttribute(before)
            }
        }
    }


    private interpolateText(text: string, data: T) {
        return text.replace(/\{\{(.+?)\}\}/g, (_, key) => {
            const value = this.evaluateExpression(key, data)

            if (value == null) {
                return ""
            }

            if (typeof value == "string" || typeof value == "number") {
                return String(value)
            }

            if (typeof value == "boolean") {
                return value ? "true" : "false"
            }

            throw new Error(`Expression ${key} must evaluate to a string, number, or boolean`)
        })
    }


    /** variable, for example, could be:
     * - `3.14`             -> literal number
     * - `foo`              -> variable foo
     * - `foo1.bar.baz`     -> nested object
     * - `foo[1]`           -> array element
     * - `foo.bar[bar.baz]` -> nested object with dynamic key
     * 
     * so, they can use 2 operators: dot and square brackets.
     */
    private evaluateExpression(expr: string, data: T): TemplateData | PrimitiveType {
        // tokenize the expression
        const tokens = expr.split(
            /([a-zA-Z_][a-zA-Z_0-9]*|[+-]?(?:[0-9]+)?[.]?(?:[0-9]+)?|\.|\[|\])/
        ).filter(x => x?.trim())

        // stack the [] operators
        const stackedTokens: DeepStringStack = []
        const workStack = [stackedTokens]
        for (const token of tokens) {
            const current = workStack[workStack.length - 1]

            if (token == "[") {
                const newStack: DeepStringStack = []
                current.push(newStack)
                workStack.push(newStack)
            } else if (token == "]") {
                workStack.pop()
            } else if (token == ".") {
                // skip this token
            } else {
                current.push(token)
            }
        }

        // evaluate the tokens
        try {
            return this.evaluateExpressionTokens(stackedTokens, data, data)
        } catch (_) {
            throw new Error(`Failed to parse expression: ${expr}`)
        }
    }

    // i hate this code
    // deno-lint-ignore no-explicit-any
    private evaluateExpressionTokens(tokens: DeepStringStack | string, env: any, data: T): any {
        // parse a single token
        if (typeof tokens === "string") {
            const token = tokens

            if (/^[+-]?([0-9]+|[0-9]*\.[0-9]*)$/.test(token)) {
                // number literal
                return Number(token)

            } else if (/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(token)) {
                // variable name
                return token

            } else {
                // invalid?
                throw new Error(`Invalid token: ${token}`)
            }
        }

        if (tokens.length == 0) {
            throw new Error("Invalid token: []")
        }

        // reduce the array
        env = data
        for (const token of tokens) {
            const ref = this.evaluateExpressionTokens(token, env, data)

            if (ref == null) {
                return null
            }

            if (!["object", "string"].includes(typeof env)) {
                throw new Error(`Cannot access property ${token} of non-object`)
            }

            if (typeof ref == "number" && env === data) {
                env = ref
            } else {
                if (Object.hasOwn(env, ref)) {
                    env = env[ref] ?? null
                } else {
                    env = null
                }
            }

            if (env == null) {
                return null
            }
        }

        return env
    }
}

// test
// const template = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Document</title>
// </head>
// <body>
//     <for! var="x" of="10">
//         <div>
//             <h1>
//                 This is iteration no. {{x}}. hello.
//             </h1>
//         </div>
//     </for!>

//     <if! not cond="asdf">
//         <div>hello</div>
//     </if!>

//     <for! var="comment" of="comments">
//         <article is-owner={{comment.isOwner}}>
//             <h1>
//                 {{comment.author}} said:
//             </h1>
//             <p>
//                 {{comment.text}}
//             </p>
//         </article>
//     </for!>
//     <if! cond="comments" is-empty>
//         <p>No comments yet.</p>
//     </if!>

//     <div class="container {{hello}}">
//         <h1>
//             Hello, {{name}}!
//         </h1>
//         <p>
//             Your age is {{age}}.
//         </p>
//         <span {{prop}}={{age}}></span>
//     </div>

//     <ref! data="content">
//     </ref!>

// </body>
// </html>
// `

// const bp = new BlackPrintTemplate(template)
// bp.render({comments: []})
// bp.render({comments: []})
// bp.render({comments: []})

// console.time("render")
// console.log(bp.render({
//     name: "Alice",
//     age: 17,
//     prop: null,
//     comments: [{
//         isOwner: true,
//         author: "Alice",
//         text: "Hello world",
//     }, {
//         isOwner: false,
//         author: "John Doe",
//         text: "Hello world 2",
//     }],
//     content: "<p>hello, world</p>",
// }))
// console.timeEnd("render")
