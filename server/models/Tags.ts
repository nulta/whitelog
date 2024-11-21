import { DatabaseController, IDatabase, PreparedQuery } from "server/models/DatabaseController.ts"

type Tag = {
    title: string
}

export class TagDb extends DatabaseController<Tag> {
    private getAllQuery: PreparedQuery<[], Tag, []>

    constructor(db: IDatabase) {
        super(db, "tags", { pkey: "title" }, {
            title: "",
        })

        this.getAllQuery = db.prepareQuery(
            `SELECT ${this.dataKeys.join(", ")} FROM tags`
        )
    }

    async getAll(): Promise<Tag[]> {
        const result = this.getAllQuery.allEntries([])
        return await Promise.resolve(result)
    }
}
