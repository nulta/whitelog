# Post markup language: How?

## Problem
- HTML is too verbose.
```html
<h1>Hello</h1>
<p>
    <b>This</b> is a paragraph.
    <a href="/">Click me.</a>
</p>
<figure>
    <img src="img.webp">
    <figcaption>This is an caption.</figcaption>
</figure>
```

- Markdown is simple, but too weak.
```md
# Hello

**This** is a paragraph.
[Click me.](/)

![](img.webp)
*No way to have a visible caption...*
```

## Decisions
- Seprate block-level and inline markup.

- Generic block-level markup goes like:
```
[tag prop1 prop2=asdf .class]
    contents
    contents

[tag] one-line content
```

- Inline markup goes like?
```
[tag:Content]
```


## Example
```
[h1] Hello, world!

[b:This] is a paragraph.
Hyperlink is goes like, [a "/": click here].
[code: printf("Hello world")], [math: f(x)]

[picture .float-r "img.webp"]
    This is a caption.

[code lua]
    print("Hello, world!")
    for k, v in pairs(ply) do
        print(v:getName())
    end

Some paragraph...

[comment]
    asdf

    [code]
        asdf
```
