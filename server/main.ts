import { Hono } from "hono"
import { etag } from "hono/etag"
import { Logger } from "server/lib/logger.ts"
import { DatabaseManager } from "./managers/DatabaseManager.ts"
import { UserManager } from "server/managers/UserManager.ts"
import { PostManager } from "server/managers/PostManager.ts"
import { routes } from "server/routes/routes.ts"
import { ConfigManager } from "server/managers/ConfigManager.ts"
import { RenderManager } from "server/managers/RenderManager.ts"
import { AuthManager } from "server/managers/AuthManager.ts"

DatabaseManager.initialize({
    // filepath: "data/whitelog.db",
    filepath: ":memory:",
})
ConfigManager.initialize()
UserManager.initialize()
PostManager.initialize()
AuthManager.initialize()
RenderManager.initialize()

const app = new Hono()
app.use(etag())
app.route("/", routes)

Deno.serve({onListen: (addr)=>{
    Logger.info(`Listening on ${addr.hostname}:${addr.port}`)
}}, app.fetch)

;(async () => {
    const testUser = await UserManager.createUser({
        username: "test",
        password: "test-password",
        displayName: "Test User",
    })

    const post1 = await PostManager.createPost({
        path: "test-post",
        title: "Test post",
        subtitle: "This is a test post",
        content: "This is a test post",
        author: testUser,
    })

    await PostManager.createTag("test-tag")
    await PostManager.createTag("another-tag")
    await PostManager.addTagToPost(post1, "test-tag")
    await PostManager.addTagToPost(post1, "another-tag")
})()
