function findObjectPropertyOpen(source, propertyName) {
    let depth = 0
    let quote = null
    let escape = false
    let lineComment = false
    let blockComment = false

    for (let i = 0; i < source.length; i += 1) {
        const char = source[i]
        const next = source[i + 1]
        if (lineComment) {
            if (char === '\n') lineComment = false
            continue
        }
        if (blockComment) {
            if (char === '*' && next === '/') {
                blockComment = false
                i += 1
            }
            continue
        }
        if (quote) {
            if (escape) escape = false
            else if (char === '\\') escape = true
            else if (char === quote) quote = null
            continue
        }
        if (char === '/' && next === '/') {
            lineComment = true
            i += 1
            continue
        }
        if (char === '/' && next === '*') {
            blockComment = true
            i += 1
            continue
        }
        if (char === '"' || char === "'" || char === '`') {
            quote = char
            continue
        }
        if (char === '{') {
            depth += 1
            continue
        }
        if (char === '}') {
            depth -= 1
            continue
        }
        if (depth !== 1 || !source.startsWith(propertyName, i)) continue

        const before = source[i - 1]
        const after = source[i + propertyName.length]
        if ((before && /[A-Za-z0-9_$]/.test(before)) || (after && /[A-Za-z0-9_$]/.test(after))) continue

        let cursor = i + propertyName.length
        while (/\s/.test(source[cursor] || '')) cursor += 1
        if (source[cursor] !== ':') continue
        cursor += 1
        while (/\s/.test(source[cursor] || '')) cursor += 1
        if (source[cursor] === '{') return cursor
    }
    return -1
}

function extractObjectLiteralBody(source, propertyName) {
    const open = findObjectPropertyOpen(source, propertyName)
    if (open === -1) return null

    let depth = 0
    let quote = null
    let escape = false
    let lineComment = false
    let blockComment = false

    for (let i = open; i < source.length; i += 1) {
        const char = source[i]
        const next = source[i + 1]

        if (lineComment) {
            if (char === '\n') lineComment = false
            continue
        }
        if (blockComment) {
            if (char === '*' && next === '/') {
                blockComment = false
                i += 1
            }
            continue
        }
        if (quote) {
            if (escape) escape = false
            else if (char === '\\') escape = true
            else if (char === quote) quote = null
            continue
        }
        if (char === '/' && next === '/') {
            lineComment = true
            i += 1
            continue
        }
        if (char === '/' && next === '*') {
            blockComment = true
            i += 1
            continue
        }
        if (char === '"' || char === "'" || char === '`') {
            quote = char
            continue
        }
        if (char === '{') depth += 1
        if (char === '}') {
            depth -= 1
            if (depth === 0) return source.slice(open + 1, i)
        }
    }
    return null
}

function splitTopLevelProperties(body) {
    const properties = []
    const current = []
    let depth = 0
    let quote = null
    let escape = false
    let lineComment = false
    let blockComment = false

    for (let i = 0; i < body.length; i += 1) {
        const char = body[i]
        const next = body[i + 1]
        if (lineComment) {
            if (char === '\n') {
                lineComment = false
                current.push(char)
            }
            continue
        }
        if (blockComment) {
            if (char === '*' && next === '/') {
                blockComment = false
                i += 1
            }
            continue
        }
        if (quote) {
            current.push(char)
            if (escape) escape = false
            else if (char === '\\') escape = true
            else if (char === quote) quote = null
            continue
        }
        if (char === '/' && next === '/') {
            lineComment = true
            i += 1
            continue
        }
        if (char === '/' && next === '*') {
            blockComment = true
            i += 1
            continue
        }
        if (char === '"' || char === "'" || char === '`') {
            quote = char
            current.push(char)
            continue
        }
        if (char === '{' || char === '[' || char === '(') {
            depth += 1
            current.push(char)
        } else if (char === '}' || char === ']' || char === ')') {
            depth -= 1
            current.push(char)
        } else if (char === ',' && depth === 0) {
            properties.push(current.join(''))
            current.length = 0
        } else {
            current.push(char)
        }
    }
    properties.push(current.join(''))
    return properties
}

/**
 * Extract dispatchEvent calls. Returns array of { name, type, detailKeys }
 * where type is 'Event' or 'CustomEvent' and detailKeys is the array of
 * keys in the literal `detail` object passed to CustomEvent (or null if
 * not statically extractable).
 */
export function extractEvents(source) {
    const re = /dispatchEvent\s*\(\s*new\s+(Event|CustomEvent)\s*\(\s*['"]([^'"]+)['"]([\s\S]*?)\)\s*\)/g
    const events = new Map()
    for (const m of [...source.matchAll(re)]) {
        const [, type, name, rest] = m
        let detailKeys = null
        if (type === 'CustomEvent') {
            const detailBody = extractObjectLiteralBody(rest, 'detail')
            if (detailBody !== null) {
                detailKeys = splitTopLevelProperties(detailBody)
                    .map(s => s.trim())
                    .filter(s => s && !s.startsWith('//'))
                    .map(s => s.split(':')[0].trim())
                    .map(s => s.replace(/^\.\.\./, '...').replace(/^['"]|['"]$/g, ''))
                    .filter(s => s)
            }
        }
        const key = `${name}:${type}`
        if (events.has(key)) {
            const existing = events.get(key)
            if (detailKeys && existing.detailKeys) {
                const merged = Array.from(new Set([...existing.detailKeys, ...detailKeys]))
                events.set(key, { ...existing, detailKeys: merged })
            } else if (detailKeys) {
                events.set(key, { ...existing, detailKeys })
            }
        } else {
            events.set(key, { name, type, detailKeys })
        }
    }
    return Array.from(events.values())
}
