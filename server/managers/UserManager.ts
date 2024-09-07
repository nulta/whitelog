import { Logger } from "server/lib/logger.ts"
import { DatabaseManager } from "server/managers/DatabaseManager.ts"

const log = new Logger("UserManager", "#f4a742")

export class UserManager {
    static async createUser(username: string, password: string, displayName: string): Promise<void> {
        const id = Math.random().toString(36).substring(2)
        const passwordHash = await this.hashPassword(password)
        DatabaseManager.db.execute(
            `INSERT INTO users (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)`,
            [id, username, passwordHash, displayName]
        )
        this.log.info("Created user", id, username)
    }

    static async hashPassword(password: string): Promise<string> {
}
