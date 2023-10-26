// Base-62
const base62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
const buffer = new Uint8Array(8)

/** Returns a cryptographically secure random integer between [0,61] */
function rand62() {
    crypto.getRandomValues(buffer)
    for (let val of buffer) {     // 0..255
        val = val & 0b0011_1111  // 0..63
        if (val > 61) {           // 62..63?
            continue
        } else {
            return val            // 0..61
        }
    }

    // Tiebreaker (p=9e-13)
    const buffer2 = new Uint32Array(1)
    crypto.getRandomValues(buffer2)
    return buffer2[0] % 62
}

/** Returns a cryptographically secure base-62 random string with given length */
export function id62(length = 4) {
    return new Array(length).fill(NaN).map(() => base62[rand62()]).join("")
}
