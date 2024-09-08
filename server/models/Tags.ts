import { IDatabaseController, DB } from "server/models/DatabaseController.ts"
import { PreparedQuery } from "sqlite"

export class TagsController implements IDatabaseController<{title: string}> {
    private db: DB
    private getQuery: PreparedQuery
    private deleteQuery: PreparedQuery
    private insertQuery: PreparedQuery

    constructor(db: DB) {
        this.db = db
        this.getQuery = db.prepareQuery(`SELECT title FROM tags WHERE title = ?`)
        this.deleteQuery = db.prepareQuery(`DELETE FROM tags WHERE title = ?`)
        this.insertQuery = db.prepareQuery(`INSERT OR IGNORE INTO tags (title) VALUES (?)`)
    }

    async create(data: {title: string}): Promise<{title: string}> {
        this.insertQuery.run([data.title])
        return await this.get(data.name)
    }

    async get(name: string): Promise<{name: string}> {
        return this.getQuery.firstEntry([name])
    }

    async update(name: string, data: {name: string}): Promise<void> {
        this.db.query(
            `UPDATE tags SET name = ? WHERE name = ?`,
            [data.name, name]
        )
    }

    async delete(name: string): Promise<void> {
        this.deleteQuery.run([name])
    }
}