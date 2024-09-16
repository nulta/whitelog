import { Hono } from "hono"
import { RenderManager } from "server/managers/RenderManager.ts"

export const route = new Hono()

route.get("/:postId", async (c) => {
    c.req.param("postId")

    const html = (x: TemplateStringsArray) => (x.raw[0])

    const rendered = await RenderManager.renderTemplate("post", {
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