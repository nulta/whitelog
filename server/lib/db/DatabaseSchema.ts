type TableDefinition = Readonly<Record<string, ColumnDef<ColumnType>>>

type ColumnType = "text" | "int" | "real" | "blob"
type ForeignKeyAction = "setNull" | "setDefault" | "cascade" | "restrict" | "noAction"
type ColumnDefKeys = "primaryKey" | "defaultValue" | "notNull"
type ForeignColumnDefKeys = ColumnDefKeys | "refOnDelete" | "refOnUpdate" | "references"

class ColumnDef<T extends ColumnType> {
    readonly type: T
    readonly primaryKey: boolean
    readonly notNull: boolean
    readonly references: `${string}(${string})` | null
    readonly refOnDelete: ForeignKeyAction | null
    readonly refOnUpdate: ForeignKeyAction | null
    readonly defaultValue: (T extends "int" | "real" ? number : string) | null

    constructor(type: T, param: Partial<Pick<ColumnDef<T>, ColumnDefKeys>>) {
        this.type = type
        this.primaryKey = param.primaryKey ?? false
        this.notNull = param.notNull ?? false
        this.defaultValue = param.defaultValue ?? null
        this.references = null
        this.refOnDelete = null
        this.refOnUpdate = null
    }


    get Primary() {
        return new ColumnDef(this.type, { ...this, primaryKey: true })
    }

    get NotNull() {
        return new ColumnDef(this.type, { ...this, notNull: true })
    }

    References(tblName: string, colName: string) {
        return new ForeignColumnDef(this.type, { ...this, references: `${tblName}(${colName})` })
    }

    DefaultsTo<U>(value: T extends "int" ? IntLiteral<U> : (T extends "real" ? number : string)) {
        return new ColumnDef(this.type, { ...this, defaultValue: value })
    }
}


class ForeignColumnDef<T extends ColumnType> extends ColumnDef<T> {
    readonly references: `${string}(${string})`
    readonly refOnDelete: ForeignKeyAction | null
    readonly refOnUpdate: ForeignKeyAction | null

    constructor(
        type: T,
        param: Partial<Pick<ColumnDef<T>, ForeignColumnDefKeys>> & Pick<ForeignColumnDef<T>, "references">
    ) {
        super(type, param)
        this.references = param.references
        this.refOnDelete = param.refOnDelete ?? "noAction"
        this.refOnUpdate = param.refOnUpdate ?? "noAction"
    }


    get Primary() {
        return new ForeignColumnDef(this.type, { ...this, primaryKey: true })
    }

    get NotNull() {
        return new ForeignColumnDef(this.type, { ...this, notNull: true })
    }

    References(): never {
        throw new Error("Tried to reference a column that is already referencing another column")
    }

    DefaultsTo(): never {
        throw new Error("Tried to set a default value of foreign column")
    }

    OnDelete(action: ForeignKeyAction) {
        return new ForeignColumnDef(this.type, { ...this, refOnDelete: action })
    }

    OnUpdate(action: ForeignKeyAction) {
        return new ForeignColumnDef(this.type, { ...this, refOnUpdate: action })
    }
}

type IntLiteral<T> = T extends number
    ? `${T}` extends `${number}.${number}`
        ? never
        : T
    : never


export type DatabaseSchema = Readonly<Record<string, TableDefinition>>

export const Text = new ColumnDef("text", {})
export const Int = new ColumnDef("int", {})
export const Real = new ColumnDef("real", {})
export const Blob = new ColumnDef("blob", {})


;(() => {
    // Test code
    const _test: DatabaseSchema = {
        users: {
            id: Text.Primary,
            username: Text,
            password_hash: Text.NotNull,
            display_name: Text.NotNull,
        },
        posts: {
            id: Text.Primary,
            title: Text.NotNull,
            subtitle: Text.NotNull.DefaultsTo(""),
            content: Text.NotNull,
            created_at: Int.NotNull,
            updated_at: Int,
            author_id: Text.References("users", "id").OnDelete("setNull"),
            author_name_override: Text,
        },
    }
})()
