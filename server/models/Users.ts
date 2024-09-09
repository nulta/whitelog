import { DatabaseController, IDatabase, PreparedQuery } from "server/models/DatabaseController.ts"

type User = {
    id: string
    username: string
    password_hash: string
    display_name: string
}

export class UserDb extends DatabaseController<User> {
    private selectByUsernameQuery: PreparedQuery<never, User, [string]>

    constructor(db: IDatabase) {
        super(db, "users", { idLength: 4 }, {
            id: "",
            username: "",
            password_hash: "",
            display_name: "",
        })

        this.selectByUsernameQuery = db.prepareQuery(
            `SELECT ${this.dataKeys.join(", ")} FROM users WHERE username = ?`
        )
    }

    public async getByUsername(username: string): Promise<User | null> {
        const result = this.selectByUsernameQuery.firstEntry([username]) ?? null
        return await Promise.resolve(result)
    }
}
