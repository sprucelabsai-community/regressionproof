import fs from 'fs'
import path from 'path'
import sqlite3 from 'sqlite3'
import { Db } from './types'

export function openDb(dbPath: string): Db {
    const dir = path.dirname(dbPath)
    fs.mkdirSync(dir, { recursive: true })

    const db = new sqlite3.Database(dbPath)

    const exec = (sql: string) =>
        new Promise<void>((resolve, reject) => {
            db.exec(sql, (err) => (err ? reject(err) : resolve()))
        })

    const run = (sql: string, params: unknown[] = []) =>
        new Promise<void>((resolve, reject) => {
            db.run(sql, params, (err) => (err ? reject(err) : resolve()))
        })

    const get = <T>(sql: string, params: unknown[] = []) =>
        new Promise<T | undefined>((resolve, reject) => {
            db.get(sql, params, (err, row) =>
                err ? reject(err) : resolve(row as T | undefined)
            )
        })

    const all = <T>(sql: string, params: unknown[] = []) =>
        new Promise<T[]>((resolve, reject) => {
            db.all(sql, params, (err, rows) =>
                err ? reject(err) : resolve(rows as T[])
            )
        })

    void exec(`
        CREATE TABLE IF NOT EXISTS invites (
            token_hash TEXT PRIMARY KEY,
            project_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            used_at TEXT,
            revoked_at TEXT,
            note TEXT
        );
        CREATE INDEX IF NOT EXISTS invites_project_name ON invites(project_name);
    `)

    return { exec, run, get, all }
}
