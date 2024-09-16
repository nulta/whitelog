import { DatabaseController, IDatabase, PreparedQuery } from "server/models/DatabaseController.ts"

type Session = {
    key: string
    user_id: string
    created_at: number
    last_used_at: number
    expires_at: number
}

export class SessionDb extends DatabaseController<Session> {
    private selectByUserQuery: PreparedQuery<never, Session, [string]>
    private deleteByUserQuery: PreparedQuery<never, never, [string]>

    constructor(db: IDatabase) {
        super(db, "sessions", { pkey: "key" }, {
            key: "",
            user_id: "",
            created_at: 0,
            last_used_at: 0,
            expires_at: 0,
        })

        this.selectByUserQuery = db.prepareQuery(
            `SELECT ${this.dataKeys.join(", ")} FROM sessions WHERE user_id = ?`
        )

        this.deleteByUserQuery = db.prepareQuery(
            `DELETE FROM sessions WHERE user_id = ?`
        )
    }

    public async getByUser(userId: string): Promise<Session[]> {
        const result = this.selectByUserQuery.allEntries([userId])
        return await Promise.resolve(result)
    }

    public async deleteByUser(key: string): Promise<void> {
        this.deleteByUserQuery.execute([key])
        return await Promise.resolve()
    }

    // TODO: Garbage data collection query
    // e.g. `DELETE FROM sessions WHERE expires_at < (now)`
}
