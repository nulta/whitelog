import type { User as _User } from "../../../server/managers/UserManager.ts"
import type { Post as _Post } from "../../../server/managers/PostManager.ts"

declare global {
    type User = _User
    type Post = _Post
}
