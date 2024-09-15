import { Hono } from "hono"
import { indexRoute } from "server/routes/index.ts"
import { loginRoute } from "server/routes/login.ts"
import { postRoute } from "server/routes/post.ts"
import { assetsRoute } from "server/routes/assets.ts"

export const routes = new Hono()

routes.get("/favicon.ico", c => c.notFound())

routes.route("/", indexRoute)
routes.route("/", loginRoute)
routes.route("/", assetsRoute)
routes.route("/", postRoute)
