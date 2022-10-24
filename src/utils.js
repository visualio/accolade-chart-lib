export function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n)
}

export function findLongestConsecutive(numbers) {
    const chunks = [[]]
    let previousValue = 0

    numbers.forEach(currentValue => {
        // To decide where to put the current number,
        // we compare it to the previous number.
        // If the difference is exactly 1, then they're consecutive,
        // so we'll add the current number to the last available chunk.
        if (previousValue + 1 === currentValue) {
            chunks[chunks.length - 1].push(currentValue)
        } else {
            // Otherwise, we'll create a new chunk to store the current number.
            chunks.push([currentValue])
        }
        // And now we're moving to the next number, so the current number will become the previous number:
        previousValue = currentValue
    })

    // Now we can sort the list of chunks by their length:
    chunks.sort((a, b) => b.length - a.length)

    // And finally, we can find our longest consecutive set of numbers by looking at the first chunk!
    return chunks[0]
}

export function getLastItemFromObject(obj) {
    return obj[Object.keys(obj)[Object.keys(obj).length - 1]]
}

export function getMaxLength(data) {
    return Object.values(data).reduce((maxLength, {values}) => {
        const currentMax = Math.max(...Object.values(values).map(i => i.length))
        return currentMax > maxLength ? currentMax : maxLength
    }, 0)
}

export function rgbaToRgb({
                              r, g, b, a, r2 = 255, g2 = 255, b2 = 255,
                          }) {
    return {
        r: Math.round(((1 - a) * r2) + (a * r)),
        g: Math.round(((1 - a) * g2) + (a * g)),
        b: Math.round(((1 - a) * b2) + (a * b)),
    }
}

export function uniqueString() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function isDefined(value) {
    return value !== undefined && value !== null;
}