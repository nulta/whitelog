
# Proof-of-work based spam reduction on blog commenting

1. GET /~api/comment/challenge

-> {
    // 서버에서 발급한 랜덤 토큰 값 (뒷 2글자 잘림)
    // (Unix 타임스탬프 유효기간) + "-" + (랜덤UUID)
    // 유효기간은 +1분이며, 10글자짜리 16진수로 나타냄.
    token: "00654c4e58-5a8f3eed-1b56-4e3c-b88f-c1753b6396??",

    // 잘리기 전 token 값의 HMAC 해시 (Base64)
    sign: "WnEaaFyjOhOwU5IdJuTyA5renLb6n/U9QpUsss2qhvk=",

    // PBKDF2-SHA256-128bit
    // {pw: token, salt: sign, iter: pbkdf2_iterations}
    pbkdf2_hash: "rb87MWdTSzAgsC2+KCzNUQ==",
    
    // 난이도와 비례. 난이도 값은 IP의 신뢰도에 따라 달라짐.
    // ex) 해외 IP, VPN, 공용 IP, 데이터센터 등은 더 높은 난이도.
    pbkdf2_iter: 10000,
}

2. client는 uuid를 무작위 대입하며 체크섬을 검증 (평균 128번쯤)...

3. client는 comment를 남길 때 이하 정보를 포함

-> {
    challenge_token: "00654c4e58-5a8f3eed-1b56-4e3c-b88f-c1753b6396bf",
    challenge_sign: "8dPiQ78GHRlYRqrJ4dw4ML9Tm7hUTtOh1bYsunb4iRE=",
}

4. server는 challenge token의 유효 기간과 challenge_sign을 검증.


## Reference code
```js
function base64ToUint32Array(base64_string) {
    return Uint8Array.from(atob(base64_string), c => c.charCodeAt(0))
}

async function Uint32ArrayToBase64(u32) {
    const buffer = u32.buffer
    const base64url = await new Promise(r => {
        const reader = new FileReader()
        reader.onload = () => r(reader.result)
        reader.readAsDataURL(new Blob([buffer]))
    });
    return base64url.slice(base64url.indexOf(',') + 1);
}

async function makePbkdf2(token, salt, iterations) {
    const encoder = new TextEncoder
    token = encoder.encode(token)
    salt = encoder.encode(salt)

    const bits2 = await crypto.subtle
        .importKey("raw", token, { name: "PBKDF2" }, false, ["deriveBits"])
        .then(baseKey =>
            crypto.subtle.deriveBits(
                { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
                baseKey,
                128
            )
        ).then(arraybuffer => new Uint32Array(arraybuffer))

    return bits2
}

/** 
 * Verify the 128bit sha256 pbkdf2 token with given params.
 * This function should NOT be used on important security applications.
 * 
 * @param {Uint32Array} hashUint32Array
 * @param {string} token
 * @param {string} salt
 * @param {number} iterations 
 */
async function verifyPbkdf2(hashUint32Array, token, salt, iterations) {
    const encoder = new TextEncoder
    token = encoder.encode(token)
    salt = encoder.encode(salt)

    const bits1 = hashUint32Array
    const bits2 = await crypto.subtle
        .importKey("raw", token, { name: "PBKDF2" }, false, ["deriveBits"])
        .then(baseKey =>
            crypto.subtle.deriveBits(
                { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
                baseKey,
                128
            )
        ).then(arraybuffer => new Uint32Array(arraybuffer))
    
    return (bits1.length == bits2.length) && bits2.every((v, k) => v === bits1[k])
}

```