const html = String.raw

export class WlNotificationBox extends HTMLElement {
    #html = html`
        <link rel="stylesheet" href="/assets/css/index.css">
        <div class="notification-box">
            <slot name="content"></slot>
        </div>
    `

    /** @type {number} */
    #timer;
    /** @type {ShadowRoot} */
    #root;
    /** @type {boolean} */
    #ended = false;

    constructor() {
        super()
        this.#root = this.attachShadow({mode: "open"})
        this.#root.innerHTML = this.#html
    }

    fadeOut() {
        if (this.#ended) { return }
        this.#ended = true

        const noti = this.#root.querySelector("div.notification-box")
        const anim = noti.animate({
            opacity: [1, 0],
            transform: ["translateX(0)", "translateX(100px)"],
            easing: ["ease-out"],
        }, { duration: 250, fill: "forwards" })

        anim.onfinish = () => {
            this.remove()
        }
    }

    fadeIn() {
        if (this.#ended) { return }

        const noti = this.#root.querySelector("div.notification-box")
        noti.animate({
            opacity: [0, 1],
            transform: ["translateX(100px)", "translateX(0)"],
            easing: ["ease-out"],
        }, { duration: 250, fill: "forwards" })
    }

    updateElement() {
        if (this.#ended) { return }

        /** @type {"info" | "warn" | "error"} */
        const type = this.getAttribute("type") ?? "info"
        const time = parseInt(this.getAttribute("time") ?? "5")
        const noti = this.#root.querySelector("div.notification-box")

        if (this.#timer != undefined) {
            clearTimeout(this.#timer)
        }
        this.#timer = setTimeout(() => { this.fadeOut() }, time * 1000)

        noti.querySelector("slot[name=content]").innerHTML = this.innerHTML
        if (!noti.classList.contains(type)) {
            noti.classList.remove("info", "warn", "error")
            noti.classList.add(type)
        }
    }

    static get observedAttributes() {
        return ["type", "time"]
    }

    connectedCallback() {
        this.updateElement()
        this.fadeIn()
    }

    attributeChangedCallback(name, oldValue, newValue) {
        this.updateElement()
    }
}
customElements.define("wl-notification-box", WlNotificationBox)
