
// [DEBUG] placeholder replacement
addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG] Executing client-side placeholder replacement.")

    const replacements = {
        "site.root": "/",
        "site.lang": "ko",
        "site.name": "whitelog",
        "site.description": "Description of your awesome blog!",
        "site.ownerName": "nulta",
        
        // Post data
        "post.name": "글 이름",
        "post.content": "<p>Lorem ipsum dolor sit amet consectetur <em>adipisicing</em> elit. Ratione voluptates autem ut molestiae tenetur, adipisci quia velit obcaecati magnam laboriosam quaerat corporis dolor sint omnis deserunt. Quaerat delectus accusantium nobis.</p>".repeat(2),
        "post.author": "nulta",
        "post.time": "2023-10-27",
    }

    const placeholderRegex = /\{\{#([a-zA-Z0-9_.]+)\}\}/g
    const replaceAll = (txt) => txt.replaceAll(placeholderRegex, (orig, p1) => replacements[p1] || orig)

    document.documentElement.lang = replaceAll(document.body.lang)

    const walker = document.createTreeWalker(
        document.documentElement,
        NodeFilter.SHOW_TEXT,
        node => !!node.data?.trim()
    )
    const textNodes = []
    while (walker.nextNode()) {textNodes.push(walker.currentNode)}

    for (node of textNodes) {
        const newData = replaceAll(node.data)
        if (node.data != newData) {
            const template = document.createElement("template")
            template.innerHTML = newData
            node.parentNode.insertBefore(template.content, node)
            node.parentNode.removeChild(node)
        }
    }
})


// Add comment
addEventListener("DOMContentLoaded", () => {
    const addCommentButton = document.querySelectorAll("article button.add-comment")
    if (!addCommentButton) { return }

    addCommentButton.forEach((v) => {
        v.addEventListener("click", (ev) => {
            /** @type {HTMLButtonElement} */
            const target = ev.target
            
            document.createElement()
        })
    })
})

addEventListener("DOMContentLoaded", () => {
    const textareas = document.querySelectorAll("textarea[data-autosize]")
    textareas.forEach((elem) => {
        elem.addEventListener("input", (ev) => {
            ev.target.style.height = ev.target.scrollHeight + "px"
        })
    })
})
