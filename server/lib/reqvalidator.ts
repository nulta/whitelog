import { ValidationFunction, validator } from "hono/validator"

type ItemString = { $: "string", optional?: boolean, regex?: RegExp, minLength?: number, maxLength?: number }
type ItemNumber = { $: "number", optional?: boolean, min?: number, max?: number, integer?: boolean }
type ItemBoolean = { $: "boolean", optional?: boolean }
type ItemArray = { $: "array", optional?: boolean, items: ValidatorItem }
type ItemObject = { $: "object", optional?: boolean, items: { [key: string]: ValidatorItem } }

type ValidatorItem = ItemString | ItemNumber | ItemBoolean | ItemArray | ItemObject
type ValidatorBody = { [key: string]: ValidatorItem }

type ValidatorItemTypeOf<T extends ValidatorItem> =
    T extends ItemString ? string
        : T extends ItemNumber ? number
            : T extends ItemBoolean ? boolean
                : T extends ItemArray ? ValidatorItemTypeOf<T["items"]>[]
                    : T extends ItemObject ? ValidatorBodyTypeOf<T["items"]>
                        : never

type ValidatorBodyTypeOf<T extends ValidatorBody> = {
    [K in keyof T]: ValidatorItemTypeOf<T[K]>
}


function findRejectReasonForItem(item: ValidatorItem, input: unknown, keyName: string): string | null {
    const type = item["$"]

    if (type == "string") {
        if (typeof input !== "string") {
            return `[6X2BV] Expected a string for key: ${keyName}`
        }

        if (item.regex && !item.regex.test(input)) {
            return `[6X2BV] Invalid string for key: ${keyName}`
        }

        if ((item.minLength != null) && (input.length < item.minLength)) {
            return `[6X2BV] String is too short for key: ${keyName}`
        }

        if ((item.maxLength != null) && (input.length > item.maxLength)) {
            return `[6X2BV] String is too long for key: ${keyName}`
        }
    } else if (type == "number") {
        if (typeof input !== "number") {
            return `[6X2BV] Expected a number for key: ${keyName}`
        }

        if ((item.min != null) && (input < item.min)) {
            return `[6X2BV] Value is too low for key: ${keyName}`
        }

        if ((item.max != null) && (input > item.max)) {
            return `[6X2BV] Value is too high for key: ${keyName}`
        }

        if (item.integer && !Number.isInteger(input)) {
            return `[6X2BV] Expected an integer for key: ${keyName}`
        }
    } else if (type == "boolean") {
        if (typeof input !== "boolean") {
            return `[6X2BV] Expected a boolean for key: ${keyName}`
        }
    } else if (type == "array") {
        if (!Array.isArray(input)) {
            return `[6X2BV] Expected an array for key: ${keyName}`
        }

        for (const [i, val] of input.entries()) {
            const reason = findRejectReasonForItem(item.items, val, `${keyName}[${i}]`)
            if (reason) {
                return reason
            }
        }
    } else if (type == "object") {
        const reason = findRejectReason(item.items, input, keyName)
        if (reason) {
            return reason
        }
    } else {
        const _unreachable: never = item
    }

    return null
}

function findRejectReason(schema: ValidatorBody, input: unknown, recurseKey = ""): string | null {
    if (!input || (typeof input !== "object")) {
        return "[6X2BV] Expected a JSON object"
    }

    for (const [k, v] of Object.entries(input)) {
        const keyName = recurseKey ? `${recurseKey}.${k}` : k

        if (!schema[k]) {
            return `[6X2BV] Unexpected key: ${keyName}`
        }

        const item = schema[k]
        const isOptional = item.optional

        if (v === undefined && isOptional) {
            continue
        }

        const reason = findRejectReasonForItem(item, v, k)
        if (reason) {
            return reason
        }
    }

    return null
}


export function apiTakes<T extends ValidatorBody, U extends ValidatorBodyTypeOf<T>>(schema: T) {
    const validationFunc: ValidationFunction<unknown, U> = (input, c) => {
        const reason = findRejectReason(schema, input)
        if (reason) {
            return c.json({ error: reason }, 400)
        } else {
            return { ...input as object } as U
        }
    }

    return validator("json", validationFunc)
}
