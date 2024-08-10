# blackprint - a damn simple HTML templating engine

blackprint is a damn simple and plain-HTML based HTML templating engine for Deno.

## spec
blackprint document's filename should end with `.bp.html`.

blackprint makes use of those special tags:

- `<ref!>`
- `<for!>`
- `<if!>`

blackprint interpolates the text surrounded by double braces, like `{{ content }}`,
to a variable expression.

### variable expression

blackprint uses expression like this:

    foo
    foo[1]
    foo.bar[baz][123]

It is able to read and index the data given to template renderer, but that's it.

### ref!

    <ref! [var=?|import=?]></ref!>

ref! evalulates the `var` attribute as a expression, and replaces itself with them.
The content will not be sanitized nor checked.
The content must be a valid HTML. HTML tags without a closing tag are unsupported.

If there's a `import` attribute set, it will import that document.
However the import will not be handled by blackprint itself.
(it will not try to parse the name, `fetch()` the resource, etc.)

### for!

    <for! [var=?] of=? [limit=?] [reversed]> </for!>

for! enumerates and repeats their child node with expression `of`.
`var` is assigned as a iteration key. Think it as like `for (key of something) {...}` syntax.

- When the value of `of` is Number: repeats the children `of` times.
- When the value of `of` is Array: enumerates the array.
- Otherwise: don't do that. It will make some error.

Attribute `limit` limits the maximum enumeration count. It can be a variable expression.

If the attribute `reversed` exists, it will iterate in reversed order.

### if!

    <if! [not] cond=? [is-empty]> </if!>

if hides or shows their children depending on `cond`.

- If `cond` is `null`, `undefined`, or `false`, it's falsy.
- If the attribute `is-empty` exists and `cond` is an empty array, it's falsy.
- If the attribute `not` exists, the condition is inverted.
- If it's falsy, it removes themself. Otherwise, it replaces itself with their children.
