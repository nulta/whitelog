import { IdGenerator } from "server/lib/idgen.ts"
import { PreparedQuery, Row, RowObject, QueryParameterSet } from "sqlite"
import { assert } from "assert"

type OmitId<T> = Omit<T, "id">
type DatabaseTableData = Record<string, string | number | null>
function isSqlNiceString(str: string) {
    return /^[a-z][a-z0-9_]*$/.test(str)
}


export type { PreparedQuery }
export interface IDatabase {
    prepareQuery: <T extends Row, R extends RowObject, P extends QueryParameterSet>
        (query: string) => PreparedQuery<T, R, P>
    query: <R extends Row>(query: string, params: QueryParameterSet) => R[]
    transaction: (callback: () => void) => void
}

export class DatabaseController<T extends DatabaseTableData> {
    protected db: IDatabase
    private idGenerator: IdGenerator
    private existsQuery: PreparedQuery<[1], {[1]: 1}, [string]>
    private selectQuery: PreparedQuery<never, T, [string]>
    private deleteQuery: PreparedQuery<never, never, [string]>
    private insertQuery: PreparedQuery<never, never, T>

    protected readonly dataKeys: Readonly<string[]>
    protected readonly name: string
    protected readonly pkey: string

    constructor(db: IDatabase, tableName: string, options: {idLength?: number, pkey?: string}, data: T) {
        this.db = db
        this.dataKeys = Object.freeze(Object.keys(data))
        this.name = tableName
        this.idGenerator = new IdGenerator(options.idLength ?? 4)
        this.pkey = options.pkey ?? "id"

        assert(isSqlNiceString(tableName))
        assert(this.dataKeys.every(x => isSqlNiceString(x)))
        assert(this.dataKeys.includes(this.pkey))

        const dataKeysList = this.dataKeys.join(", ")
        const dataKeysPlaceholders = this.dataKeys.map(k => ":" + k).join(", ")

        this.existsQuery = db.prepareQuery(
            `SELECT 1 FROM ${tableName} WHERE ${this.pkey} = ?`
        )
        this.selectQuery = db.prepareQuery(
            `SELECT ${dataKeysList} FROM ${tableName} WHERE ${this.pkey} = ?`
        )
        this.deleteQuery = db.prepareQuery(
            `DELETE FROM ${this.name} WHERE ${this.pkey} = ?`
        )
        this.insertQuery = db.prepareQuery(
            `INSERT INTO ${this.name} (${dataKeysList}) VALUES (${dataKeysPlaceholders})`
        )
    }

    private assertData(data: OmitId<T>): asserts data is OmitId<T> {
        const dataKeySet = new Set(this.dataKeys)
        const givenKeySet = new Set(Object.keys(data))
        dataKeySet.delete("id")
        assert(dataKeySet.symmetricDifference(givenKeySet).size == 0)
    }

    private assertDataPartial(data: Partial<OmitId<T>>): asserts data is Partial<OmitId<T>> {
        const dataKeySet = new Set(this.dataKeys)
        const givenKeySet = new Set(Object.keys(data))
        dataKeySet.delete("id")
        assert(givenKeySet.isSubsetOf(dataKeySet))
    }


    async insert(data: OmitId<T>): Promise<T> {
        this.assertData(data)

        let insertData = data
        if (this.pkey == "id") {
            const id = this.idGenerator.generateUnique((id) => this.existsQuery.firstEntry([id]) != null)
            insertData = { ...data, id }
        }
        this.insertQuery.execute(insertData as T)

        const pk = insertData[this.pkey] as string
        const result = await this.get(pk)
        assert(result != null)

        return result
    }

    async get(pk: string): Promise<T | null> {
        const result = this.selectQuery.firstEntry([pk]) ?? null
        return await Promise.resolve(result)
    }

    async update(pk: string, data: Partial<OmitId<T>>): Promise<void> {
        this.assertDataPartial(data)

        const updateKeys = Object.keys(data)
        const updateString = updateKeys.map(key => `${key} = :${key}`).join(", ")

        this.db.query(
            `UPDATE ${this.name} SET ${updateString} WHERE ${this.pkey} = :id`,
            { ...data, id: pk }
        )

        return await Promise.resolve()
    }

    async delete(pk: string): Promise<void> {
        this.deleteQuery.execute([pk])
        return await Promise.resolve()
    }
}
