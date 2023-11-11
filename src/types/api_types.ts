type ApiCommentChallenge_Error = {
    error: string
}

type ApiCommentChallenge_Data = {
    error: null,
    token: string,
    sign: string,
    pbkdf2_hash: string,
    pbkdf2_iter: number,
}


/** 
 * Response data of `GET /~api/comment/challenge`.
 */

declare type ApiCommentChallenge =
    ApiCommentChallenge_Error | ApiCommentChallenge_Data
