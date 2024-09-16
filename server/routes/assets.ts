import { Hono } from "hono"
import { serveStatic } from "hono/deno"

export const route = new Hono()

route.use(
    "/",
    serveStatic({
        root: "./client",
        onNotFound: (_path, c) => { c.notFound() },
    }),
)
