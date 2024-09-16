import { createMiddleware } from "hono/factory"
import { AuthManager } from "server/managers/AuthManager.ts"
import { User } from "server/managers/UserManager.ts"

export const apiRequiresAuth = () => createMiddleware<{
    Variables: {
        user: User,
        sessionToken: string,
    }
}>(async (c, next) => {
    const authHeader = c.req.header("Authorization")

    if (!authHeader) {
        return c.json({ error: "[WG6PK] The API requires authorization" }, 401)
    }

    if (!authHeader.startsWith("Bearer ")) {
        return c.json({ error: "[Q5P1I] Expected 'Bearer' authorization schema" }, 401)
    }

    const token = authHeader.replace("Bearer ", "")
    const user = await AuthManager.getSessionUser(token)

    if (!user) {
        return c.json({ error: "[R7L3A] Invalid session token" }, 401)
    }

    c.set("user", user)
    c.set("sessionToken", token)
    await next()
})
