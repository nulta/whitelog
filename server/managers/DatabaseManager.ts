import { Logger } from "server/lib/logger.ts"
import { DB, PreparedQuery } from "sqlite"
import { list as migrationList } from "server/migrations/list.ts"
import { assert } from "assert"
import { customAlphabet } from "nanoid"


const log = new Logger("DatabaseManager", "#9d42ed")

type DatabaseOptions = {
    filepath: string
}

type WithId<T> = T & {id: string}

interface IDatabaseTable<T extends DatabaseTableData> {
    create(data: T): Promise<WithId<T>>
    remove(id: string): Promise<void>
    update(id: string, data: Partial<T>): Promise<void>
    get(id: string): Promise<WithId<T>>
}

type DatabaseTableData = Record<string, string | number>

function isSqlNiceString(str: string) {
    return /^[a-z][a-z0-9_]*$/.test(str)
}

const alphanumericStr = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"


class DatabaseTable<T extends DatabaseTableData> implements IDatabaseTable<T> {
    private db: DB
    private idLength: number
    private dataKeys: Array<keyof T>
    private name: string
    private getQuery: PreparedQuery
    private generateId: () => string

    constructor(db: DB, tableName: string, data: T, options: {idLength?: number}) {
        this.db = db
        this.idLength = options.idLength ?? 4
        this.dataKeys = Object.keys(data) as Array<keyof T>
        this.name = tableName
        this.generateId = customAlphabet(alphanumericStr, this.idLength)

        assert(isSqlNiceString(tableName))
        assert(this.dataKeys.every(x => isSqlNiceString(x as string)))

        this.getQuery = db.prepareQuery(`SELECT ${this.dataKeys.join(", ")} FROM ${tableName} WHERE id = ?`)
    }

    create(data: T): Promise<WithId<T>> {
        const id = this.generateId()
        const insertEntries = Object.entries(data)
        const insertKeys = insertEntries.map(([key]) => key).join(", ")
        const insertValues = insertEntries.map(([_, value]) => value).join(", ")

        this.db.query(
            `INSERT INTO ${this.name} (${insertKeys}) VALUES (${insertValues})`
        )

        return this.get(data.id)
    }
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

    static insertUser(username: string, password: string, displayName: string): string {
        const id = Math.random().toString(36).substring(2)
        const passwordHash = scrypt.hash(password)

        this.db.query(
            `INSERT INTO users (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)`,
            [id, username, passwordHash, displayName]
        )
        log.info("Created user", id, username)

        return id
    }


    private static initializeMetadata() {
        this.db.execute(
            `CREATE TABLE IF NOT EXISTS db_meta (
                key TEXT PRIMARY KEY,
                value TEXT
            ) STRICT`
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
        const result = this.db.query<[string]>("SELECT value FROM db_meta WHERE key = ?", [key])
        return result[0]?.[0] ?? ""
    }

    private static setMetadata(key: string, value: string) {
        this.db.query(
            "INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)",
            [key, value]
        )
    }
}
