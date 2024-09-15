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
                await this.processForTag(element, data)
                break

            case "if!":
                await this.processIfTag(element, data)
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



    private evaluateExpression(expr: string, data: T): TemplateData | PrimitiveType {
        const val = BlackPrintExpressionParser.parse(expr, data)
        return val
    }
}


type ExprToken =
    | { t: "number", v: number }
    | { t: "string", v: string }
    | { t: "name", v: string }
    | { t: "op", v: string }
    | { t: "paren", v: string }
    | { t: "elemParen", v: string }

type _ExprTokenExpectation<T extends ExprToken> = T | { t: T["t"] }
type ExprTokenExpectation = _ExprTokenExpectation<ExprToken>

type AstNode =
    | {t: "number", v: number}
    | {t: "string", v: string}
    | {t: "name", v: string}
    | {t: "element", o: AstNode, p: AstNode}
    | {t: "op.div", l: AstNode, r: AstNode}
    | {t: "op.divfloor", l: AstNode, r: AstNode}
    | {t: "op.mul", l: AstNode, r: AstNode}
    | {t: "op.mod", l: AstNode, r: AstNode}
    | {t: "op.add", l: AstNode, r: AstNode}
    | {t: "op.sub", l: AstNode, r: AstNode}
    | {t: "op.lt", l: AstNode, r: AstNode}
    | {t: "op.gt", l: AstNode, r: AstNode}
    | {t: "op.leq", l: AstNode, r: AstNode}
    | {t: "op.geq", l: AstNode, r: AstNode}
    | {t: "op.eq", l: AstNode, r: AstNode}
    | {t: "op.neq", l: AstNode, r: AstNode}
    | {t: "op.ternary", a: AstNode, b: AstNode, c: AstNode}

type ExprReturns = TemplateData | PrimitiveType

/** variable, for example, could be:
 * - `3.14`             -> literal number
 * - `foo`              -> variable foo
 * - `foo1.bar.baz`     -> nested object
 * - `foo[1]`           -> array element
 * - `foo.bar[bar.baz]` -> nested object with dynamic key
 * 
 * they have those operators and things:
 * - **precedence 0**
 * - `(a)`              -> parentheses
 * - `a.b`              -> access object property (b is literal)
 * - `a[b]`             -> access array element
 * - `!a`               -> not
 * - **precedence 1**
 * - `a * b`            -> multiplication (also works with strings)
 * - `a % b`            -> modulo
 * - `a / b`            -> division
 * - `a // b`           -> division (floor)
 * - **precedence 2**
 * - `a + b`            -> addition (also works with strings)
 * - `a - b`            -> subtraction
 * - **precedence 3**
 * - `||` `&&`          -> logical or, logical and
 * - **precedence 4**
 * - `a < b`  `a > b`   -> less than, greater than
 * - `a <= b` `a >= b`  -> less than or equal, greater than or equal
 * - `a == b` `a != b`  -> equal, not equal
 * - **precedence 5**
 * - `a ? b : c`        -> ternary operator
 * 
 * literals:
 * - `3.14`             -> number
 * - `"foo"`            -> string
*/
class BlackPrintExpressionParser {
    private tokens: ExprToken[]
    private data: TemplateData

    private constructor(tokens: ExprToken[], data: TemplateData) {
        this.tokens = tokens
        this.data = data
    }

    public static parse(expr: string, data: TemplateData) {
        const parser = new BlackPrintExpressionParser(this.tokenize(expr), data)
        return parser.evalTokens()
    }

    private static tokenize(expr: string): ExprToken[] {
        // i hate this regex
        return expr.match(
            /(\".*?\"|\'.*?\'|[a-zA-Z_][a-zA-Z_0-9]*|[+-]?(?:\d+\.?\d*|\.\d+)|(?:[<>!=]=|&&|\|\|)|[\!<>\[\]\(\)\-.+/*%?:]|[^\s])/g
        )!.map(token => {
            if (token.match(/^[+-]?(?:\d+\.?\d*|\.\d+)$/)) {
                return { t: "number", v: parseFloat(token) }
            }
            if (token.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/)) {
                return { t: "name", v: token }
            }
            if (token.match(/^((?:[<>!=]=|&&|\|\|)|[\!<>\-.+/*%?:])$/)) {
                return { t: "op", v: token }
            }
            if (token.match(/^[\(\)]$/)) {
                return { t: "paren", v: token }
            }
            if (token.match(/^[\[\]]$/)) {
                return { t: "elemParen", v: token }
            }
            if (token.match(/^(\".*\"|\'.*\')$/)) {
                return { t: "string", v: token.slice(1, -1) }
            }
            throw new Error(`Invalid token: ${token}`)
        })
    }


    private evalTokens(): ExprReturns {
        const val = this.evalOp5()
        return val
    }


    private peek(index = 0) {
        return this.tokens[index]
    }

    private pop() {
        return this.tokens.shift()
    }

    private isEmpty() {
        return this.tokens.length == 0
    }


    private checkToken(expected: ExprTokenExpectation, index = 0) {
        const token = this.peek(index)
        if (token != undefined && token.t == expected.t) {
            if (!("v" in expected) || token.v == expected.v) {
                return true
            }
        }
        return false
    }

    private expectToken<T extends ExprTokenExpectation>(expected: T) {
        if (!this.checkToken(expected)) {
            const token = this.peek()
            throw new Error(
                `Expected ${expected.t} (${"v" in expected ? expected.v : "?"}) but got ${token?.t}(${token?.v})`
            )
        }
        return this.pop()! as { t: T["t"], v: T["t"] extends "number" ? number : string }
    }

    private assertNumber(value: ExprReturns): asserts value is number {
        if (typeof value != "number") {
            throw new Error(`Expected number but got ${value}`)
        }
    }

    private assertNumberOrString(value: ExprReturns): asserts value is number | string {
        if (typeof value != "number" && typeof value != "string") {
            throw new Error(`Expected number or string but got ${value}`)
        }
    }


    private resolveName(name: string): PrimitiveType | TemplateData {
        switch (name) {
            case "true":
                return true
            case "false":
                return false
            case "null":
                return null
        }

        return this.resolveElement(this.data, name)
    }

    private resolveElement(obj: PrimitiveType | TemplateData, key: string | number): PrimitiveType | TemplateData {
        if (typeof obj == "string" || obj instanceof Array) {
            if (typeof key == "number") {
                return obj.at(key) ?? ""
            } else if (key == "length") {
                return obj.length
            } else {
                throw new Error(`String and Array object only has a length property and array-like access, not ${key}`)
            }
        }

        if (obj instanceof Object) {
            if (Object.hasOwn(obj, key)) {
                return obj[key]
            } else {
                throw new Error(`The object does not have key ${key}`)
            }
        }

        throw new Error(`Cannot access property ${key} of a non-object`)
    }


    /**
     * **precedence 0 (latest)**
     * - `(expr)`
     * - `name`
     * - `expr.name`
     * - `expr[expr]`
     * - `number` or `string`
    */
    private evalOp0(): ExprReturns {
        if (this.isEmpty()) {
            return null
        }


        let value: ExprReturns
        if (this.checkToken({ t: "paren", v: "(" })) {
            // `(expr)`
            this.pop()
            value = this.evalTokens()
            this.expectToken({ t: "paren", v: ")" })
        } else if (this.checkToken({ t: "name" })) {
            // `name.name2` | `name[expr]`
            const varName = this.pop()!.v as string
            const varValue = this.resolveName(varName)

            // `name`
            // return varValue
            value = varValue
        } else if (this.checkToken({ t: "number" }) || this.checkToken({ t: "string" })) {
            // literals
            value = this.pop()!.v
        } else {
            console.warn("unexcepted token", this.peek())
            return null
        }

        // `expr.name` or `expr[expr]`
        let isChanged = true
        while (isChanged) {
            isChanged = false

            // `expr.name`
            if (this.checkToken({ t: "op", v: "." })) {
                this.pop()
                const key = this.expectToken({ t: "name" })
                isChanged = true
                value = this.resolveElement(value, key.v)
            }
    
            // `expr[expr]`
            if (this.checkToken({ t: "elemParen", v: "[" })) {
                this.pop()
                const right = this.evalTokens()
                this.expectToken({ t: "elemParen", v: "]" })
    
                // `name[expr]` is null-forgiving
                if (right == null) {
                    // TODO: should we??
                    isChanged = true
                    value = null
                } else {
                    this.assertNumberOrString(right)
                    isChanged = true
                    value = this.resolveElement(value, right)
                }
            }
        }

        return value
    }

    /**
     * **precedence 1**
     * - `!expr`
     * - `a * b`
     * - `a / b`
     * - `a // b`
     * - `a % b`
     */
    private evalOp1(): ExprReturns {
        // `!expr`
        if (this.checkToken({ t: "op", v: "!" })) {
            this.pop()
            return !this.evalOp1()
        }

        // `* / // %`
        const left = this.evalOp0()
        if (this.checkToken({ t: "op", v: "*" })) {
            this.assertNumberOrString(left)
            this.pop()
            const right = this.evalOp1()
            this.assertNumber(right)

            if (typeof left == "string") {
                return left.repeat(right)
            } else {
                return left * right
            }
        }

        if (this.checkToken({ t: "op", v: "/" })) {
            this.assertNumber(left)
            this.pop()
            const right = this.evalOp1()
            this.assertNumber(right)
            return left / right
        }

        if (this.checkToken({ t: "op", v: "//" })) {
            this.assertNumber(left)
            this.pop()
            const right = this.evalOp1()
            this.assertNumber(right)
            return Math.floor(left / right)
        }

        if (this.checkToken({ t: "op", v: "%" })) {
            this.assertNumber(left)
            this.pop()
            const right = this.evalOp1()
            this.assertNumber(right)
            return left % right
        }

        return left
    }

    /**
     * - **precedence 2**
     * - `a + b`            -> addition (also works with strings)
     * - `a - b`            -> subtraction
     */
    private evalOp2(): ExprReturns {
        const left = this.evalOp1()
        // `+ -`
        if (this.checkToken({ t: "op", v: "+" })) {
            this.assertNumberOrString(left)
            this.pop()
            const right = this.evalOp2()
            this.assertNumberOrString(right)

            if (typeof left == "string" || typeof right == "string") {
                return "" + left + right
            } else {
                return left + right
            }
        }

        if (this.checkToken({ t: "op", v: "-" })) {
            this.assertNumber(left)
            this.pop()
            const right = this.evalOp2()
            this.assertNumber(right)
            return left - right
        }

        return left
    }

    /**
     * **precedence 3**
     * - `a < b`  `a > b`   -> less than, greater than
     * - `a <= b` `a >= b`  -> less than or equal, greater than or equal
     * - `a == b` `a != b`  -> equal, not equal
     */
    private evalOp3(): ExprReturns {
        const left = this.evalOp2()

        // `== !=`
        if (this.checkToken({ t: "op", v: "==" })) {
            this.pop()
            const right = this.evalOp3()
            return left == right
        }

        if (this.checkToken({ t: "op", v: "!=" })) {
            this.pop()
            const right = this.evalOp3()
            return left != right
        }

        // `< > <= >=`
        if (this.checkToken({ t: "op", v: "<" })) {
            this.assertNumber(left)
            this.pop()
            const right = this.evalOp3()
            this.assertNumber(right)
            return left < right
        }

        if (this.checkToken({ t: "op", v: ">" })) {
            this.assertNumber(left)
            this.pop()
            const right = this.evalOp3()
            this.assertNumber(right)
            return left > right
        }

        if (this.checkToken({ t: "op", v: "<=" })) {
            this.assertNumber(left)
            this.pop()
            const right = this.evalOp3()
            this.assertNumber(right)
            return left <= right
        }

        if (this.checkToken({ t: "op", v: ">=" })) {
            this.assertNumber(left)
            this.pop()
            const right = this.evalOp3()
            this.assertNumber(right)
            return left >= right
        }

        return left
    }

    /**
     * **precedence 4-1**
     * - `&&`          -> logical and
     */
    private evalOp4_1(): ExprReturns {
        const left = this.evalOp3()
        // `&&`
        if (this.checkToken({ t: "op", v: "&&" })) {
            this.pop()
            const right = this.evalOp4_1()
            return left && right
        }

        return left
    }

    /**
     * **precedence 4**
     * - `||`          -> logical or
     */
    private evalOp4(): ExprReturns {
        const left = this.evalOp4_1()
        // `||`
        if (this.checkToken({ t: "op", v: "||" })) {
            this.pop()
            const right = this.evalOp4()
            return left || right
        }

        return left
    }


    /**
     * **precedence 5**
     * - `a ? b : c`        -> ternary operator
     */
    private evalOp5(): ExprReturns {
        // `? :`
        const cond = this.evalOp4()
        if (this.checkToken({ t: "op", v: "?" })) {
            this.pop()
            const a = this.evalOp4()
            this.expectToken({ t: "op", v: ":" })
            const b = this.evalOp4()
            return cond ? a : b
        }

        return cond
    }
}

// expression test
;(() => {
    const data = {
        a: {b: 3},
        c: 5,
        d: "hello",
        e: [1, 2, 3],
        tr: true,
        fa: false,
        x: {y: {z: {a: {b: 10}}}}
    }

    function expr(exp: string) {
        return BlackPrintExpressionParser.parse(exp, data)
    }

    // deno-lint-ignore no-explicit-any
    function assertEq(value: string, expected: any) {
        if (expr(value) !== expected) {
            console.log("")
            console.error("Assertion failed from:", value)
            console.error("Evaluated to:", expr(value))
            console.error("Expected:", expected)
            console.trace()
            console.log("")
        }
    }

    assertEq(`3`, 3)
    assertEq(`a.b`, 3)
    assertEq(`c`, 5)
    assertEq(`c + c`, 10)
    assertEq(`c + c + c`, 15)
    assertEq(`a.b * c`, 15)
    assertEq(`c + a.b * c + c`, 25)
    assertEq(`d == "hello"`, true)
    assertEq(`d != "hello"`, false)
    assertEq(`tr || fa`, true)
    assertEq(`tr && fa`, false)

    assertEq(`d == "hi" || d == "hello"`, true)
    assertEq(`d == "hi" && d == "hello"`, false)
    assertEq(`true == (tr && fa) == true`, false)
    assertEq(`true == (tr || fa) == true`, true)
    assertEq(`true == (fa || fa || fa) == true`, false)
    assertEq(`false || false && false || true`, true)
    assertEq(`true == (fa || fa && fa || tr) == true`, true)

    assertEq(`e[1]`, 2)
    assertEq(`e.length`, 3)
    assertEq(`"helloworld".length`, 10)
    assertEq(`"helloworld"[0]`, "h")
    assertEq(`"helloworld"[-1]`, "d")
    assertEq(`x["y"]["z"]["a"]["b"]`, 10)
    assertEq(`x.y.z.a.b + 10`, 20)
})()