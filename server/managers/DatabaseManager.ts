import { Logger } from "server/lib/logger.ts"
import { DB } from "sqlite"
import { list as migrationList } from "server/migrations/list.ts"

const log = new Logger("DatabaseManager", "#9d42ed")

type DatabaseOptions = {
    filepath: string
}

export class DatabaseManager {
    private static db: DB

    /**
     * Initialize the database manager.
     * - Open the database file
     * - Run the necessary migrations
     */
    static initialize(options: DatabaseOptions): void {
        if (this.db) {
            log.warn("Tried to initialize the database manager twice")
            return
        }

        const { filepath } = options
        this.db = new DB(filepath)
        this.initializeMetadata()
        this.initializeMigrations()
        log.info("Initialized database", filepath)
    }

    private static initializeMetadata() {
        this.db.execute(
            `CREATE TABLE IF NOT EXISTS _db_meta (
                key TEXT PRIMARY KEY,
                value TEXT
            ) STRICT, WITHOUT ROWID;`
        )
    }

    private static initializeMigrations() {
        const schemaVersion = this.getMetadata("schema_version")
        this.runMigrationsAfter(schemaVersion)
    }

    private static runMigrationsAfter(id: string) {
        const migrations = migrationList.filter(m => m.id > id)
        for (const migration of migrations) {
            log.info("Running migration", migration.id)
            this.db.execute(migration.command)
            this.setMetadata("schema_version", migration.id)
        }
    }

    private static getMetadata(key: string): string {
        const result = this.db.query<[string]>("SELECT value FROM _db_meta WHERE key = ?", [key])
        return result[0]?.[0] ?? ""
    }

    private static setMetadata(key: string, value: string) {
        this.db.query(
            "INSERT OR REPLACE INTO _db_meta (key, value) VALUES (?, ?)",
            [key, value]
        )
    }
}
