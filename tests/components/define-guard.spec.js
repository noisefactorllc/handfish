import { test, expect } from '@playwright/test'

// Every name Handfish defines. A page that defined one of them before
// importing Handfish keeps its own element, and the import does not throw.
const NAMES = [
    'agent-connect-dialog', 'code-editor', 'color-picker', 'color-swatch', 'color-wheel',
    'dropdown-menu', 'dropdown-item', 'gradient-stops', 'image-magnifier', 'join-session-dialog',
    'justify-button-group', 'knob-dial', 'led-matrix', 'menu-bar', 'seance-dialog',
    'select-dropdown', 'session-status', 'slider-value', 'tempo-bar', 'toggle-switch',
    'vector2d-picker', 'vector3d-picker',
]

test('a page that defined Handfish names first keeps its elements, and Handfish still loads', async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.setContent('<!doctype html><html><head></head><body></body></html>')
    await page.evaluate(names => {
        window.__pageElements = {}
        for (const name of names) {
            const PageElement = class extends HTMLElement {
                connectedCallback() { this.dataset.owner = 'page' }
            }
            customElements.define(name, PageElement)
            window.__pageElements[name] = PageElement
        }
    }, NAMES)
    await page.addScriptTag({ type: 'module', content: "import { initializeTooltips } from '/dist/handfish.esm.js'; window.__hf = { initializeTooltips }" })
    await page.waitForFunction(() => window.__hf)

    expect(errors).toEqual([])
    const kept = await page.evaluate(names => names.filter(name => customElements.get(name) === window.__pageElements[name]), NAMES)
    expect(kept).toEqual(NAMES)
    const owner = await page.evaluate(() => {
        const el = document.createElement('color-wheel')
        document.body.append(el)
        return el.dataset.owner
    })
    expect(owner).toBe('page')
    expect(await page.evaluate(() => typeof window.__hf.initializeTooltips)).toBe('function')
})

test('a page without its own elements still gets every Handfish element', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.setContent('<!doctype html><html><head></head><body></body></html>')
    await page.addScriptTag({ type: 'module', content: "import '/dist/handfish.esm.js'; window.__ready = 1" })
    await page.waitForFunction(() => window.__ready)
    const missing = await page.evaluate(names => names.filter(name => !customElements.get(name)), NAMES)
    expect(missing).toEqual([])
})

test('Handfish components show their hover text as Handfish tooltips, never as native titles', async ({ page }) => {
    await page.goto('/examples/')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => {
        const el = document.createElement('menu-bar')
        el.id = 'mb-titles'
        el.config = { regions: { right: [
            { type: 'segmented', id: 'titledSwitch', ariaLabel: 'Backend', buttons: [
                { id: 'seg-a', label: 'A', pressed: () => true },
                { id: 'seg-b', label: 'B', pressed: () => false, title: 'Use B' },
            ] },
        ] } }
        document.body.appendChild(el)
    })
    await page.addScriptTag({ type: 'module', content: "import { initializeTooltips } from '/dist/handfish.esm.js'; initializeTooltips(); window.__tips = 1" })
    await page.waitForFunction(() => window.__tips)

    await expect(page.locator('#seg-b')).toHaveAttribute('data-title', 'Use B')
    await expect(page.locator('#seg-b')).toHaveClass(/\btooltip\b/)
    const current = page.locator('#cw1 .preview-current')
    await expect(current).toHaveAttribute('data-title', 'Current color')
    await expect(current).toHaveAttribute('aria-label', 'Current color')
    await expect(page.locator('#cw1 .preview-previous')).toHaveAttribute('data-title', 'Previous color (click to revert)')
    await expect(page.locator('#justify1 [data-value="left"]')).toHaveAttribute('data-title', 'Align left')
    await expect(page.locator('#justify1 [data-value="left"]')).toHaveAttribute('aria-label', 'Align left')
    await expect(page.locator('#gs1 .stop-delete').first()).toHaveAttribute('data-title', 'Delete color')

    const titled = await page.evaluate(() => [...document.querySelectorAll(
        'menu-bar [title], color-wheel [title], justify-button-group [title], gradient-stops [title]',
    )].map(el => el.outerHTML.slice(0, 120)))
    expect(titled).toEqual([])

    await page.locator('#seg-b').hover()
    await expect(page.locator('#hf-tooltip-layer')).toHaveText('Use B')
})
