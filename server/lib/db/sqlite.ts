import { DB } from "sqlite"

export const db = new DB("whitelog.db")

const sql = (x: TemplateStringsArray) => x.raw[0]

db.execute(sql`
    CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL DEFAULT "",
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        author_id TEXT REFERENCES authors(id) ON DELETE SET NULL,
        author_name_override TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS comments (
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        nickname TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        reply_to TEXT REFERENCES comments(id) ON DELETE CASCADE
    ) STRICT;

    CREATE TABLE IF NOT EXISTS tags (
        title TEXT PRIMARY KEY
    ) STRICT, WITHOUT ROWID;

    CREATE TABLE IF NOT EXISTS authors (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
    ) STRICT;

    CREATE TABLE IF NOT EXISTS post_tags (
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        tag_title TEXT NOT NULL REFERENCES tags(title) ON DELETE CASCADE ON UPDATE CASCADE
    ) STRICT;

    CREATE TABLE IF NOT EXISTS post_links (
        from_post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        to_post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE
    ) STRICT;
`)

