addEventListener("load", () => {
    console.log("[DEBUG] Executing client-side placeholder replacement.")

    const replacements = {
        "site.root": "/",
        "site.lang": "ko",
        "site.name": "whitelog",
        "site.description": "Description of your awesome blog!",
        "site.ownerName": "nulta",
        
        // Post data
        "post.name": "글 이름",
        "post.content": "<p>Lorem ipsum dolor sit amet consectetur <em>adipisicing</em> elit. Ratione voluptates autem ut molestiae tenetur, adipisci quia velit obcaecati magnam laboriosam quaerat corporis dolor sint omnis deserunt. Quaerat delectus accusantium nobis.</p>",
        "post.author": "nulta",
        "post.time": "2023-10-27",
    }

    const placeholderRegex = /\{\{#([a-zA-Z0-9_.]+)\}\}/g
    const innerHtml = document.documentElement.innerHTML
    document.documentElement.innerHTML = innerHtml.replaceAll(placeholderRegex, (match, p1) => {
        return replacements[p1] || match
    })
    document.documentElement.lang = document.documentElement.lang.replaceAll(placeholderRegex, (match, p1) => {
        return replacements[p1] || match
    })
})
