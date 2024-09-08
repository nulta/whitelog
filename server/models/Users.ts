import { DatabaseController, DB } from "server/models/DatabaseController.ts"

type User = {
    username: string
    passwordHash: string
    displayName: string
}

export class UserController extends DatabaseController<User> {
    constructor(db: DB) {
        super(db, "users", { idLength: 4 }, {
            username: "",
            passwordHash: "",
            displayName: "",
        })
    }
}
