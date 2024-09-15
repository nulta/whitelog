import { IDatabase, PreparedQuery } from "server/models/DatabaseController.ts"

export class ConfigDb {
    private insertQuery: PreparedQuery<never, never, [string, string]>
    private selectQuery: PreparedQuery<[string], never, [string]>

    constructor(db: IDatabase) {
        this.insertQuery = db.prepareQuery(
            `INSERT INTO configurations (key, value) VALUES (?, ?)`
        )
        this.selectQuery = db.prepareQuery(
            `SELECT value FROM configurations WHERE key = ?`
        )
    }

    async set(key: string, value: string): Promise<void> {
        this.insertQuery.execute([key, value])
        return await Promise.resolve()
    }

    async get(key: string): Promise<string | null> {
        const [result] = this.selectQuery.first([key]) ?? [null]
        return await Promise.resolve(result)
    }
}
