import { FreshContext } from "$fresh/server.ts";

export default function App(
    req: Request, ctx: FreshContext,
) {
    return (
        <html lang={site.lang}>
            <head>
                <meta charset="UTF-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />
                <meta name="title" content="" />
                <meta name="description" content="" />
                <link rel="stylesheet" href="/assets/style.css" />
                <script src="/assets/script.js"></script>
                <script src="/assets/elements.js"></script>
                <title></title>
            </head>
            <body>
                <header>
                    <div class="logo">
                        <a href="/"></a>
                    </div>
                    <nav>
                        <a href="/about">About</a>
                        <a href="/tags">Tags</a>
                        <a href="/list">Posts</a>
                        <a href="/rss">RSS</a>
                    </nav>
                </header>
                <Component />
                <footer>
                    <p>
                        <strong></strong>
                        <br />
                        powered by whitelog<br />
                        from <a href="/about"></a> with &lt;3 <br />
                    </p>
                </footer>
            </body>
        </html>
    );
}
