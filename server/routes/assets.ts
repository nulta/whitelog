import { Hono } from "hono"
import { serveStatic } from "hono/deno"

export const assetsRoute = new Hono()

assetsRoute.use(
    "/assets/*",
    serveStatic({
        root: "./client",
        onNotFound: (_path, c) => { c.notFound() },
    }),
)
