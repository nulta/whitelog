import { DatabaseController, DB } from "server/models/DatabaseController.ts"

type Post = {
    title: string
    subtitle: string
    content: string
    created_at: number
    updated_at: number
    author_id: string
    author_name_override: string | null
}

export class PostController extends DatabaseController<Post> {
    constructor(db: DB) {
        super(db, "posts", { idLength: 5 }, {
            title: "",
            subtitle: "",
            content: "",
            created_at: 0,
            updated_at: 0,
            author_id: "",
            author_name_override: "",
        })
    }
}
