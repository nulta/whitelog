import { Hono } from "hono"
import { route as index } from "server/routes/index.ts"
import { route as login } from "server/routes/login.ts"
import { route as post } from "server/routes/post.ts"
import { route as assets } from "server/routes/assets.ts"
import { route as api } from "server/routes/api/routes.ts"

export const routes = new Hono()

routes.get("/favicon.ico", c => c.notFound())

routes.route("/", index)
routes.route("/login", login)
routes.route("/api/", api)
routes.route("/assets/*", assets)
routes.route("/", post)