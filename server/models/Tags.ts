import { DatabaseController, IDatabase } from "server/models/DatabaseController.ts"

type Tag = {
    title: string
}

export class TagDb extends DatabaseController<Tag> {
    constructor(db: IDatabase) {
        super(db, "tags", { pkey: "title" }, {
            title: "",
        })
    }
}
