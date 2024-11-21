import { DatabaseController, IDatabase, PreparedQuery } from "server/models/DatabaseController.ts"

type Post = {
    id: string
    path: string
    title: string
    subtitle: string | null
    content: string
    created_at: number
    updated_at: number | null
    author_id: string
    author_name_override: string | null
    poster_image: string | null
}

export class PostDb extends DatabaseController<Post> {
    private paginateQuery: PreparedQuery<[], Post, [number, number]>
    private getByPathQuery: PreparedQuery<[], Post, [string]>

    constructor(db: IDatabase) {
        super(db, "posts", { idLength: 5 }, {
            id: "",
            path: "",
            title: "",
            subtitle: "",
            content: "",
            created_at: 0,
            updated_at: 0,
            author_id: "",
            author_name_override: "",
            poster_image: "",
        })

        this.paginateQuery = db.prepareQuery(
            `SELECT ${this.dataKeys.join(", ")} FROM posts
                WHERE created_at < ?
                ORDER BY created_at DESC
                LIMIT ?
            `
        )

        this.getByPathQuery = db.prepareQuery(
            `SELECT ${this.dataKeys.join(", ")} FROM posts
                WHERE path = ?
            `
        )
    }

    async paginate(limit: number, beforeDate: number): Promise<Post[]> {
        const result = this.paginateQuery.allEntries([beforeDate, limit])
        return await Promise.resolve(result)
    }

    async getByPath(path: string): Promise<Post | null> {
        const result = this.getByPathQuery.firstEntry([path])
        return await Promise.resolve(result ?? null)
    }
}


type PostTag = {
    post_id: string
    tag_title: string
}

export class PostTagDb {
    private db: IDatabase
    private insertQuery: PreparedQuery<never, never, PostTag>
    private deleteQuery: PreparedQuery<never, never, PostTag>
    private deleteByPostQuery: PreparedQuery<never, never, [string]>
    private selectByPostQuery: PreparedQuery<[], PostTag, [string]>
    private selectByTagQuery: PreparedQuery<[], PostTag, [string]>

    constructor(db: IDatabase) {
        this.insertQuery = db.prepareQuery(
            `INSERT INTO post_tags (post_id, tag_title)
            VALUES (:post_id, :tag_title)`
        )
        this.deleteQuery = db.prepareQuery(
            `DELETE FROM post_tags WHERE post_id = :post_id AND tag_title = :tag_title`
        )
        this.deleteByPostQuery = db.prepareQuery(
            `DELETE FROM post_tags WHERE post_id = ?`
        )
        this.selectByPostQuery = db.prepareQuery(
            `SELECT * FROM post_tags WHERE post_id = ?`
        )
        this.selectByTagQuery = db.prepareQuery(
            `SELECT * FROM post_tags WHERE tag_title = ?`
        )
        this.db = db
    }

    async insert(data: PostTag): Promise<void> {
        this.insertQuery.execute(data)
        return await Promise.resolve()
    }

    async delete(data: PostTag): Promise<void> {
        this.deleteQuery.execute(data)
        return await Promise.resolve()
    }

    async deleteAllByPost(postId: string): Promise<void> {
        this.deleteByPostQuery.execute([postId])
        return await Promise.resolve()
    }

    async getByPost(postId: string): Promise<PostTag[]> {
        const result = this.selectByPostQuery.allEntries([postId])
        return await Promise.resolve(result)
    }

    async getByTag(tagTitle: string): Promise<PostTag[]> {
        const result = this.selectByTagQuery.allEntries([tagTitle])
        return await Promise.resolve(result)
    }

    async repopulateTags(postId: string, tags: string[]): Promise<void> {
        this.db.transaction(() => {
            this.deleteAllByPost(postId)
            for (const tag of tags) {
                this.insert({ post_id: postId, tag_title: tag })
            }
        })
        return await Promise.resolve()
    }
}


type PostLink = {
    from_post_id: string
    to_post_id: string
}

export class PostLinkDb {
    private db: IDatabase
    private insertQuery: PreparedQuery<never, never, PostLink>
    private deleteQuery: PreparedQuery<never, never, PostLink>
    private deleteFromPostQuery: PreparedQuery<never, never, [string]>
    private selectFromPostQuery: PreparedQuery<[], PostLink, [string]>
    private selectToPostQuery: PreparedQuery<[], PostLink, [string]>

    constructor(db: IDatabase) {
        this.insertQuery = db.prepareQuery(
            `INSERT INTO post_links (from_post_id, to_post_id)
            VALUES (:from_post_id, :to_post_id)`
        )
        this.deleteQuery = db.prepareQuery(
            `DELETE FROM post_links WHERE from_post_id = :from_post_id AND to_post_id = :to_post_id`
        )
        this.deleteFromPostQuery = db.prepareQuery(
            `DELETE FROM post_links WHERE from_post_id = ?`
        )
        this.selectFromPostQuery = db.prepareQuery(
            `SELECT * FROM post_links WHERE from_post_id = ?`
        )
        this.selectToPostQuery = db.prepareQuery(
            `SELECT * FROM post_links WHERE to_post_id = ?`
        )
        this.db = db
    }

    async insert(data: PostLink): Promise<void> {
        this.insertQuery.execute(data)
        return await Promise.resolve()
    }

    async delete(data: PostLink): Promise<void> {
        this.deleteQuery.execute(data)
        return await Promise.resolve()
    }

    async deleteOutgoingLinks(postId: string): Promise<void> {
        this.deleteFromPostQuery.execute([postId])
        return await Promise.resolve()
    }

    async getOutgoingLinks(postId: string): Promise<PostLink[]> {
        const result = this.selectFromPostQuery.allEntries([postId])
        return await Promise.resolve(result)
    }

    async getInboundLinks(postId: string): Promise<PostLink[]> {
        const result = this.selectToPostQuery.allEntries([postId])
        return await Promise.resolve(result)
    }

    async repopulateOutgoingLinks(postId: string, links: string[]): Promise<void> {
        this.db.transaction(() => {
            this.deleteOutgoingLinks(postId)
            for (const link of links) {
                this.insert({ from_post_id: postId, to_post_id: link })
            }
        })
        return await Promise.resolve()
    }
}
