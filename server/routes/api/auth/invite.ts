import { Hono } from "hono"
import { apiRequiresAuth } from "server/lib/reqauthorizer.ts"
import { apiTakes } from "server/lib/reqvalidator.ts"
import { AuthManager } from "server/managers/AuthManager.ts"

export const route = new Hono()

const schema = apiTakes({
    code: { $: "string", optional: true, minLength: 4, maxLength: 64 },
    uses: { $: "number", optional: true, min: 1 },
    expiresAt: { $: "number", optional: true },
})

route.post("/", apiRequiresAuth(), schema, async (c) => {
    const { code, uses, expiresAt } = c.req.valid("json")

    if (await AuthManager.isValidInvite(code)) {
        return c.json({ error: "[S3PD5] Duplicate invite code" }, 400)
    }

    const invite = await AuthManager.createInvite({
        code,
        uses,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        user: c.get("user"),
    })

    return c.json(invite)
})
