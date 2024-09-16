import { Hono } from "hono"
import { apiTakes } from "server/lib/reqvalidator.ts"
import { AuthManager } from "server/managers/AuthManager.ts"

export const route = new Hono()

const schema = apiTakes({
    username: { $: "string" },
    password: { $: "string" },
})

route.post("/", schema, async (c) => {
    const {username, password} = c.req.valid("json")
    const token = await AuthManager.login(username, password)

    if (!token) {
        return c.json({ error: "[PJ8XH] Invalid username or password" }, 401)
    }

    const user = await AuthManager.getSessionUser(token)

    if (!user) {
        // what???
        return c.json({ error: "[ZU8BS] Invalid session" }, 401)
    }

    return c.json({ token, user })
})
