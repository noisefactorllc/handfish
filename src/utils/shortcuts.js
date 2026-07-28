/**
 * Platform-aware keyboard-shortcut display formatting.
 *
 * formatShortcut('Mod+Shift+Z') => '⇧⌘Z' on Mac, 'Ctrl+Shift+Z' elsewhere.
 * Menu-oriented components render shortcut hints as plain text; apps can pass
 * literal strings ('⌘Z') for exact control, or use this helper to stay
 * platform-correct from a single 'Mod+…' spec.
 */

const MAC_GLYPHS = { mod: '⌘', cmd: '⌘', meta: '⌘', ctrl: '⌃', control: '⌃', alt: '⌥', option: '⌥', shift: '⇧' }
const MAC_ORDER = ['⌃', '⌥', '⇧', '⌘']
const WIN_NAMES = { mod: 'Ctrl', cmd: 'Ctrl', meta: 'Ctrl', ctrl: 'Ctrl', control: 'Ctrl', alt: 'Alt', option: 'Alt', shift: 'Shift' }

/**
 * Detect whether the current platform uses ⌘-style shortcuts.
 * @param {Navigator|null} nav - Injectable for testing; defaults to the global navigator.
 * @returns {boolean}
 */
export function isMacPlatform(nav = typeof navigator !== 'undefined' ? navigator : null) {
    if (!nav) return false
    return /Mac|iPhone|iPad|iPod/.test(nav.platform || '') || /Mac OS X/.test(nav.userAgent || '')
}

/**
 * Format a '+'-separated shortcut spec for display on the current platform.
 * Modifier tokens (case-insensitive): Mod, Cmd, Meta, Ctrl, Control, Alt, Option, Shift.
 * Mac output joins glyphs in canonical ⌃⌥⇧⌘ order with no separator; other
 * platforms keep the given order joined with '+'. Single-character keys are
 * uppercased; longer key names (F1, Space, Escape) pass through unchanged.
 * @param {string} spec - e.g. 'Mod+Shift+Z'
 * @param {{ mac?: boolean }} [options] - Override platform detection.
 * @returns {string}
 */
export function formatShortcut(spec, { mac = isMacPlatform() } = {}) {
    const parts = String(spec).split('+').map(p => p.trim()).filter(Boolean)
    const mods = []
    const keys = []
    for (const part of parts) {
        const lower = part.toLowerCase()
        if (mac && MAC_GLYPHS[lower]) mods.push(MAC_GLYPHS[lower])
        else if (!mac && WIN_NAMES[lower]) mods.push(WIN_NAMES[lower])
        else keys.push(part.length === 1 ? part.toUpperCase() : part)
    }
    if (mac) {
        mods.sort((a, b) => MAC_ORDER.indexOf(a) - MAC_ORDER.indexOf(b))
        return mods.join('') + keys.join('')
    }
    return [...mods, ...keys].join('+')
}
