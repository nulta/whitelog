import { Hono } from "hono"
import { RenderManager } from "server/managers/RenderManager.ts"

export const indexRoute = new Hono()

indexRoute.get("/", async (c) => {
    const data = {
        tags: [
            "tag1", "tag2", "tag3",
        ],
        posts: [
            {
                title: "Post 1",
                href: "/aXvC",
                date: "2024-08-07",
                description: "This is a post about something",
                author: "nulta",
                poster: "/assets/img/pic1.jpg",
            },
            {
                title: "Post 2",
                href: "/qHeV",
                date: "2024-08-08",
                description: "Lorem ipsum dolor et amet. Lorem ipsum dolor et amet.",
                author: "nulta",
                poster: "/assets/img/starlight.png",
            },
            {
                title: "Post 3",
                href: "/asfa",
                date: "2024-08-08",
                description: "This is a post about different thing",
                author: "nulta",
                poster: "/assets/img/pic2.jpg",
            },
            {
                title: "Post 4",
                href: "/zvgf",
                date: "2024-08-08",
                description: "This is a post about different thing",
                author: "nulta",
                poster: "",
            },
        ]
    }

    const html = await RenderManager.renderTemplate("main", data)

    return c.html(html)
})
