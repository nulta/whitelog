import { Hono } from "hono"
import { apiRequiresAuth } from "server/lib/reqauthorizer.ts"

export const route = new Hono()

route.get("/", apiRequiresAuth(), (c) => {
    const user = c.get("user")
    return c.json(user)
})
