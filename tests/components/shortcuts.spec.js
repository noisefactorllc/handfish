import { test, expect } from '@playwright/test'

// formatShortcut/isMacPlatform are pure functions; import the module straight
// from src on a fresh page (no build needed, same idiom as bidi-readiness).
async function fns(page) {
    await page.goto('/')
    return await page.evaluate(async () => {
        const m = await import('/src/utils/shortcuts.js')
        return {
            mac: [
                m.formatShortcut('Mod+Z', { mac: true }),
                m.formatShortcut('Mod+Shift+Z', { mac: true }),
                m.formatShortcut('Ctrl+Alt+f', { mac: true }),
                m.formatShortcut('Space', { mac: true }),
            ],
            win: [
                m.formatShortcut('Mod+Z', { mac: false }),
                m.formatShortcut('Mod+Shift+Z', { mac: false }),
                m.formatShortcut('F1', { mac: false }),
            ],
            detect: typeof m.isMacPlatform(),
        }
    })
}

test('formatShortcut renders mac glyphs and win text', async ({ page }) => {
    const r = await fns(page)
    expect(r.mac).toEqual(['⌘Z', '⇧⌘Z', '⌃⌥F', 'Space'])
    expect(r.win).toEqual(['Ctrl+Z', 'Ctrl+Shift+Z', 'F1'])
    expect(r.detect).toBe('boolean')
})
