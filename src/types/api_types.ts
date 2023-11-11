type ApiCommentChallenge_Error = {
    error: string
}

type ApiCommentChallenge_Data = {
    error: null,
    token: string,
    sign: string,
    pbkdf2Hash: string,
    pbkdf2Iter: number,
}


/** 
 * Response data of `GET /~api/comment/challenge`.
 */

declare type ApiCommentChallenge =
    ApiCommentChallenge_Error | ApiCommentChallenge_Data
