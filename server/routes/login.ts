import { Hono } from "hono"
import { RenderManager } from "server/managers/RenderManager.ts"

export const route = new Hono()

route.get("/", (c) => {
    const html = RenderManager.renderTemplate("login", {})
    return c.html(html)
})