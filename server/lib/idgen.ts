import { customAlphabet } from "server/lib/nanoid.ts"
const alphanumericStr = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

export class IdGenerator {
    private generateId: () => string
    private generateIdLong: () => string
    private generateIdLonger: () => string

    constructor(desiredLength: number) {
        this.generateId = customAlphabet(alphanumericStr, desiredLength)
        this.generateIdLong = customAlphabet(alphanumericStr, desiredLength + 1)
        this.generateIdLonger = customAlphabet(alphanumericStr, desiredLength + 2)
    }

    generate() {
        return this.generateId()
    }

    generateUnique(doesIdConflict: (id: string) => boolean) {
        for (let i = 0; i < 30; i++) {
            const id = this.generateId()
            if (!doesIdConflict(id)) {
                return id
            }
        }

        for (let i = 0; i < 30; i++) {
            const id = this.generateIdLong()
            if (!doesIdConflict(id)) {
                return id
            }
        }

        for (let i = 0; i < 30; i++) {
            const id = this.generateIdLonger()
            if (!doesIdConflict(id)) {
                return id
            }
        }

        throw new Error("Failed to generate unique ID. Something must have gone terribly wrong!")
    }
}

export class KeyGenerator {
    static alphanumeric = customAlphabet(alphanumericStr, 32)
    static hexadecimal = customAlphabet("0123456789ABCDEF", 32)
    static numeric = customAlphabet("0123456789", 32)
    static base32 = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 32)

    /**
     * Returns a random invite code, formatted like `C4FE-F80D`.
     * @note The entropy of current format is 16^8 (= 2^32).
     * @note The format is not fixed, and could be changed in the future.
     */
    static inviteCode() {
        const hex8 = this.hexadecimal(8)
        return `${hex8.slice(0, 4)}-${hex8.slice(4)}`
    }
}