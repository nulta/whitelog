import { assertEquals } from "assert"
import { BlackPrintExpressionParser, BlackPrintTemplate, TemplateData } from "server/lib/blackprint/blackprint.ts"

// expression test
Deno.test({
    name: "BlackPrint: expression parser",
    fn: () => {
        const data = {
            a: {b: 3},
            c: 5,
            d: "hello",
            e: [1, 2, 3, 0],
            tr: true,
            fa: false,
            x: {y: {z: {a: {b: 10}}}}
        }

        function expr(exp: string) {
            return BlackPrintExpressionParser.parse(exp, data)
        }

        // deno-lint-ignore no-explicit-any
        function assertExpr(value: string, expected: any) {
            let exp
            try {
                exp = expr(value)
            } catch (e) {
                console.error(e)
                throw new Error(`Failed to parse expression: ${value}`)
            }

            assertEquals(exp, expected)
        }

        assertExpr(`3`, 3)
        assertExpr(`1+1`, 2)
        assertExpr(`1-1`, 0)
        assertExpr(`a.b`, 3)
        assertExpr(`c`, 5)
        assertExpr(`c + c`, 10)
        assertExpr(`c + c + c`, 15)
        assertExpr(`a.b * c`, 15)
        assertExpr(`c + a.b * c + c`, 25)
        assertExpr(`d == "hello"`, true)
        assertExpr(`d != "hello"`, false)
        assertExpr(`tr || fa`, true)
        assertExpr(`tr && fa`, false)

        assertExpr(`d == "hi" || d == "hello"`, true)
        assertExpr(`d == "hi" && d == "hello"`, false)
        assertExpr(`true == (tr && fa) == true`, false)
        assertExpr(`true == (tr || fa) == true`, true)
        assertExpr(`true == (fa || fa || fa) == true`, false)
        assertExpr(`false || false && false || true`, true)
        assertExpr(`true == (fa || fa && fa || tr) == true`, true)

        assertExpr(`e[1]`, 2)
        assertExpr(`e.length`, 4)
        assertExpr(`"helloworld".length`, 10)
        assertExpr(`"helloworld"[0]`, "h")
        assertExpr(`"helloworld"[-1]`, "d")
        assertExpr(`x["y"]["z"]["a"]["b"]`, 10)
        assertExpr(`x.y.z.a.b+10`, 20)

        assertExpr(`e[e[0]]`, 2)
        assertExpr(`e[e[e[0]]]`, 3)
        assertExpr(`e[e[e[e[0]]]]`, 0)
        assertExpr(`e[e[e[e[e[0]]]]+1]+1`, 3)
        assertExpr(`e[e[0]+e[0]]`, 3)
    }
})

Deno.test({
    name: "BlackPrint: template rendering",
    fn: async () => {
        // TODO
        const render = async (str: string, data: TemplateData) => {
            return (await new BlackPrintTemplate(str).render(data)).replaceAll("\n", "")
        }
        
        const bodyOf = async (str: string, data: TemplateData) => {
            return (await render(str, data))
                .replace(/^<!DOCTYPE html><html>[ \n]*<head><\/head>[ \n]*/, "")
                .replace(/<\/html>[ \n]*$/, "")
                .replace(/^<body>[ \n]*/, "")
                .replace(/<\/body>$/, "")
                .trim()
        }

        assertEquals(await bodyOf(``, {}), "")
        assertEquals(await bodyOf(`Hello, {{world}}!`, {world: 1}), "Hello, 1!")
        assertEquals(
            await bodyOf(
                `<h1>{{hello + name}}!</h1>`,
                {hello: "Hello, ", name: "world"}
            ),
            "<h1>Hello, world!</h1>"
        )

        assertEquals(await bodyOf(`<if! cond=cc>Hello!</if!>`, {cc: true}), "Hello!")
        assertEquals(await bodyOf(`<if! cond=cc>Hello!</if!>`, {cc: false}), "")
        assertEquals(await bodyOf(`<if! cond=cc>Hello!</if!>`, {cc: null}), "")
        assertEquals(await bodyOf(`<if! cond=cc is-empty>Hello!</if!>`, {cc: [1]}), "")
        assertEquals(await bodyOf(`<if! cond=cc is-empty>Hello!</if!>`, {cc: null}), "Hello!")
        assertEquals(await bodyOf(`<if! cond=cc is-empty>Hello!</if!>`, {cc: []}), "Hello!")
        assertEquals(await bodyOf(`<if! cond="1 + 1 == 2">Hello!</if!>`, {}), "Hello!")
        assertEquals(await bodyOf(`<if! cond="1 + 1 == 3">Hello!</if!>`, {}), "")
    }
})
