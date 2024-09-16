import { Hono } from "hono"
import { route as login } from "server/routes/api/auth/login.ts"
import { route as logout } from "server/routes/api/auth/logout.ts"
import { route as whoami } from "server/routes/api/auth/whoami.ts"
import { route as register } from "server/routes/api/auth/register.ts"
import { route as invite } from "server/routes/api/auth/invite.ts"

export const route = new Hono()

route.route("/auth/login", login)
route.route("/auth/logout", logout)
route.route("/auth/whoami", whoami)
route.route("/auth/register", register)
route.route("/auth/invite", invite)
