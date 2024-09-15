import { DatabaseManager } from "server/managers/DatabaseManager.ts"
import { ConfigDb } from "server/models/Configurations.ts"
import { Logger } from "server/lib/logger.ts"

const log = new Logger("PostManager", "#f06d30")

type ConfigKey = keyof typeof ConfigDefaults
type ConfigValue<T extends ConfigKey> = typeof ConfigDefaults[T]

// Validate that ConfigDefaults extends Record<string, string | number>
const _validateType: typeof ConfigDefaults extends Record<string, string|number> ? true : never = true


const ConfigDefaults = {
    "site.lang": "en",
    "site.name": "whitelog",
    "site.description": "Nameless blog powered by whitelog",
    "site.ownerName": "",
} as const


export class ConfigManager {
    private static configDb: ConfigDb

    public static initialize() {
        this.configDb = DatabaseManager.instantiate(ConfigDb)
    }

    public static async get<T extends ConfigKey>(key: T): Promise<ConfigValue<T>> {
        const defaultValue = ConfigDefaults[key]
        const gotValue = await this.configDb.get(key)

        let configValue
        if (typeof defaultValue === "string") {
            configValue = gotValue ?? defaultValue
        } else if (typeof defaultValue === "number") {
            configValue = Number(gotValue ?? defaultValue)
        }

        return configValue as ConfigValue<T>
    }

    public static async set<T extends ConfigKey>(key: T, value: ConfigValue<T>): Promise<void> {
        log.info(`Config "${key}" set to "${value}"`)
        await this.configDb.set(key, String(value))
    }

    public static async getSiteConfig() {
        const [lang, name, description, ownerName] = await Promise.all([
            this.get("site.lang"),
            this.get("site.name"),
            this.get("site.description"),
            this.get("site.ownerName"),
        ])

        return { lang, name, description, ownerName }
    }
}
