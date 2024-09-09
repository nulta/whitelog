// 00000-00000: Initial database structure

// * History file contains a snapshot of the database structure at a specific point in time.
// * History files are named with the following format:
// *   {id[0..5]}-{id[5..10]}.ts
// * For timestamp, Unix timestamp is recommended because it is timezone-agnostic by definition.

const sql = (x: TemplateStringsArray) => x.raw[0]

export const id = "00000-00000"

export const command = sql`
    CREATE TABLE posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        author_name_override TEXT
    ) STRICT;

    CREATE TABLE comments (
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        nickname TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        reply_to TEXT REFERENCES comments(id) ON DELETE CASCADE
    ) STRICT;

    CREATE TABLE tags (
        title TEXT PRIMARY KEY
    ) STRICT, WITHOUT ROWID;

    CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL
    ) STRICT;

    CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE invites (
        code TEXT PRIMARY KEY,
        uses INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        created_by TEXT REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER
    ) STRICT;

    CREATE TABLE invite_uses (
        invite_code TEXT NOT NULL REFERENCES invites(code) ON DELETE CASCADE,
        used_by TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        used_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE post_tags (
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        tag_title TEXT NOT NULL REFERENCES tags(title) ON DELETE CASCADE ON UPDATE CASCADE,
        PRIMARY KEY (post_id, tag_title)
    ) STRICT;

    CREATE TABLE post_links (
        from_post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        to_post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        PRIMARY KEY (from_post_id, to_post_id)
    ) STRICT;

    CREATE INDEX idx_user_username ON users(username);
    CREATE INDEX idx_post_author_id ON posts(author_id);
    CREATE INDEX idx_post_created_at ON posts(created_at);
    CREATE INDEX idx_comment_post_id ON comments(post_id);
`
