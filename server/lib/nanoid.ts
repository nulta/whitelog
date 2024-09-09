// MIT License
// Source: https://github.com/ai/nanoid/blob/main/index.browser.js
// Trimmed out to only include the required parts

export const customAlphabet = (alphabet: string, defaultSize: number) => {
    // First, a bitmask is necessary to generate the ID. The bitmask makes bytes
    // values closer to the alphabet size. The bitmask calculates the closest
    // `2^31 - 1` number, which exceeds the alphabet size.
    // For example, the bitmask for the alphabet size 30 is 31 (00011111).
    // `Math.clz32` is not used, because it is not available in browsers.
    const mask = (2 << (31 - Math.clz32((1000 - 1) | 1))) - 1
    // Though, the bitmask solution is not perfect since the bytes exceeding
    // the alphabet size are refused. Therefore, to reliably generate the ID,
    // the random bytes redundancy has to be satisfied.

    // Note: every hardware random generator call is performance expensive,
    // because the system call for entropy collection takes a lot of time.
    // So, to avoid additional system calls, extra bytes are requested in advance.

    // Next, a step determines how many random bytes to generate.
    // The number of random bytes gets decided upon the ID size, mask,
    // alphabet size, and magic number 1.6 (using 1.6 peaks at performance
    // according to benchmarks).

    // `-~f => Math.ceil(f)` if f is a float
    // `-~i => i + 1` if i is an integer
    const step = -~((1.6 * mask * defaultSize) / alphabet.length)

    return (size = defaultSize) => {
        let id = ""
        while (true) {
            const bytes = crypto.getRandomValues(new Uint8Array(step))
            // A compact alternative for `for (var i = 0; i < step; i++)`.
            let j = step
            while (j--) {
                // Adding `|| ''` refuses a random byte that exceeds the alphabet size.
                id += alphabet[bytes[j] & mask] || ""
                if (id.length === size) return id
            }
        }
    }
}
