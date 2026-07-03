#!/usr/bin/env node
/**
 * Extract canonical API metadata from each component / utility in src/ and
 * emit it as docs/component-api.json. This file is the source of truth for
 * downstream documentation generators (e.g., the handfish-design Claude Code
 * plugin, which regenerates its components.md from this JSON).
 *
 * Run:
 *   node scripts/generate-component-api.js
 *
 * What's extracted (per source file):
 *   - tag name (from `customElements.define('tag', Class)`)
 *   - class name (from `class X extends HTMLElement`)
 *   - observedAttributes list (from `static get observedAttributes() { return [...] }`)
 *   - formAssociated flag (from `static formAssociated = true`)
 *   - public static/instance properties, accessors, and methods
 *   - dispatched events with their type (Event vs CustomEvent) and the
 *     literal CustomEvent.detail keys when statically extractable
 *   - leading JSDoc block (one-paragraph description)
 *
 * What's NOT extracted (would need full AST analysis):
 *   - default values for attributes
 *   - method JSDoc attached to each API member
 *   - non-static event detail payloads
 *
 * Strategy: regex-based extraction. The handfish component pattern is strict
 * (per AGENTS.md), so regex is reliable here. A failed extraction prints to
 * stderr but does not abort — partial output beats no output.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const componentsDir = join(repoRoot, 'src', 'components')
const utilsDir = join(repoRoot, 'src', 'utils')
const indexFile = join(repoRoot, 'src', 'index.js')
const packageFile = join(repoRoot, 'package.json')
const docsDir = join(repoRoot, 'docs')
const outputFile = join(docsDir, 'component-api.json')

// ----- Utilities -------------------------------------------------------------

function listSubdirs(dir) {
    return readdirSync(dir).filter(d => {
        const full = join(dir, d)
        return existsSync(full) && statSync(full).isDirectory()
    })
}

function listJsFiles(dir, predicate = () => true) {
    return readdirSync(dir).filter(f => f.endsWith('.js') && predicate(f))
}

function getGitInfo() {
    try {
        const hash = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim()
        const shortHash = hash.slice(0, 8)
        const dirty = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' }).trim() !== ''
        return { hash, shortHash, dirty }
    } catch {
        return { hash: 'unknown', shortHash: 'unknown', dirty: false }
    }
}

function readPackageVersion() {
    return JSON.parse(readFileSync(packageFile, 'utf8')).version
}

function getClassBody(source, className, extendsPattern = 'HTMLElement') {
    const re = new RegExp(`class\\s+${className}(?:\\s+extends\\s+${extendsPattern})?\\s*\\{([\\s\\S]*?)^\\}`, 'm')
    return source.match(re)?.[1] || ''
}

function braceDeltaOutsideStrings(line, state) {
    let delta = 0
    let escape = false

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i]
        const next = line[i + 1]

        if (state.blockComment) {
            if (char === '*' && next === '/') {
                state.blockComment = false
                i += 1
            }
            continue
        }

        if (state.quote) {
            if (escape) {
                escape = false
            } else if (char === '\\') {
                escape = true
            } else if (char === state.quote) {
                state.quote = null
            }
            continue
        }

        if (char === '/' && next === '/') break
        if (char === '/' && next === '*') {
            state.blockComment = true
            i += 1
            continue
        }
        if (char === '"' || char === "'" || char === '`') {
            state.quote = char
            escape = false
            continue
        }
        if (char === '{') delta += 1
        if (char === '}') delta -= 1
    }

    return delta
}

function getTopLevelClassMemberLines(body) {
    const lines = []
    const state = { quote: null, blockComment: false }
    let depth = 0

    for (const line of body.split('\n')) {
        const trimmed = line.trim()
        if (depth === 0 && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
            lines.push(trimmed)
        }
        depth += braceDeltaOutsideStrings(line, state)
        if (depth < 0) depth = 0
    }

    return lines
}

// ----- Per-file extractors --------------------------------------------------

/**
 * Extract the leading JSDoc block above a `class X extends HTMLElement`
 * declaration and return its first paragraph (sans @-tags).
 */
function extractClassJsdoc(source, className) {
    const re = new RegExp(`\\/\\*\\*([\\s\\S]*?)\\*\\/\\s*(?:export\\s+)?class\\s+${className}\\s+extends\\s+HTMLElement`)
    const match = source.match(re)
    if (!match) return extractLeadingJsdoc(source)
    return cleanJsdoc(match[1])
}

function extractLeadingJsdoc(source) {
    const match = source.match(/^\/\*\*([\s\S]*?)\*\//)
    return match ? cleanJsdoc(match[1]) : null
}

function cleanJsdoc(jsdoc) {
    if (!jsdoc) return null
    const cleaned = jsdoc
        .split('\n')
        .map(l => l.replace(/^\s*\*\s?/, ''))
        .filter(l => !l.trim().startsWith('@'))
        .map(l => l.replace(/^\/+\s*$/, '').trimEnd())  // strip stray closing-slash artifacts
        .filter(l => l !== '/')
        .join('\n')
        .trim()
    // Take only the first paragraph (up to first blank line)
    return cleaned.split(/\n\s*\n/)[0].trim()
}

/**
 * Extract `customElements.define('tag', ClassName)` calls from the source.
 * Returns array of { tag, className }.
 */
function extractDefinedElements(source) {
    const re = /customElements\.define\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/g
    return [...source.matchAll(re)].map(m => ({ tag: m[1], className: m[2] }))
}

/**
 * Extract observedAttributes for a class. Returns array of attribute names,
 * or null if observedAttributes isn't declared.
 */
function extractObservedAttributes(source, className) {
    // Find the class body, then look for the static getter inside
    const haystack = getClassBody(source, className) || source

    const re = /static\s+get\s+observedAttributes\(\)\s*\{[\s\S]*?return\s*\[([\s\S]*?)\]/m
    const match = haystack.match(re)
    if (!match) return null
    return match[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => s)
        .map(s => s.replace(/^['"]|['"]$/g, ''))
        .filter(s => s)
}

/**
 * Extract the formAssociated flag (true / false). Default false if not declared.
 */
function extractFormAssociated(source, className) {
    const haystack = getClassBody(source, className) || source

    const re = /static\s+formAssociated\s*=\s*(true|false)/
    const match = haystack.match(re)
    return match ? match[1] === 'true' : false
}

/**
 * Extract dispatchEvent calls. Returns array of { name, type, detailKeys }
 * where type is 'Event' or 'CustomEvent' and detailKeys is the array of
 * keys in the literal `detail` object passed to CustomEvent (or null if
 * not statically extractable).
 */
function extractEvents(source) {
    const re = /dispatchEvent\s*\(\s*new\s+(Event|CustomEvent)\s*\(\s*['"]([^'"]+)['"]([\s\S]*?)\)\s*\)/g
    const events = new Map()
    for (const m of [...source.matchAll(re)]) {
        const [, type, name, rest] = m
        let detailKeys = null
        if (type === 'CustomEvent') {
            // Look for `detail: { ... }` in the rest
            const detailMatch = rest.match(/detail\s*:\s*\{([\s\S]*?)\}/)
            if (detailMatch) {
                detailKeys = detailMatch[1]
                    .split(',')
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
                // Merge if multiple dispatch sites have the same event with different detail shapes
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

function extractPublicApi(source, className, extendsPattern = 'HTMLElement') {
    const body = getClassBody(source, className, extendsPattern)
    if (!body) return []

    const api = []
    const seen = new Set()
    const add = (entry) => {
        const key = `${entry.kind}:${entry.static}:${entry.name}`
        if (seen.has(key)) return
        seen.add(key)
        api.push(entry)
    }

    const skipMethods = new Set([
        'constructor',
        'connectedCallback',
        'disconnectedCallback',
        'attributeChangedCallback',
    ])
    for (const line of getTopLevelClassMemberLines(body)) {
        let match = line.match(/^static\s+([A-Za-z]\w*)\s*=\s*([^;]+)/)
        if (match) {
            const [, name, value] = match
            if (!name.startsWith('_')) {
                add({
                    kind: 'property',
                    name,
                    static: true,
                    signature: `static ${name} = ${value.trim()}`,
                })
            }
            continue
        }

        match = line.match(/^(static\s+)?(get|set)\s+([A-Za-z]\w*)\s*\(([^)]*)\)\s*\{/)
        if (match) {
            const [, staticKeyword, accessorKind, name, params] = match
            if (!name.startsWith('_') && name !== 'observedAttributes') {
                add({
                    kind: accessorKind,
                    name,
                    static: Boolean(staticKeyword),
                    signature: `${staticKeyword || ''}${accessorKind} ${name}(${params.trim()})`.trim(),
                })
            }
            continue
        }

        match = line.match(/^(static\s+)?(?:async\s+)?([A-Za-z]\w*)\s*\(([^)]*)\)\s*\{/)
        if (match) {
            const [, staticKeyword, name, params] = match
            if (name.startsWith('_') || skipMethods.has(name) || name === 'get' || name === 'set') continue
            add({
                kind: 'method',
                name,
                static: Boolean(staticKeyword),
                signature: `${staticKeyword || ''}${name}(${params.trim()})`.trim(),
            })
        }
    }

    return api
}

/**
 * Extract `export function name(...)` and `export class name` and `export const name`.
 * Used for utility files.
 */
function extractNamedExports(source) {
    const exports = new Set()

    // export function foo(...)
    for (const m of source.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm)) {
        exports.add(m[1])
    }
    // export class Foo
    for (const m of source.matchAll(/^export\s+class\s+(\w+)/gm)) {
        exports.add(m[1])
    }
    // export const foo
    for (const m of source.matchAll(/^export\s+const\s+(\w+)/gm)) {
        exports.add(m[1])
    }
    // export { foo, bar } / export default { foo, bar }
    for (const m of source.matchAll(/^export\s+(?:default\s+)?\{([^}]+)\}/gm)) {
        for (const name of m[1].split(',')) {
            const cleaned = name.trim().split(/\s+as\s+/)[0].trim()
            if (cleaned) exports.add(cleaned)
        }
    }

    return Array.from(exports).sort()
}

// ----- Per-component parser --------------------------------------------------

function parseComponentFile(filePath, dirName) {
    const source = readFileSync(filePath, 'utf8')
    const definedElements = extractDefinedElements(source)
    if (definedElements.length === 0) {
        // Not a custom-element file (could be a class-only export like AboutDialog)
        return parseClassOnlyFile(filePath, source, dirName)
    }

    // Find the primary class for this file (the one whose name matches the file basename)
    const fileBase = basename(filePath, '.js')
    const primaryDef = definedElements.find(d => d.className === fileBase) || definedElements[0]

    const result = {
        kind: 'custom-element',
        tag: primaryDef.tag,
        className: primaryDef.className,
        directory: dirName,
        sourceFile: `src/components/${dirName}/${basename(filePath)}`,
        formAssociated: extractFormAssociated(source, primaryDef.className),
        observedAttributes: extractObservedAttributes(source, primaryDef.className) || [],
        api: extractPublicApi(source, primaryDef.className),
        events: extractEvents(source),
        description: extractClassJsdoc(source, primaryDef.className),
        relatedTags: definedElements
            .filter(d => d.className !== primaryDef.className)
            .map(d => ({ tag: d.tag, className: d.className })),
    }
    return result
}

function parseClassOnlyFile(filePath, source, dirName) {
    // Look for `export class Foo` (no HTMLElement extension)
    const classMatch = source.match(/export\s+class\s+(\w+)(?:\s+extends\s+(\w+))?/)
    if (!classMatch) return null

    const className = classMatch[1]
    const extendsClass = classMatch[2] || null

    // Skip HTMLElement subclasses without `customElements.define` — those aren't usable
    if (extendsClass === 'HTMLElement') return null

    return {
        kind: 'class',
        className,
        extends: extendsClass,
        directory: dirName,
        sourceFile: `src/components/${dirName}/${basename(filePath)}`,
        api: extractPublicApi(source, className, extendsClass || '\\w+'),
        description: (() => {
            const jsdocRe = new RegExp(`\\/\\*\\*([\\s\\S]*?)\\*\\/\\s*export\\s+class\\s+${className}`)
            const m = source.match(jsdocRe)
            if (!m) return null
            return m[1]
                .split('\n')
                .map(l => l.replace(/^\s*\*\s?/, ''))
                .filter(l => !l.trim().startsWith('@'))
                .join('\n')
                .trim()
                .split(/\n\s*\n/)[0]
                .trim()
        })(),
    }
}

// ----- Toast file (functions, not class) ------------------------------------

function parseToastFile() {
    const filePath = join(componentsDir, 'toast', 'Toast.js')
    const source = readFileSync(filePath, 'utf8')

    // showToast default duration
    const defaultDurationMatch = source.match(/duration\s*=\s*(\d+)/)
    const defaultDuration = defaultDurationMatch ? parseInt(defaultDurationMatch[1], 10) : null

    // Per-function overrides
    const funcDurationMatch = source.match(/showError[\s\S]*?duration:\s*options\.duration\s*\?\?\s*(\d+)/)
    const errorDuration = funcDurationMatch ? parseInt(funcDurationMatch[1], 10) : null

    return {
        kind: 'utility-functions',
        directory: 'toast',
        sourceFile: 'src/components/toast/Toast.js',
        exports: extractNamedExports(source).filter(e => e.startsWith('show')),
        defaults: {
            showToast: { duration: defaultDuration },
            showSuccess: { duration: defaultDuration },
            showWarning: { duration: defaultDuration },
            showInfo: { duration: defaultDuration },
            showError: { duration: errorDuration },
        },
    }
}

// ----- Utility files (color, escape, tooltips) ------------------------------

function parseUtilityFile(filePath) {
    const source = readFileSync(filePath, 'utf8')
    return {
        kind: 'utility-functions',
        sourceFile: `src/utils/${basename(filePath)}`,
        exports: extractNamedExports(source),
    }
}

// ----- Theme files ---------------------------------------------------------

function listThemes() {
    const themesDir = join(repoRoot, 'src', 'styles', 'themes')
    if (!existsSync(themesDir)) return []
    const files = listJsFiles(themesDir, () => true).concat(
        readdirSync(themesDir).filter(f => f.endsWith('.css'))
    )
    const themes = []
    for (const file of files) {
        if (!file.endsWith('.css')) continue
        const css = readFileSync(join(themesDir, file), 'utf8')
        const dataThemes = [...css.matchAll(/\[data-theme=["']([^"']+)["']\]/g)]
            .map(m => m[1])
        const unique = Array.from(new Set(dataThemes))
        themes.push({
            file,
            dataThemeValues: unique,
        })
    }
    return themes.sort((a, b) => a.file.localeCompare(b.file))
}

// ----- Index.js exports check ----------------------------------------------

function readIndexExports() {
    const source = readFileSync(indexFile, 'utf8')
    return extractNamedExports(source)
}

// ----- Main ----------------------------------------------------------------

function main() {
    const components = []
    const classes = []

    for (const dir of listSubdirs(componentsDir)) {
        if (dir === 'base') continue  // BaseComponent isn't user-facing
        if (dir === 'toast') continue  // handled separately
        const dirPath = join(componentsDir, dir)
        const jsFiles = listJsFiles(dirPath, f => /^[A-Z]/.test(f))
        for (const file of jsFiles) {
            const parsed = parseComponentFile(join(dirPath, file), dir)
            if (!parsed) continue
            if (parsed.kind === 'custom-element') {
                components.push(parsed)
                // Add related tags as separate entries
                for (const related of parsed.relatedTags) {
                    components.push({
                        kind: 'custom-element',
                        tag: related.tag,
                        className: related.className,
                        directory: dir,
                        sourceFile: parsed.sourceFile,
                        registeredBy: parsed.tag,
                        observedAttributes: [],
                        events: [],
                        formAssociated: false,
                        description: `Registered by <${parsed.tag}> — see that entry.`,
                    })
                }
            } else if (parsed.kind === 'class') {
                classes.push(parsed)
            }
        }
    }

    components.sort((a, b) => a.tag.localeCompare(b.tag))
    classes.sort((a, b) => a.className.localeCompare(b.className))

    const utils = {}
    for (const file of listJsFiles(utilsDir)) {
        const parsed = parseUtilityFile(join(utilsDir, file))
        utils[basename(file, '.js')] = parsed
    }

    const toast = parseToastFile()
    const themes = listThemes()
    const indexExports = readIndexExports()
    const git = getGitInfo()

    // The output is intentionally deterministic — no timestamps, no working-tree
    // state, no current-HEAD git hash. CI re-runs this script and diffs against
    // the committed JSON; non-deterministic fields would always trigger a false
    // positive. Provenance (when this was last regenerated, against which
    // commit) is recoverable from `git log docs/component-api.json`.
    const output = {
        meta: {
            handfish_version: readPackageVersion(),
            note: 'Auto-generated by scripts/generate-component-api.js. Do not edit by hand. Re-run after any change to src/components/, src/utils/, or src/styles/themes/. Output is deterministic — `git log docs/component-api.json` shows when it was last regenerated.',
        },
        custom_elements: components,
        classes,
        utility_modules: utils,
        toast_helpers: toast,
        themes: {
            count_files: themes.length,
            count_data_theme_values: themes.reduce((n, t) => n + t.dataThemeValues.length, 0),
            entries: themes,
        },
        index_exports: indexExports,
    }

    if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true })
    writeFileSync(outputFile, JSON.stringify(output, null, 2) + '\n')

    console.log(`✓ Wrote ${outputFile}`)
    console.log(`  ${components.length} custom elements`)
    console.log(`  ${classes.length} non-element classes`)
    console.log(`  ${Object.keys(utils).length} utility modules`)
    console.log(`  ${toast.exports.length} toast helpers`)
    console.log(`  ${themes.length} theme files (${output.themes.count_data_theme_values} data-theme values)`)
    console.log(`  handfish ${output.meta.handfish_version} @ ${git.shortHash}${git.dirty ? ' (dirty)' : ''}`)
}

main()
