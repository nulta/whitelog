;(()=>{
    const html = String.raw;
    const CommentFormElement = customElements.get("comment-form")

    CommentFormElement.html.initial = html`
        <button class="add-comment">Add comment</button>
    `

    CommentFormElement.html.commentBox = html`
        <form class="add-comment-box">
            <label for="add-comment-box-name">Name</label>
            <input tabindex="0" type="text" id="add-comment-box-name" name="nickname" placeholder=""/>
            <label for="add-comment-box-url">Website/SNS</label>
            <input tabindex="0" type="text" id="add-comment-box-url" name="url" placeholder="Not specified" />
            <textarea placeholder="Add comment" name="comment" maxlength="500" autofocus></textarea>
            <p class="status-display"></p>
            <button name="submit">Submit</button>
        </form>
    `

})()
