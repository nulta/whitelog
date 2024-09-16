import { Hono } from "hono"
import { RenderManager } from "server/managers/RenderManager.ts"

export const route = new Hono()

route.get("/", async (c) => {
    const html = RenderManager.renderTemplate("login", {})
    return c.html(html)
})