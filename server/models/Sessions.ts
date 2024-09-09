import { DatabaseController, IDatabase } from "server/models/DatabaseController.ts"

type Session = {
    id: string
    user_id: string
    created_at: number
    last_used_at: number
    expires_at: number
}

export class SessionDb extends DatabaseController<Session> {
    constructor(db: IDatabase) {
        super(db, "sessions", { idLength: 10 }, {
            id: "",
            user_id: "",
            created_at: 0,
            last_used_at: 0,
            expires_at: 0,
        })
    }
}
