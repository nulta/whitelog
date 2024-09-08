import { customAlphabet } from "nanoid"

const alphanumericStr = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

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
