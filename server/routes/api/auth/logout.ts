import { Hono } from "hono"
import { apiRequiresAuth } from "server/lib/reqauthorizer.ts"
import { AuthManager } from "server/managers/AuthManager.ts"

export const route = new Hono()

route.get("/", apiRequiresAuth(), (c) => {
    const token = c.get("sessionToken")
    AuthManager.logout(token)
    return c.json({ ok: true })
})
