import { DatabaseManager } from "server/managers/DatabaseManager.ts"
import { User, UserManager } from "server/managers/UserManager.ts"
import { PostDb, PostTagDb } from "server/models/Posts.ts"
import { TagDb } from "server/models/Tags.ts"
import { Logger } from "server/lib/logger.ts"

const log = new Logger("PostManager", "#f06d30")

export type Post = Readonly<{
    id: string
    path: string
    title: string
    subtitle: string | null
    content: string
    createdAt: Date
    updatedAt: Date | null
    author: User | null
    authorName: string | null
    posterImage: string | null

    tags: string[]
}>

type CreatePostData = {
    path: string,
    title: string,
    subtitle?: string | null,
    content: string,
    author: User,
    authorName?: string | null,
    posterImage?: string | null
}

// doing things the hard way
type PostDbRow = NonNullable<Awaited<ReturnType<PostDb["get"]>>>

export class PostManager {
    private static postDb: PostDb
    private static tagDb: TagDb
    private static postTagDb: PostTagDb

    public static initialize() {
        this.postDb = DatabaseManager.instantiate(PostDb)
        this.tagDb = DatabaseManager.instantiate(TagDb)
        this.postTagDb = DatabaseManager.instantiate(PostTagDb)
    }

    private static async rowToPost(row: PostDbRow): Promise<Post> {
        // TODO: use JOIN or something at the PostDb level
        const author = await UserManager.getUser(row.author_id)
        const tags = (await PostManager.postTagDb.getByPost(row.id)).map(x => x.tag_title)

        return {
            id: row.id,
            path: row.path,
            title: row.title,
            subtitle: row.subtitle,
            content: row.content,
            createdAt: new Date(row.created_at),
            updatedAt: row.updated_at ? new Date(row.updated_at) : null,
            author: author,
            authorName: row.author_name_override ?? null,
            posterImage: row.poster_image ?? null,

            tags: tags,
        }
    }

    public static async createPost(data: CreatePostData): Promise<Post> {
        const { title, subtitle, content, author, authorName, posterImage, path } = data

        const row = await this.postDb.insert({
            path,
            title,
            subtitle: subtitle ?? null,
            content,
            created_at: Date.now(),
            updated_at: null,
            author_id: author.id,
            author_name_override: authorName ?? null,
            poster_image: posterImage ?? null,
        })
        log.info("Created post '%s' - '%s'", row.id, title)

        return this.rowToPost(row)
    }

    public static async getPost(id: string): Promise<Post | null> {
        const post = await this.postDb.get(id)
        if (post == null) { return null }
        return this.rowToPost(post)
    }

    public static async getPostByPath(path: string): Promise<Post | null> {
        const post = await this.postDb.getByPath(path)
        if (post == null) { return null }
        return this.rowToPost(post)
    }

    public static async updatePost(id: string, data: Partial<CreatePostData>) {
        const { path, title, subtitle, content, author, authorName, posterImage } = data
        await this.postDb.update(id, {
            path,
            title,
            subtitle,
            content,
            updated_at: Date.now(),
            author_id: author?.id,
            author_name_override: authorName,
            poster_image: posterImage,
        })
    }

    public static async deletePost(id: string) {
        await this.postDb.delete(id)
    }

    public static async paginatePosts(limit: number, date: Date = new Date): Promise<Post[]> {
        const posts = await this.postDb.paginate(limit, date.getTime())
        return await Promise.all(posts.map(this.rowToPost))
    }


    public static async getAllTags() {
        return (await this.tagDb.getAll()).map(x => x.title)
    }

    public static async createTag(tagName: string) {
        return await this.tagDb.insert({title: tagName})
    }

    public static async deleteTag(tagName: string) {
        return await this.tagDb.delete(tagName)
    }

    public static async getByTag(tagName: string) {
        const postTags = await this.postTagDb.getByTag(tagName)
        return await Promise.all(postTags.map(x => this.getPost(x.post_id)))
    }

    public static async addTagToPost(post: Post, tagName: string) {
        await this.postTagDb.insert({ post_id: post.id, tag_title: tagName })
    }

    public static async removeTagFromPost(post: Post, tagName: string) {
        await this.postTagDb.delete({ post_id: post.id, tag_title: tagName })
    }
}
