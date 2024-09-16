import { Hono } from "hono"
import { apiTakes } from "server/lib/reqvalidator.ts"
import { AuthManager } from "server/managers/AuthManager.ts"
import { UserManager } from "server/managers/UserManager.ts"

export const route = new Hono()

const schema = apiTakes({
    inviteCode: { $: "string" },
    username: { $: "string", regex: /^[a-z0-9_]{3,20}$/ },
    displayName: { $: "string", minLength: 1, maxLength: 20 },
    password: { $: "string", minLength: 8, maxLength: 128 },
})

// TODO: Rate limit, or Proof of work

route.post("/", schema, async (c) => {
    const {inviteCode, username, password, displayName} = c.req.valid("json")

    const existingUser = await UserManager.getUserByUsername(username)
    if (existingUser) {
        return c.json({ error: "[P5HC7] Username already taken" }, 400)
    }

    const isValidInvite = await AuthManager.isValidInvite(inviteCode)
    if (!isValidInvite) {
        return c.json({ error: "[AQ1Z3] Invalid invite code" }, 403)
    }

    const user = await UserManager.createUser({username, password, displayName})
    await AuthManager.useInvite(inviteCode, user)

    return c.json({ success: true })
})
