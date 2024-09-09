import { DatabaseController, IDatabase, PreparedQuery } from "server/models/DatabaseController.ts"

type Invite = {
    code: string
    uses: number,
    created_at: number,
    created_by: string | null,
    expires_at: number | null,
}

export class InviteDb extends DatabaseController<Invite> {
    constructor(db: IDatabase) {
        super(db, "invites", { pkey: "code" }, {
            code: "",
            uses: 0,
            created_at: 0,
            created_by: null,
            expires_at: null,
        })
    }
}


type InviteUse = {
    invite_code: string,
    used_by: string,
    used_at: number,
}

export class InviteUseDb {
    private insertQuery: PreparedQuery<never, never, InviteUse>
    private selectByCodeQuery: PreparedQuery<[], InviteUse, [string]>
    private selectByUserQuery: PreparedQuery<[], InviteUse, [string]>

    constructor(db: IDatabase) {
        this.insertQuery = db.prepareQuery(
            `INSERT INTO invite_uses (invite_code, used_by, used_at)
            VALUES (:invite_code, :used_by, :used_at)`
        )
        this.selectByCodeQuery = db.prepareQuery(
            `SELECT * FROM invite_uses WHERE invite_code = ?`
        )
        this.selectByUserQuery = db.prepareQuery(
            `SELECT * FROM invite_uses WHERE used_by = ?`
        )
    }

    async insert(data: InviteUse): Promise<void> {
        this.insertQuery.execute(data)
        return await Promise.resolve()
    }

    async getByInviteCode(inviteCode: string): Promise<InviteUse[]> {
        const result = this.selectByCodeQuery.allEntries([inviteCode])
        return await Promise.resolve(result)
    }

    async getByUser(userId: string): Promise<InviteUse[]> {
        const result = this.selectByUserQuery.allEntries([userId])
        return await Promise.resolve(result)
    }
}
