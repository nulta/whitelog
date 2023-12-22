// deno-lint-ignore-file no-extra-semi

// [DEBUG] placeholder replacement
addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG] Executing client-side placeholder replacement.")

    const replacementsText = {
        "site.root": "/",
        "site.lang": "ko",
        "site.name": "whitelog",
        "site.description": "Description of your awesome blog!",
        "site.ownerName": "nulta",

        // Post data
        "post.name": "글 이름",
        "post.author": "nulta",
        "post.time": "2023-10-27",
    }

    const replacementsHtml = {
        // Post data
        "post.content": "<p>Lorem ipsum dolor sit amet consectetur <em>adipisicing</em> elit. Ratione voluptates autem ut molestiae tenetur, adipisci quia velit obcaecati magnam laboriosam quaerat corporis dolor sint omnis deserunt. Quaerat delectus accusantium nobis.</p>".repeat(2),
    }

    const placeholderRegexText = /\{\{#([a-zA-Z0-9_.]+)\}\}/g
    const placeholderRegexHtml = /<<#([a-zA-Z0-9_.]+)>>/g
    const replaceAllText = (txt) => txt.replaceAll(placeholderRegexText, (orig, p1) => replacementsText[p1] || orig)
    const replaceAllHtml = (txt) => txt.replaceAll(placeholderRegexHtml, (orig, p1) => replacementsHtml[p1] || orig)

    const walker = document.createTreeWalker(
        document.documentElement,
        NodeFilter.SHOW_TEXT,
        node => node?.data?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
    )
    const textNodes = []
    while (walker.nextNode()) {textNodes.push(walker.currentNode)}

    for (const node of textNodes) {
        // Text replacement
        let newData = replaceAllText(node.data)
        if (node.data != newData) {
            node.data = newData
        }

        // HTML replacement
        newData = replaceAllHtml(node.data)
        if (node.data != newData) {
            const template = document.createElement("template")
            template.innerHTML = newData
            node.parentNode.insertBefore(template.content, node)
            node.parentNode.removeChild(node)
        }
    }

    // Element attribute replacements (only text)
    const elemNodes = document.querySelectorAll("*")
    for (const elem of elemNodes) {
        for (const attr of elem.attributes) {
            const newValue = replaceAllText(attr.value)
            if (newValue != attr.value) {
                attr.value = newValue
            }
        }
    }
})

// Add comment
;(()=>{
    const html = String.raw;

    function base64ToUint32Array(base64_string) {
        return new Uint32Array(
            Uint8Array.from(atob(base64_string), c => c.charCodeAt(0)).buffer
        )
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
        const textToken = token
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

        if (bits1.length == bits2.length && bits2.every((v, k) => v === bits1[k])) {
            return textToken
        } else {
            return false
        }
    }

    class CommentFormElement extends HTMLElement {
        constructor() {super()}

        connectedCallback() {
            this.innerHTML = html`
                <button class="add-comment">Add comment</button>
            `;

            this.querySelector("button")
                ?.addEventListener("mousedown", ev => {
                    ev.preventDefault()
                    this.openCommentBox()
                })
        }

        openCommentBox() {
            this.innerHTML = html`
                <form class="add-comment-box">
                    <label for="add-comment-box-name">Name</label>
                    <input tabindex="0" type="text" id="add-comment-box-name" name="nickname" placeholder="Anonymous 2513"/>
                    <label for="add-comment-box-url">Website/SNS</label>
                    <input tabindex="0" type="text" id="add-comment-box-url" name="url" placeholder="Not specified" />
                    <textarea placeholder="Add comment" name="comment" maxlength="500" autofocus></textarea>
                    <p class="status-display"></p>
                    <button name="submit">Submit</button>
                </form>
            `;

            const form = this.querySelector("form")
            const elems = form.elements

            const {nickname, url} = this.getUserData()
            elems.nickname.value = nickname
            elems.url.value = url

            elems["comment"].addEventListener("input", ev => {
                ev.target.style.height = undefined
                ev.target.style.height = ev.target.scrollHeight + "px"
            })

            form.addEventListener("submit", async ev => {
                ev.preventDefault()
                await this.submitComment()
            })
        }

        getUserData() {
            const nickname = localStorage.getItem("whitelog.comment.nickname") ?? ""
            const url = localStorage.getItem("whitelog.comment.url") ?? ""
            return {nickname, url}
        }

        saveUserData({nickname, url}) {
            localStorage.setItem("whitelog.comment.nickname", nickname)
            localStorage.setItem("whitelog.comment.url", url)
        }

        updateErrorText(text) {
            console.error("comment-form: ", text)
            const display = this.querySelector(".status-display")
            if (!display) { return }
            display.classList.value = "status-display error"
            display.innerText = text
        }

        updateStatusText(text) {
            console.log("comment-form: ", text)
            const display = this.querySelector(".status-display")
            if (!display) { return }
            display.classList.value = "status-display"
            display.innerText = text
        }

        async calculateChallenge() {
            // Is it locked?
            if (this.challengeValue) {
                return await this.challengeValue
            }

            // Lock
            let resolve, reject
            this.challengeValue = new Promise((res, rej) => {resolve = res; reject = rej})

            try {
                const timeStart = performance.now()
                console.log("calculateChallenge(): Fetching challenge API...")

                /** @type {ApiCommentChallenge} */
                const data = await fetch("/~api/comment/challenge")
                    .then(r => r.json())
                    .catch(e => ({"error": e.toString()}))

                if (data.error) {throw data.error}

                console.log("calculateChallenge(): Performing calculation...")

                // Array in range of (0x00 ~ 0xff), random ordered
                const randomPool = Array(0xff + 1).fill()
                    .map((_,k) => [k, Math.random()])
                    .sort((i,j) => i[1] - j[1])
                    .map(v => v[0])

                const hashU32 = base64ToUint32Array(data.pbkdf2Hash)
                const iterator = randomPool[Symbol.iterator]()
                const asyncChunks = 32
                let promises = []
                let answer = null
                let tries = 0

                // Find the answer
                while (!answer) {
                    tries++;
                    const {value, done} = iterator.next()

                    if (!done) {
                        const hexString = value.toString(16).padStart(2, "0")
                        const testToken = data.token.replace("??", hexString)
                        promises.push(verifyPbkdf2(hashU32, testToken, data.sign, data.pbkdf2Iter))
                    }

                    if (promises.length >= asyncChunks || done) {
                        const testResults = await Promise.all(promises)
                        promises = []
                        answer = testResults.find(Boolean)
                    }

                    if (done) { break }
                }

                // No possible answer?
                if (!answer) {
                    throw "No possible answer with challange"
                }

                console.log("calculateChallenge(): Found answer in", tries, "tries! (took", performance.now() - timeStart, "ms)")

                // Resolve with the answer
                const ret = {
                    challengeToken: answer,
                    challengeSign: data.sign,
                }

                resolve(ret)
                return ret
            } catch (e) {
                reject(e.toString())
                throw e.toString()
            } finally {
                this.challengeValue = undefined
            }
        }

        async submitComment() {
            const elems = this.querySelector("form")?.elements
            if (!elems) { throw new DOMException("form element does not exist") }

            this.updateStatusText("Calculating hash data...")
            const challengeData = await this.calculateChallenge().catch(v => null)
            if (!challengeData) {
                this.updateErrorText("Error: Failed to calculate hash")
                return false
            }

            const commentData = {
                ...challengeData,
                nickname: elems["nickname"].value ?? "",
                url: elems["url"].value ?? "",
                comment: elems["comment"].value ?? "",
            }

            this.updateStatusText("Sending comment...")
            console.log(commentData)
        }
    }

    customElements.define("comment-form", CommentFormElement)
})();



;(async()=>{
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
        console.assert(hashUint32Array.__proto__ == Uint32Array.prototype, "Invalid type of hashUint32Array")
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
    
    ;(async ()=>{
        const token = "00654c4e58-5a8f3eed-1b56-4e3c-b88f-c1753b6396bf"
        const sign = "WnEaaFyjOhOwU5IdJuTyA5renLb6n/U9QpUsss2qhvk="
        const iter = 20000
        const hash = await makePbkdf2(token, sign, iter).then(Uint32ArrayToBase64)
        console.log(JSON.stringify({
            token,
            sign,
            pbkdf2Hash: hash,
            pbkdf2Iter: iter,
        }, undefined, 4))
    })()
    
})();