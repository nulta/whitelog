export type IDatabaseSchema = Readonly<Record<string, TableDefinition>>

type TableDefinition = Readonly<Record<string, ColumnDef>>


type ColumnTypes = "text" | "int" | "real" | "blob"

type ColumnModifier =
    | " not null"
    | ` default ${string}`
    | " primary key"
    | " unique"

type ForeignKeyModifier =
    | `${(" on update cascade" | " on update set null" | "")}${(" on delete cascade" | " on delete set null" | "")}`

type ForeignKeyReferences = ` references ${string}(${string})${ForeignKeyModifier}` | ""


type ColumnModifiers =
    | ""
    | ColumnModifier
    | `${ColumnModifier}${ColumnModifier}`
    | `${ColumnModifier}${ColumnModifier}${ColumnModifier}`
    | `${ColumnModifier}${ColumnModifier}${ColumnModifier}${ColumnModifier}`

type ColumnDef = `${ColumnTypes}${ColumnModifiers}${ForeignKeyReferences}`


;(() => {
    const _test: IDatabaseSchema = {
        users: {
            id: "text primary key",
            username: "text",
            password_hash: "text not null",
            display_name: "text not null",
        },
        posts: {
            id: "text primary key",
            title: "text not null",
            subtitle: "text not null default ''",
            content: "text not null",
            created_at: "int not null",
            updated_at: "int",
            author_id: "text references users(id) on delete set null",
            author_name_override: "text",
        },
    }
})()
