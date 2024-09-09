import { DatabaseController, IDatabase } from "server/models/DatabaseController.ts"

type Comment = {
    post_id: string
    id: string
    content: string
    nickname: string
    created_at: number
    updated_at: number | null
    reply_to: string | null
}

export class CommentDb extends DatabaseController<Comment> {
    constructor(db: IDatabase) {
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
