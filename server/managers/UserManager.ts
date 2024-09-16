import * as scrypt from "scrypt"
import { Logger } from "server/lib/logger.ts"
import { DatabaseManager } from "server/managers/DatabaseManager.ts"
import { UserDb } from "server/models/Users.ts"

const log = new Logger("UserManager", "#f4a742")

export type User = Readonly<{
    id: string
    username: string
    displayName: string
}>

type CreateUserData = {
    username: string, password: string, displayName: string
}


export class UserManager {
    private static userDb: UserDb

    public static initialize() {
        this.userDb = DatabaseManager.instantiate(UserDb)
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

    public static async getUser(id: string): Promise<User | null> {
        const row = await this.userDb.get(id)
        if (row == null) { return null }

        return {
            id: row.id,
            username: row.username,
            displayName: row.display_name,
        }
    }

    public static async getUserByUsername(username: string): Promise<User | null> {
        const row = await this.userDb.getByUsername(username)
        if (row == null) { return null }

        return {
            id: row.id,
            username: row.username,
            displayName: row.display_name,
        }
    }

    public static async checkPassword(user: User, password: string): Promise<boolean> {
        const row = await this.userDb.get(user.id)
        if (row == null) { return false }

        return scrypt.verify(password, row.password_hash)
    }

    public static async setPassword(user: User, newPassword: string): Promise<void> {
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
}
