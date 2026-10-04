import { test, expect } from '@playwright/test'

async function tooltipBounds(page) {
    return page.locator('#hf-tooltip-layer').evaluate(el => {
        const rect = el.getBoundingClientRect()
        return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: innerWidth,
            height: innerHeight,
            text: el.textContent,
            position: el.dataset.position,
        }
    })
}

function expectOnScreen(bounds) {
    expect(bounds.left).toBeGreaterThanOrEqual(0)
    expect(bounds.top).toBeGreaterThanOrEqual(0)
    expect(bounds.right).toBeLessThanOrEqual(bounds.width)
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.height)
}

test('hover and keyboard tooltips stay inside the viewport at every edge', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 240 })
    await page.goto('/')
    await page.setContent(`
      <button id="top-left" class="tooltip" data-title="Top left" style="position:fixed;top:2px;left:2px">A</button>
      <button id="bottom-right" class="tooltip" data-title="A long tooltip that must wrap and remain legible even when its anchor sits at the extreme right edge of a narrow viewport" style="position:fixed;bottom:2px;right:2px">B</button>
    `)
    await page.addScriptTag({ type: 'module', content: `
      import { initializeTooltips } from '/src/utils/tooltips.js'
      initializeTooltips()
      window.__tooltipsReady = true
    ` })
    await page.waitForFunction(() => window.__tooltipsReady)

    await page.locator('#bottom-right').hover()
    await expect(page.locator('#hf-tooltip-layer')).toHaveAttribute('data-visible', 'true')
    let bounds = await tooltipBounds(page)
    expect(bounds.position).toBe('above')
    expect(bounds.text).toContain('long tooltip')
    expectOnScreen(bounds)

    await page.locator('#top-left').focus()
    bounds = await tooltipBounds(page)
    expect(bounds.position).toBe('below')
    expect(bounds.text).toBe('Top left')
    expectOnScreen(bounds)

    await page.locator('#bottom-right').focus()
    await page.setViewportSize({ width: 480, height: 280 })
    expectOnScreen(await tooltipBounds(page))
})
