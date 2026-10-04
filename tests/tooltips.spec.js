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

    // Leave the hovered control before testing keyboard focus, so a pointer
    // still parked on the first button cannot compete with the focus tooltip.
    await page.mouse.move(160, 120)
    await expect(page.locator('#hf-tooltip-layer')).toBeHidden()
    await page.locator('#top-left').focus()
    await expect(page.locator('#hf-tooltip-layer')).toHaveText('Top left')
    bounds = await tooltipBounds(page)
    expect(bounds.position).toBe('below')
    expectOnScreen(bounds)

    await page.locator('#bottom-right').focus()
    await page.setViewportSize({ width: 480, height: 280 })
    expectOnScreen(await tooltipBounds(page))
})

test('a genuine re-hover after a focus change is not suppressed', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 320 })
    await page.goto('/')
    await page.setContent(`
      <button id="left" class="tooltip" data-title="Left anchor" style="position:fixed;top:100px;left:40px">L</button>
      <button id="right" class="tooltip" data-title="Right anchor" style="position:fixed;top:100px;right:40px">R</button>
    `)
    await page.addScriptTag({ type: 'module', content: `
      import { initializeTooltips } from '/src/utils/tooltips.js'
      initializeTooltips()
      window.__tooltipsReady = true
    ` })
    await page.waitForFunction(() => window.__tooltipsReady)

    // Rest the pointer exactly on the left anchor's edge so that re-entering
    // later repeats the same pointerover coordinates (the case the guard must
    // not mistake for a synthetic re-dispatch).
    const leftBox = await page.locator('#left').boundingBox()
    const edgePoint = { x: leftBox.x, y: leftBox.y + leftBox.height / 2 }
    await page.mouse.move(edgePoint.x, edgePoint.y)
    await expect(page.locator('#hf-tooltip-layer')).toHaveAttribute('data-visible', 'true')
    await expect(page.locator('#hf-tooltip-layer')).toHaveText('Left anchor')

    // Move the pointer to a non-tooltip area, then focus the right anchor.
    await page.mouse.move(240, 300)
    await page.locator('#right').focus()
    await expect(page.locator('#hf-tooltip-layer')).toHaveText('Right anchor')

    // Hover the left anchor again with real pointer movement: the hover must
    // win over the focused element.
    await page.mouse.move(edgePoint.x, edgePoint.y, { steps: 4 })
    await expect(page.locator('#hf-tooltip-layer')).toHaveText('Left anchor')
})
