import { Hono } from "hono"
import { etag } from "hono/etag"
import { serveStatic } from "hono/deno"
import { Logger } from "server/lib/logger.ts"
import { BlackPrintTemplate } from "server/lib/blackprint/blackprint.ts"
import { DatabaseManager } from "./managers/DatabaseManager.ts"
import { UserManager } from "server/managers/UserManager.ts"
import { PostManager } from "server/managers/PostManager.ts"

DatabaseManager.initialize({
    // filepath: "data/whitelog.db",
    filepath: ":memory:",
})

UserManager.initialize()

PostManager.initialize()

UserManager.createUser({
    username: "test",
    password: "test-password",
    displayName: "Test User",
})


;(async() => {
    const user = await UserManager.login("test", "test-password")
    Logger.info(user)
    Logger.info(await UserManager.login("test", "WRONG-PASSWORD"))

    const invite = await UserManager.createInvite({})
    Logger.info(invite)
    Logger.info(await UserManager.isValidInvite(invite.code))
    Logger.info(await UserManager.isValidInvite("INVALID-CODE"))
    Logger.info(await UserManager.useInvite(invite.code, user!))
    Logger.info(await UserManager.isValidInvite(invite.code))

    for (let i = 0; i < 20; i++) {
        await PostManager.createPost({
            title: "Test Post " + i,
            content: "This is a test post",
            author: user!,
        })
    }

    const posts1 = await PostManager.paginatePosts(10)
    Logger.info(posts1)

    const posts2 = await PostManager.paginatePosts(10, posts1[posts1.length - 1].createdAt)
    Logger.info(posts2)
})()


const app = new Hono()

app.use(etag())

app.get("/", async (c) => {
    const template = new BlackPrintTemplate(
        await Deno.readTextFile("./client/templates/main.bp.html"),
        async (path) =>
            await Deno.readTextFile(
                "./client/templates/" + path.replaceAll("..", "") + ".bp.html",
            ),
    )

    const html = await template.render({
        site: {
            lang: "ko",
            name: "whitelog",
            description: "A simple blog",
            ownerName: "nulta",
        },
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
    })

    return c.html(html)
})

app.get("/favicon.ico", (c) => {
    c.status(404)
    return c.text("404 Not Found")
})

app.get("/login", async (c) => {
    const template = new BlackPrintTemplate(
        await Deno.readTextFile("./client/templates/login.bp.html"),
        async (path) =>
            await Deno.readTextFile(
                "./client/templates/" + path.replaceAll("..", "") + ".bp.html",
            ),
    )

    const rendered = await template.render({
        site: {
            lang: "ko",
            name: "whitelog",
            description: "A simple blog",
            ownerName: "nulta",
        },
    })

    return c.html(rendered)
})

app.get("/:postId", async (c) => {
    const template = new BlackPrintTemplate(
        await Deno.readTextFile("./client/templates/post.bp.html"),
        async (path) =>
            await Deno.readTextFile(
                "./client/templates/" + path.replaceAll("..", "") + ".bp.html",
            ),
    )

    c.req.param("postId")

    const html = (x: TemplateStringsArray) => (x.raw[0])
    type RelationType = "both" | "out" | "in"

    const rendered = await template.render({
        site: {
            lang: "ko",
            name: "whitelog",
            description: "A simple blog",
            ownerName: "nulta",
        },
        post: {
            tags: [
                "태그", "긴 글",
            ],
            title: "이 글 제목",
            date: "2024-08-10",
            description: "여름 장이란 애시당초에 글러서, 해는 아직 중천에 있건만 장판은 벌써 쓸쓸하고 더운 햇발이 벌여놓은 전 휘장 밑으로 등줄기를 훅훅 볶는다.",
            author: "nulta",
            content: html`
                <figure>
                    <img src="/assets/img/pic3.jpg">
                    <figcaption>https://unsplash.com/photos/a-close-up-of-some-flowers-MJIVWCTLuHA</figcaption>
                </figure>
                <p>모든 국민은 통신의 비밀을 침해받지 아니한다. 정부는 예산에 변경을 가할 필요가 있을 때에는 추가경정예산안을 편성하여 국회에 제출할 수 있다. 대법원장은 국회의 동의를 얻어 대통령이 임명한다. 대통령은 법률에서 구체적으로 범위를 정하여 위임받은 사항과 법률을 집행하기 위하여 필요한 사항에 관하여 대통령령을 발할 수 있다.</p>
                <p>대법원은 법률에 저촉되지 아니하는 범위안에서 소송에 관한 절차, 법원의 내부규율과 사무처리에 관한 규칙을 제정할 수 있다. 행정권은 대통령을 수반으로 하는 정부에 속한다. 국회나 그 위원회의 요구가 있을 때에는 국무총리·국무위원 또는 정부위원은 출석·답변하여야 하며, 국무총리 또는 국무위원이 출석요구를 받은 때에는 국무위원 또는 정부위원으로 하여금 출석·답변하게 할 수 있다. 헌법재판소에서 법률의 위헌결정, 탄핵의 결정, 정당해산의 결정 또는 헌법소원에 관한 인용결정을 할 때에는 재판관 6인 이상의 찬성이 있어야 한다. 정부는 회계연도마다 예산안을 편성하여 회계연도 개시 90일전까지 국회에 제출하고, 국회는 회계연도 개시 30일전까지 이를 의결하여야 한다.</p>
                <p>대통령은 조약을 체결·비준하고, 외교사절을 신임·접수 또는 파견하며, 선전포고와 강화를 한다. 이 헌법에 의한 최초의 대통령의 임기는 이 헌법시행일로부터 개시한다. 대통령은 국무회의의 의장이 되고, 국무총리는 부의장이 된다. 헌법재판소에서 법률의 위헌결정, 탄핵의 결정, 정당해산의 결정 또는 헌법소원에 관한 인용결정을 할 때에는 재판관 6인 이상의 찬성이 있어야 한다.</p>
            `,
            relations: [
                {
                    title: "Both linked post",
                    href: "/1234",
                    relation: "both",
                },
                {
                    title: "Backlink",
                    href: "/2345",
                    relation: "in",
                },
                {
                    title: "Outbound link",
                    href: "/2345",
                    relation: "out",
                },
            ],
        }
    })

    return c.html(rendered)
})

app.use(
    "/assets/*",
    serveStatic({
        root: "./client",
        onNotFound: (path, c) => {
            c.text("404 Not Found")
            console.log(path, 404)
        },
    }),
)


Deno.serve({onListen: (addr)=>{
    Logger.info(`Listening on ${addr.hostname}:${addr.port}`)
}}, app.fetch)
