export interface Db {
    exec(sql: string): Promise<void>
    run(sql: string, params?: unknown[]): Promise<void>
    get<T>(sql: string, params?: unknown[]): Promise<T | undefined>
    all<T>(sql: string, params?: unknown[]): Promise<T[]>
}
