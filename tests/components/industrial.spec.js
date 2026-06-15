import { test, expect } from '@playwright/test'

test.describe('Industrial language foundation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/fixtures/industrial.html', { waitUntil: 'load' })
    })

    test('typeface override applies Atkinson Hyperlegible at the root', async ({ page }) => {
        const family = await page.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue('--hf-font-family').trim()
        )
        expect(family).toContain('Atkinson Hyperlegible')
        expect(family).not.toContain('sans-serif')
        expect(family).not.toContain('system-ui')

        const logoFamily = await page.evaluate(() =>
            getComputedStyle(document.getElementById('logotype')).fontFamily
        )
        expect(logoFamily).toContain('Atkinson Hyperlegible')
    })

    test('logotype is bold, uppercase, name-only', async ({ page }) => {
        const logo = page.locator('#logotype')
        await expect(logo).toHaveText('HANDFISH')
        const styles = await page.evaluate(() => {
            const cs = getComputedStyle(document.getElementById('logotype'))
            return { transform: cs.textTransform, weight: cs.fontWeight }
        })
        expect(styles.transform).toBe('uppercase')
        expect(Number(styles.weight)).toBeGreaterThanOrEqual(700)
    })

    test('top bar is a flex row with a right-aligned cluster', async ({ page }) => {
        const { display, gap } = await page.evaluate(() => {
            const bar = document.getElementById('topbar')
            const cl = document.getElementById('cluster')
            const barR = bar.getBoundingClientRect()
            const clR = cl.getBoundingClientRect()
            return { display: getComputedStyle(bar).display, gap: barR.right - clR.right }
        })
        expect(display).toBe('flex')
        expect(gap).toBeGreaterThanOrEqual(0)
        expect(gap).toBeLessThanOrEqual(16)
    })

    test('cluster is built from the shared handfish icon buttons', async ({ page }) => {
        const cluster = page.locator('#cluster')
        await expect(cluster.locator('.hf-icon-btn')).toHaveCount(2)
        await expect(page.locator('#settings-btn')).toBeVisible()
        await expect(page.locator('#info-btn')).toBeVisible()
    })

    test('cluster icon buttons are prominent square targets at full opacity', async ({ page }) => {
        const { w, h, opacity } = await page.evaluate(() => {
            const b = document.getElementById('settings-btn')
            const r = b.getBoundingClientRect()
            return { w: Math.round(r.width), h: Math.round(r.height), opacity: getComputedStyle(b).opacity }
        })
        expect(w).toBe(h)
        expect(w).toBeGreaterThanOrEqual(32)
        expect(w).toBeLessThanOrEqual(44)
        expect(Number(opacity)).toBe(1)
    })

    test('colour logotype paints a gradient (transparent fill)', async ({ page }) => {
        const color = await page.evaluate(() =>
            getComputedStyle(document.getElementById('logotype-color')).color
        )
        expect(color).toBe('rgba(0, 0, 0, 0)')
    })
})
