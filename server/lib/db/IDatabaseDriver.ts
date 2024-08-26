type Row = Record<string | number, never>
type Rows = Row[]

export interface IDatabaseDriver {
    selectOne: (sql: string, params?: (string | number)[]) => Promise<Row>
}
