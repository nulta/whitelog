
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
        return Uint8Array.from(atob(base64_string), c => c.charCodeAt(0))
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
                    <button name="submit">Submit</button>
                    <p class="status-display"></p>
                </form>
            `;

            const form = this.querySelector("form")
            const elems = form.elements

            const {nickname, url} = this.getUserData()
            elems.nickname?.value = nickname
            elems.url?.value = url
            
            elems["comment"].addEventListener("input", ev => {
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
            display?.classList.value = "status-display error"
            display?.innerText = text
        }

        updateStatusText(text) {
            console.log("comment-form: ", text)
            const display = this.querySelector(".status-display")
            display?.classList.value = "status-display"
            display?.innerText = text
        }

        async calculateChallenge() {
            if (this.challengeValue) {
                return await this.challengeValue
            }

            let resolve, reject
            this.challengeValue = new Promise((res, rej) => {resolve = res; reject = rej})
            try {
                /** @type {ApiCommentChallenge} */
                const data = await fetch("/~api/comment/challenge")
                    .then(r => r.json())
                    .catch(e => ({"error": e.toString()}))
                if (data.error) {throw data.error}

                const hexPool = Array(0xff + 1).fill()
                    .map((_,k) => [k, Math.random()])
                    .sort((i,j) => i[1] - j[1])
                    .map(v => v[0].toString(16).padStart(2,"0"))
                
                const signU32 = base64ToUint32Array(data.sign)

                for (hex of hexPool) {
                    const testToken = data.token.replace("??", hex)
                    
                }

            } catch (e) {
                reject(e.toString())
            } finally {
                this.challengeValue = undefined
            }

        }

        async submitComment() {
            const elems = this.querySelector("form")?.elements
            if (!elems) { throw new DOMException("form element does not exist") }

            const commentData = {
                nickname: elems["nickname"].value ?? "",
                url: elems["url"].value ?? "",
                comment: elems["comment"].value ?? "",
            }

            console.log(commentData)
        }
    }

    customElements.define("comment-form", CommentFormElement)
})();