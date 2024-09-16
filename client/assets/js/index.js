import "./components.js"

export class wl {
    /**
     * Initialize the whitelog system
     */
    static initialize() {
        // Handle the history navigation
        window.addEventListener("popstate", (e) => {
            wl.#loadPage(window.location.pathname)
        })

        // Hijack the internal hyperlinks
        window.addEventListener("click", (e) => {
            const target = e.target.closest("a")
            if (!target) { return }
            if (target.origin != window.location.origin) { return }

            e.preventDefault()
            wl.navigate(target.pathname)
            e.target.blur()
        })
    }

    /**
     * Get the user data
     * @returns {User | null}
     */
    static getUser() {
        const item = localStorage.getItem('user')
        if (!item) return null
        return JSON.parse(item)
    }

    /**
     * Show the notification message on the screen
     * @param {string} message
     * @param {"info" | "warn" | "error"} type
     * @param {number?} time
     */
    static notify(message, type="info", time=5) {
        const noti = document.createElement("wl-notification-box")
        noti.setAttribute("type", type)
        noti.setAttribute("time", time.toString())
        noti.innerHTML = message

        let container = document.querySelector("#wl-notification-container")
        if (!container) {
            container = document.createElement("div")
            container.id = "wl-notification-container"
            document.body.appendChild(container)
        }

        container.appendChild(noti)
    }

    static #ongoingNavigation = null
    static async #loadPage(path) {
        console.info(`Navigation: Navigating to ${path}`)

        if (wl.#ongoingNavigation) {
            wl.#ongoingNavigation.abort()
        }

        const abort = new AbortController()
        wl.#ongoingNavigation = abort
        
        let page, html
        try {
            page = await fetch(path, {signal: abort.signal})
            html = await page.text()
            abort.signal.throwIfAborted()
        } catch (e) {
            if (e.name === "AbortError") {
                console.info(`Navigation: Navigation to ${path} was aborted`)
            } else {
                console.error(e)
            }
            return
        } finally {
            wl.#ongoingNavigation = null
        }

        try {
            const newDoc = new DOMParser().parseFromString(html, "text/html")
            const newHead = newDoc.querySelector("head")
            const newBody = newDoc.querySelector("body")

            document.body.querySelector("main").innerHTML = newBody.querySelector("main").innerHTML
            document.head.innerHTML = newHead.innerHTML
        } catch (e) {
            console.warn("Navigation: Failed to load structured HTML document. Preparing fallback!")
            location.assign(location.href)
            return
        }
    }

    /**
     * Navigate to the specified path in SPA-like manner.
     * @param {string} path
     */
    static async navigate(path) {
        window.history.pushState({}, "", path)
        await wl.#loadPage(path)
    }
}

globalThis.wl = wl
wl.initialize()
