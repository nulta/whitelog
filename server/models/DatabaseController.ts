import { IdGenerator } from "server/lib/idgen.ts"
import { DB, PreparedQuery } from "sqlite"
import { assert } from "assert"
export { DB } from "sqlite"

type WithId<T> = T & {id: string}

type DatabaseTableData = Record<string, string | number | null>

function isSqlNiceString(str: string) {
    return /^[a-z][a-z0-9_]*$/.test(str)
}


export interface IDatabaseController<T extends DatabaseTableData> {
    create(data: T): Promise<WithId<T>>
    get(id: string): Promise<WithId<T>>
    update(id: string, data: Partial<T>): Promise<void>
    delete(id: string): Promise<void>
}

export class DatabaseController<T extends DatabaseTableData> implements IDatabaseController<T> {
    private db: DB
    private idGenerator: IdGenerator
    private existsQuery: PreparedQuery
    private getQuery: PreparedQuery
    private deleteQuery: PreparedQuery

    private readonly dataKeys: Readonly<Array<keyof T>>
    private readonly name: string

    constructor(db: DB, tableName: string, options: {idLength?: number}, data: T) {
        this.db = db
        this.dataKeys = Object.freeze(Object.keys(data) as Array<keyof T>)
        this.name = tableName
        this.idGenerator = new IdGenerator(options.idLength ?? 4)

        assert(isSqlNiceString(tableName))
        assert(this.dataKeys.every(x => isSqlNiceString(x as string)))

        this.existsQuery = db.prepareQuery(`SELECT 1 FROM ${tableName} WHERE id = ?`)
        this.getQuery = db.prepareQuery(`SELECT ${this.dataKeys.join(", ")} FROM ${tableName} WHERE id = ?`)
        this.deleteQuery = db.prepareQuery(`DELETE FROM ${this.name} WHERE id = ?`)
    }
    
    private doesIdExist = (id: string) => { return this.existsQuery.firstEntry([id]) != null }

    async create(data: T): Promise<WithId<T>> {
        const id = this.idGenerator.generateUnique(this.doesIdExist)
        const insertEntries = Object.entries(data)
        const insertKeys = insertEntries.map(([key]) => key).join(", ")
        const insertValues = insertEntries.map(([_, value]) => value).join(", ")

        this.db.query(
            `INSERT INTO ${this.name} (${insertKeys}) VALUES (${insertValues})`
        )

        return await this.get(id)
    }

    async get(id: string): Promise<WithId<T>> {
        const result = this.getQuery.firstEntry([id])
        return await Promise.resolve(result as WithId<T>)
    }

    async update(id: string, data: Partial<T>): Promise<void> {
        const updateKeys = Object.keys(data)
        const updateString = updateKeys.map(key => `${key} = :${key}`).join(", ")

        const dataKeySet = new Set(this.dataKeys)
        assert(updateKeys.every(key => dataKeySet.has(key)))

        this.db.query(
            `UPDATE ${this.name} SET ${updateString} WHERE id = :id`,
            { ...data, id }
        )

        return await Promise.resolve()
    }

    async delete(id: string): Promise<void> {
        this.deleteQuery.execute([id])
        return await Promise.resolve()
    }
}
