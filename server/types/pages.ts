export interface PostPageProps {
    post: {
        id: string
        title: string
        content: string // HTML
        author: string
        published_at: Date
        tags: string[]
        relations: {
            in: string[]
            out: string[]
        }
    }
}
