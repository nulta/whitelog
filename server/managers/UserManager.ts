import * as scrypt from "scrypt"
import { Logger } from "server/lib/logger.ts"
import { DatabaseManager } from "server/managers/DatabaseManager.ts"
import { UserDb } from "server/models/Users.ts"
import { InviteDb, InviteUseDb } from "server/models/Invites.ts"
import { KeyGenerator } from "server/lib/idgen.ts"

const log = new Logger("UserManager", "#f4a742")

export type User = Readonly<{
    id: string
    username: string
    displayName: string
}>

export type Invite = Readonly<{
    code: string
    uses: number
    createdAt: Date
    createdBy: User | null
    expiresAt: Date | null
}>

type CreateUserData = {
    username: string, password: string, displayName: string
}

type CreateInviteData = {
    code?: string, user?: User, uses?: number, expiresAt?: Date
}

type UserDbRow = NonNullable<Awaited<ReturnType<UserDb["get"]>>>


export class UserManager {
    private static userDb: UserDb
    private static inviteDb: InviteDb
    private static inviteUseDb: InviteUseDb

    public static initialize() {
        this.userDb = DatabaseManager.instantiate(UserDb)
        this.inviteDb = DatabaseManager.instantiate(InviteDb)
        this.inviteUseDb = DatabaseManager.instantiate(InviteUseDb)
    }


    public static async createUser(data: CreateUserData): Promise<User> {
        const passwordHash = scrypt.hash(data.password)

        const row = await this.userDb.insert({
            username: data.username,
            password_hash: passwordHash,
            display_name: data.displayName,
        })

        log.info("Created user '%s' (%s)", data.username, row.id)

        return {
            id: row.id,
            username: data.username,
            displayName: data.displayName,
        }
    }

    public static async getUser(id: string): Promise<User> {
        const row = await this.userDb.get(id) as UserDbRow

        return {
            id: row.id,
            username: row.username,
            displayName: row.display_name,
        }
    }

    public static async login(username: string, password: string): Promise<User | null> {
        const user = await this.userDb.getByUsername(username)
        if (user == null) {
            log.info("Failed login attempt for user '%s' - user not found", username)
            return null
        }

        if (!scrypt.verify(password, user.password_hash)) {
            log.info("Failed login attempt for user '%s' - invalid password", username)
            return null
        }

        log.info("Login successful for user '%s' (%s)", username, user.id)

        return {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
        }
    }

    public static async changePassword(user: User, newPassword: string): Promise<void> {
        const passwordHash = scrypt.hash(newPassword)
        await this.userDb.update(user.id, { password_hash: passwordHash })
    }

    public static async changeDisplayName(user: User, newDisplayName: string): Promise<void> {
        await this.userDb.update(user.id, { display_name: newDisplayName })
    }

    public static async deleteUser(user: User): Promise<void> {
        await this.userDb.delete(user.id)
        log.info("Deleted user '%s' (%s)", user.username, user.id)
    }


    public static async createInvite(data: CreateInviteData): Promise<Invite> {
        const invite: Invite = {
            code: data.code ?? KeyGenerator.inviteCode(),
            uses: data.uses ?? 1,
            createdAt: new Date(),
            createdBy: data.user ?? null,
            expiresAt: data.expiresAt ?? null,
        }

        await this.inviteDb.insert({
            code: invite.code,
            uses: invite.uses,
            created_at: invite.createdAt.getTime(),
            created_by: invite.createdBy?.id ?? null,
            expires_at: invite.expiresAt?.getTime() ?? null,
        })

        log.info("Created a invite code for '%s' (%s)", invite.createdBy?.username, invite.createdBy?.id)

        return invite
    }

    public static async isValidInvite(inviteCode: string): Promise<boolean> {
        const invite = await this.inviteDb.get(inviteCode)
        if (invite == null) { return false }

        const isRemainingUses = invite.uses > 0
        const isNotExpired = !invite.expires_at || invite.expires_at > Date.now()

        return isRemainingUses && isNotExpired
    }

    public static async useInvite(inviteCode: string, user: User): Promise<void> {
        if (!await this.isValidInvite(inviteCode)) {
            throw new Error("Invalid invite code")
        }

        this.inviteUseDb.insert({
            invite_code: inviteCode,
            used_by: user.id,
            used_at: Date.now(),
        })

        const invite = await this.inviteDb.get(inviteCode)
        if (invite == null) { return }

        await this.inviteDb.update(inviteCode, { uses: invite.uses - 1 })
    }
}
