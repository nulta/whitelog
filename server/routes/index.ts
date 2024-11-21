import { Hono } from "hono"
import { RenderManager } from "server/managers/RenderManager.ts"
import { PostManager } from "server/managers/PostManager.ts"

export const route = new Hono()

route.get("/", async (c) => {
    const posts = await PostManager.paginatePosts(5)
    const tags = await PostManager.getAllTags()

    const data = {
        tags,
        posts: posts.map(post => ({
            title: post.title,
            href: post.path,
            date: post.createdAt.toISOString(),
            description: post.subtitle,
            author: post.authorName ?? post.author?.displayName ?? null,
            poster: post.posterImage ?? null,
        }))
    }

    const html = await RenderManager.renderTemplate("main", data)

    return c.html(html)
})
