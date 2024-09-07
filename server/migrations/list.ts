type MigrationFile = {
    readonly id: `${number}-${number}`,
    readonly command: string,
}

export const list: MigrationFile[] = await Promise.all([
    import("./00000-00000.ts"),
])
