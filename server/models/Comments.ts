import { DatabaseController, DB } from "server/models/DatabaseController.ts"

type Comment = {
    post_id: string
    id: string
    content: string
    nickname: string
    created_at: number
    updated_at: number | null
    reply_to: string | null
}

export class CommentController extends DatabaseController<Comment> {
    constructor(db: DB) {
        super(db, "comments", { idLength: 6 }, {
            post_id: "",
            id: "",
            content: "",
            nickname: "",
            created_at: 0,
            updated_at: 0,
            reply_to: "",
        })
    }
}
