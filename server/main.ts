import { Hono } from "hono"
import { etag } from "hono/etag"
import { Logger } from "server/lib/logger.ts"
import { BlackPrintTemplate } from "server/lib/blackprint/blackprint.ts"
import { DatabaseManager } from "./managers/DatabaseManager.ts"
import { UserManager } from "server/managers/UserManager.ts"
import { PostManager } from "server/managers/PostManager.ts"
import { routes } from "server/routes/routes.ts"
import { ConfigManager } from "server/managers/ConfigManager.ts"
import { RenderManager } from "server/managers/RenderManager.ts"

DatabaseManager.initialize({
    // filepath: "data/whitelog.db",
    filepath: ":memory:",
})
ConfigManager.initialize()
UserManager.initialize()
PostManager.initialize()
RenderManager.initialize()

const app = new Hono()
app.use(etag())
app.route("/", routes)

Deno.serve({onListen: (addr)=>{
    Logger.info(`Listening on ${addr.hostname}:${addr.port}`)
}}, app.fetch)

UserManager.createUser({
    username: "test",
    password: "test-password",
    displayName: "Test User",
})
