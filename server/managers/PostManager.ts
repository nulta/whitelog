import { DatabaseManager } from "server/managers/DatabaseManager.ts"
import { User, UserManager } from "server/managers/UserManager.ts"
import { PostDb } from "server/models/Posts.ts"
import { Logger } from "server/lib/logger.ts"

const log = new Logger("PostManager", "#f06d30")

export type Post = Readonly<{
    id: string
    title: string
    subtitle: string | null
    content: string
    createdAt: Date
    updatedAt: Date | null
    author: User
    authorName: string | null
}>

type CreatePostData = {
    title: string, subtitle?: string | null, content: string, author: User, authorName?: string | null
}

// doing things the hard way
type PostDbRow = NonNullable<Awaited<ReturnType<PostDb["get"]>>>

export class PostManager {
    private static postDb: PostDb

    public static initialize() {
        this.postDb = DatabaseManager.instantiate(PostDb)
    }

    private static async rowToPost(row: PostDbRow): Promise<Post> {
        // TODO: use JOIN or something at the PostDb level
        const author = await UserManager.getUser(row.author_id)
        return {
            id: row.id,
            title: row.title,
            subtitle: row.subtitle,
            content: row.content,
            createdAt: new Date(row.created_at),
            updatedAt: row.updated_at ? new Date(row.updated_at) : null,
            author: author,
            authorName: row.author_name_override ?? null,
        }
    }

    public static async createPost(data: CreatePostData): Promise<Post> {
        const { title, subtitle, content, author, authorName } = data

        const row = await this.postDb.insert({
            title: title,
            subtitle: subtitle ?? null,
            content: content,
            created_at: Date.now(),
            updated_at: null,
            author_id: author.id,
            author_name_override: authorName ?? null,
        })
        log.info("Created post '%s' - '%s'", row.id, title)

        return this.rowToPost(row)
    }

    public static async getPost(id: string): Promise<Post | null> {
        const post = await this.postDb.get(id)
        if (post == null) { return null }
        return this.rowToPost(post)
    }

    public static async updatePost(id: string, data: Partial<CreatePostData>) {
        const { title, subtitle, content, author, authorName } = data
        await this.postDb.update(id, {
            title: title,
            subtitle: subtitle,
            content: content,
            updated_at: Date.now(),
            author_id: author?.id,
            author_name_override: authorName,
        })
    }

    public static async deletePost(id: string) {
        await this.postDb.delete(id)
    }

    public static async paginatePosts(limit: number, date: Date = new Date): Promise<Post[]> {
        const posts = await this.postDb.paginate(limit, date.getTime())
        return await Promise.all(posts.map(this.rowToPost))
    }
}
