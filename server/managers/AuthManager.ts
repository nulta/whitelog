import { Logger } from "server/lib/logger.ts"
import { SessionDb } from "server/models/Sessions.ts"
import { DatabaseManager } from "server/managers/DatabaseManager.ts"
import { UserManager, User } from "server/managers/UserManager.ts"
import { KeyGenerator } from "server/lib/idgen.ts"
import { InviteDb, InviteUseDb } from "server/models/Invites.ts"

const log = new Logger("AuthManager", "#ff2baa")

export type Invite = Readonly<{
    code: string
    uses: number
    createdAt: Date
    createdBy: User | null
    expiresAt: Date | null
}>

type CreateInviteData = {
    code?: string, user?: User, uses?: number, expiresAt?: Date
}

export class AuthManager {
    private static sessionDb: SessionDb
    private static inviteDb: InviteDb
    private static inviteUseDb: InviteUseDb

    public static initialize() {
        this.sessionDb = DatabaseManager.instantiate(SessionDb)
        this.inviteDb = DatabaseManager.instantiate(InviteDb)
        this.inviteUseDb = DatabaseManager.instantiate(InviteUseDb)
    }

    private static generateSessionKey(): string {
        const key = KeyGenerator.alphanumeric(16)
        return key
    }

    private static newSessionExpiryDate(): number {
        // 30 days from now
        return Date.now() + 1000 * 60 * 60 * 24 * 30
    }

    private static async createSession(user: User): Promise<string> {
        const key = this.generateSessionKey()

        await this.sessionDb.insert({
            key,
            user_id: user.id,
            created_at: Date.now(),
            last_used_at: Date.now(),
            expires_at: this.newSessionExpiryDate(),
        })

        return key
    }

    public static async login(username: string, password: string): Promise<string | null> {
        const user = await UserManager.getUserByUsername(username)
        if (user == null) {
            log.info("Failed login attempt for user '%s' - user not found", username)
            return null
        }

        if (!await UserManager.checkPassword(user, password)) {
            log.info("Failed login attempt for user '%s' - invalid password", username)
            return null
        }

        log.info("Login successful for user '%s' (%s)", username, user.id)

        return this.createSession(user)
    }

    public static async logout(key: string): Promise<void> {
        await this.sessionDb.delete(key)
    }

    public static async logoutAll(user: User): Promise<void> {
        await this.sessionDb.deleteByUser(user.id)
    }

    public static async getSessionUser(key: string): Promise<User | null> {
        const session = await this.sessionDb.get(key)
        if (session == null) {
            return null
        }

        // Check if the session has expired
        const now = Date.now()
        if (session.expires_at < now) {
            log.info("Session '%s...' had been expired", key.slice(0,4))
            this.sessionDb.delete(key)
            return null
        }

        // Check if the session have a user
        // (should've been cleaned up by `ON DELETE CASCADE` in the database)
        const user = await UserManager.getUser(session.user_id)
        if (user == null) {
            log.warn("Session '%s...' references non-existent user '%s'", key.slice(0,4), session.user_id)
            this.sessionDb.delete(key)
            return null
        }

        // Update the session's last used time and expire time
        await this.sessionDb.update(key, {
            last_used_at: now,
            expires_at: this.newSessionExpiryDate(),
        })

        return user
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

    public static async useInvite(inviteCode: string, user: User): Promise<boolean> {
        if (!await this.isValidInvite(inviteCode)) {
            return false
        }

        this.inviteUseDb.insert({
            invite_code: inviteCode,
            used_by: user.id,
            used_at: Date.now(),
        })

        const invite = await this.inviteDb.get(inviteCode)
        if (invite == null) { return false }

        await this.inviteDb.update(inviteCode, { uses: invite.uses - 1 })

        return true
    }
}
