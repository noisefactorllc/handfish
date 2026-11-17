import { test, expect } from '@playwright/test'

// show-tooltip shows a swatch's hex on hover through the Handfish tooltip
// layer, which keeps it on screen at its natural width at every edge.
test('a show-tooltip swatch shows its hex through #hf-tooltip-layer at its natural width at the edges', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 240 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.setContent('<!doctype html><html><head></head><body style="margin:0"></body></html>')
    await page.addScriptTag({ type: 'module', content: "import { initializeTooltips } from '/dist/handfish.esm.js'; initializeTooltips(); window.__ready = 1" })
    await page.waitForFunction(() => window.__ready)
    await page.evaluate(() => {
        for (const [id, position] of [['right', 'top:100px;right:2px'], ['corner', 'bottom:2px;right:2px'],
            ['topleft', 'top:2px;left:2px'], ['middle', 'top:100px;left:144px'], ['plain', 'top:180px;left:144px']]) {
            const swatch = document.createElement('color-swatch')
            swatch.id = id
            swatch.setAttribute('color', '#ff6b6b')
            if (id !== 'plain') swatch.setAttribute('show-tooltip', '')
            swatch.style.cssText = `position:fixed;${position}`
            document.body.append(swatch)
        }
    })
    expect(await page.locator('color-swatch .swatch-tooltip').count()).toBe(0)

    const shown = async id => {
        await page.mouse.move(160, 230)
        await page.locator(`#${id}`).hover()
        await expect(page.locator('#hf-tooltip-layer')).toBeVisible()
        return page.locator('#hf-tooltip-layer').evaluate(el => {
            const rect = el.getBoundingClientRect()
            return { text: el.textContent, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width }
        })
    }

    const middle = await shown('middle')
    expect(middle.text).toBe('#FF6B6B')
    for (const id of ['right', 'corner', 'topleft']) {
        const bounds = await shown(id)
        expect(bounds.text, id).toBe('#FF6B6B')
        expect(bounds.left, id).toBeGreaterThanOrEqual(0)
        expect(bounds.top, id).toBeGreaterThanOrEqual(0)
        expect(bounds.right, id).toBeLessThanOrEqual(320)
        expect(bounds.bottom, id).toBeLessThanOrEqual(240)
        expect(Math.abs(bounds.width - middle.width), id).toBeLessThanOrEqual(1)
    }

    // A swatch without show-tooltip has no tooltip, and a color change updates the hex.
    await expect(page.locator('#plain')).not.toHaveClass(/\btooltip\b/)
    await page.locator('#right').evaluate(el => el.setAttribute('color', '#00ff00'))
    await expect(page.locator('#right')).toHaveAttribute('data-title', '#00FF00')
    await page.locator('#right').evaluate(el => el.removeAttribute('show-tooltip'))
    await expect(page.locator('#right')).not.toHaveClass(/\btooltip\b/)
    await expect(page.locator('#right')).not.toHaveAttribute('data-title', /./)
})
