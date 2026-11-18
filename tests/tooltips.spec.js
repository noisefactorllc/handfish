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

test('pointer movement does not dismiss a focus-triggered tooltip', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 240 })
    await page.goto('/')
    await page.setContent(`
      <button id="only" class="tooltip" data-title="Focused anchor" style="position:fixed;top:100px;left:40px">F</button>
    `)
    await page.addScriptTag({ type: 'module', content: `
      import { initializeTooltips } from '/src/utils/tooltips.js'
      initializeTooltips()
      window.__tooltipsReady = true
    ` })
    await page.waitForFunction(() => window.__tooltipsReady)

    await page.locator('#only').focus()
    await expect(page.locator('#hf-tooltip-layer')).toHaveText('Focused anchor')

    // Real pointer movement away from the focused control must not dismiss
    // its tooltip; the focus tooltip stays until the control loses focus.
    await page.mouse.move(10, 10)
    await page.mouse.move(160, 120)
    await expect(page.locator('#hf-tooltip-layer')).toHaveText('Focused anchor')
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

test('a tooltip keeps its width at every edge and stays on screen in any order', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 600 })
    await page.goto('/')
    const text = 'Randomize every parameter of the current program and keep the palette'
    await page.setContent(`
      <button id="centre" class="tooltip" data-title="${text}" style="position:fixed;top:200px;left:488px">C</button>
      <button id="left" class="tooltip" data-title="${text}" style="position:fixed;top:200px;left:0">L</button>
      <button id="right" class="tooltip" data-title="${text}" style="position:fixed;top:200px;right:0">R</button>
      <button id="corner" class="tooltip" data-title="${text}" style="position:fixed;bottom:0;right:0">B</button>
    `)
    await page.addScriptTag({ type: 'module', content: `
      import { initializeTooltips } from '/src/utils/tooltips.js'
      initializeTooltips()
      window.__tooltipsReady = true
    ` })
    await page.waitForFunction(() => window.__tooltipsReady)

    const show = async (id) => {
        await page.mouse.move(500, 400)
        await expect(page.locator('#hf-tooltip-layer')).toBeHidden()
        await page.locator(`#${id}`).hover()
        await expect(page.locator('#hf-tooltip-layer')).toHaveAttribute('data-visible', 'true')
        return tooltipBounds(page)
    }

    const centre = await show('centre')
    const centreWidth = centre.right - centre.left
    // Right edge, then left edge straight after it, then the corner and the
    // right edge again: each keeps the width the text has in the centre.
    for (const id of ['right', 'left', 'corner', 'right', 'centre']) {
        const bounds = await show(id)
        expectOnScreen(bounds)
        expect(bounds.right - bounds.left, `${id} width`).toBeCloseTo(centreWidth, 0)
    }
})

// A control whose click hides it and moves focus to another control, as an
// app's expand tag hands focus to the close button it reveals.
async function openHandoffPage(page) {
    await page.setViewportSize({ width: 480, height: 320 })
    await page.goto('/')
    await page.setContent(`
      <button id="expand" class="tooltip" data-title="Expand" style="position:fixed;top:100px;left:40px">E</button>
      <button id="collapse" class="tooltip" data-title="Collapse" style="position:fixed;top:100px;left:200px" hidden>C</button>
      <script>
        const expand = document.getElementById('expand')
        const collapse = document.getElementById('collapse')
        expand.addEventListener('click', () => { expand.hidden = true; collapse.hidden = false; collapse.focus() })
      </script>
    `)
    await page.addScriptTag({ type: 'module', content: `
      import { initializeTooltips } from '/src/utils/tooltips.js'
      initializeTooltips()
      window.__tooltipsReady = true
    ` })
    await page.waitForFunction(() => window.__tooltipsReady)
}

// WebKit on macOS moves Tab focus to buttons only with Option held.
const tabKey = browserName => (browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab')

const tooltipShown = page => page.locator('#hf-tooltip-layer').evaluate(el => !el.hidden && el.dataset.visible === 'true')

test('focus that a pointer click moves to another control opens no tooltip', async ({ page }) => {
    await openHandoffPage(page)
    const box = await page.locator('#expand').boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 })
    await expect(page.locator('#hf-tooltip-layer')).toHaveText('Expand')
    await page.mouse.down()
    await page.mouse.up()
    await expect(page.locator('#collapse')).toBeFocused()

    // The revealed control was never hovered: its tooltip must not open.
    expect(await page.locator('#hf-tooltip-layer').textContent()).not.toBe('Collapse')
    // Moving the pointer away leaves no tooltip open.
    await page.mouse.move(400, 280, { steps: 4 })
    await page.mouse.move(440, 300, { steps: 4 })
    expect(await tooltipShown(page)).toBe(false)
    await expect(page.locator('#collapse')).toBeFocused()
})

test('a clicked control closes its tooltip when the pointer leaves it', async ({ page }) => {
    await openHandoffPage(page)
    const box = await page.locator('#collapse').evaluate(el => { el.hidden = false; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } })
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 })
    await expect(page.locator('#hf-tooltip-layer')).toHaveText('Collapse')
    await page.mouse.down()
    await page.mouse.up()
    await page.mouse.move(400, 280, { steps: 4 })
    await page.mouse.move(440, 300, { steps: 4 })
    expect(await tooltipShown(page)).toBe(false)
})

test('keyboard focus shows a tooltip and keeps it while the control has focus', async ({ page, browserName }) => {
    await openHandoffPage(page)
    await page.mouse.move(440, 300)
    await page.keyboard.press(tabKey(browserName))
    await expect(page.locator('#expand')).toBeFocused()
    await expect(page.locator('#hf-tooltip-layer')).toHaveText('Expand')
    expect(await tooltipShown(page)).toBe(true)

    // Pointer movement elsewhere does not dismiss a tooltip that focus opened.
    await page.mouse.move(400, 280, { steps: 4 })
    await page.mouse.move(440, 300, { steps: 4 })
    await expect(page.locator('#hf-tooltip-layer')).toHaveText('Expand')
    expect(await tooltipShown(page)).toBe(true)
})

test('focus that a keyboard action moves to another control shows its tooltip', async ({ page, browserName }) => {
    await openHandoffPage(page)
    await page.mouse.move(440, 300)
    await page.keyboard.press(tabKey(browserName))
    await expect(page.locator('#expand')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#collapse')).toBeFocused()
    await expect(page.locator('#hf-tooltip-layer')).toHaveText('Collapse')
    expect(await tooltipShown(page)).toBe(true)
    await page.mouse.move(400, 280, { steps: 4 })
    await expect(page.locator('#hf-tooltip-layer')).toHaveText('Collapse')
})
