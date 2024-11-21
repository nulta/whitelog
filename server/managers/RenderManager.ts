import { Logger } from "server/lib/logger.ts"
import { BlackPrintTemplate, TemplateData } from "server/lib/blackprint/blackprint.ts"
import { MarkupParser, defaultTagDictionary } from "server/lib/markup/markup.ts"
import { ConfigManager } from "server/managers/ConfigManager.ts"

const log = new Logger("RenderManager", "#f774e4")

export class RenderManager {
    private static readonly basePath = "./client/templates/"
    private static templates = new Map<string, BlackPrintTemplate<never>>()
    private static markupDict = defaultTagDictionary

    /**
     * Initialize the RenderManager.
     * - Find and register all templates in the template directory.
     */
    static async initialize() {
        for await (const dirEntry of Deno.readDir(this.basePath)) {
            this.registerTemplate(dirEntry.name.replace(/\.bp\.html$/, ""))
        }

        // TODO: Customizable markupDictionary w/ConfigManager
    }

    static async registerTemplate(name: string) {
        const importFunc = async (path: string) => {
            const src = this.queryTemplate(path)?.source
            if (!src) {
                throw new TypeError(`Tried to import a unknown template "${path}"`)
            }
            return await Promise.resolve(src)
        }

        const templateFile = await Deno.readTextFile(this.basePath + name + ".bp.html")
        const template = new BlackPrintTemplate(templateFile, importFunc)

        this.templates.set(name, template)
    }

    static queryTemplate(name: string) {
        return this.templates.get(name) ?? null
    }

    static async renderTemplate<T extends TemplateData>(name: string, data: T) {
        const template = this.queryTemplate(name) as BlackPrintTemplate<T> | null
        if (!template) { throw new TypeError("Tried to render a unknown template") }
        const siteConfig = await ConfigManager.getSiteConfig()

        try {
            const rendered = await template.render({ site: siteConfig, ...data })
            return rendered
        } catch (e) {
            log.error(`Failed to render template '${name}' - ${e}`)
            throw e
        }
    }

    static renderPostMarkup(markup: string) {
        return new MarkupParser(this.markupDict).parse(markup)
    }

    static renderCommentMarkup(markup: string) {
        return new MarkupParser(this.markupDict).parse(markup)
    }
}
