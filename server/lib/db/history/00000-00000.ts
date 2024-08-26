// 00000-00000: Initial database structure

// * History file contains a snapshot of the database structure at a specific point in time.
// * History files are named with the following format:
// *   {id[0..5]}-{id[5..10]}.ts
// * For timestamp, Unix timestamp is recommended because it is timezone-agnostic by definition.

import { DatabaseSchema, Int, Text } from "server/lib/db/DatabaseSchema.ts"

export const schema: DatabaseSchema = {
    posts: {
        id: Text.Primary,
        title: Text.NotNull,
        subtitle: Text.NotNull.DefaultsTo(""),
        content: Text.NotNull,
        created_at: Int.NotNull,
        updated_at: Int,
        author_id: Text.References("authors", "id").OnDelete("setNull"),
        author_name_override: Text,
    },

    comments: {
        id: Text.Primary,
        post_id: Text.NotNull.References("posts", "id").OnDelete("cascade"),
        content: Text.NotNull,
        nickname: Text.NotNull,
        created_at: Int.NotNull,
        updated_at: Int,
        reply_to: Text.References("comments", "id").OnDelete("cascade"),
    },

    tags: {
        title: Text.Primary,
    },

    authors: {
        id: Text.Primary,
        username: Text.NotNull,
        password_hash: Text.NotNull,
        display_name: Text.NotNull,
    },

    post_tags: {
        post_id: Text.NotNull.References("posts", "id").OnDelete("cascade"),
        tag_title: Text.NotNull.References("tags", "title").OnDelete("cascade").OnUpdate("cascade"),
    },

    post_links: {
        from_post_id: Text.NotNull.References("posts", "id").OnDelete("cascade"),
        to_post_id: Text.NotNull.References("posts", "id").OnDelete("cascade"),
    },
}
