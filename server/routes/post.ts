import { Hono } from "hono"
import { RenderManager } from "server/managers/RenderManager.ts"
import { PostManager } from "server/managers/PostManager.ts"

export const route = new Hono()

route.get("/:postPath{[a-zA-Z0-9][a-zA-Z0-9-]*}", async (c) => {
    const postPath = c.req.param("postPath")
    const post = await PostManager.getPostByPath(postPath)
    if (!post) {
        // TODO: 404 page? not here?
        c.status(404)
        return c.text("404 Not Found")
    }

    const content = RenderManager.renderMarkup(post.content)

    const data = {
        post: {
            tags: post.tags,
            title: post.title,
            date: post.createdAt.toISOString(),
            description: post.subtitle ?? "",
            author: post.authorName ?? post.author?.displayName ?? "",
            content: post.content,
            relations: [],  // TODO
        }
    }

    const html = await RenderManager.renderTemplate("post", data)
    return c.html(html)
})