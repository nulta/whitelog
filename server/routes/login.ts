import { Hono } from "hono"
import { RenderManager } from "server/managers/RenderManager.ts"

export const loginRoute = new Hono()

loginRoute.get("/login", async (c) => {
    const html = RenderManager.renderTemplate("login", {})
    return c.html(html)
})