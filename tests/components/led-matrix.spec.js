import { test, expect } from '@playwright/test'

test.describe('led-matrix', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/fixtures/led-matrix.html', { waitUntil: 'load' })
        await page.waitForFunction(() => window.__ledReady === true)
    })

    test('upgrades to a custom element with a sized canvas', async ({ page }) => {
        const defined = await page.evaluate(() => !!customElements.get('led-matrix'))
        expect(defined).toBe(true)
        const ok = await page.evaluate(() => {
            const c = document.getElementById('led').querySelector('canvas')
            return !!c && c.width > 0 && c.height > 0
        })
        expect(ok).toBe(true)
    })

    test('rendering a value lights pixels', async ({ page }) => {
        const lit = await page.evaluate(() => window.countLit())
        expect(lit).toBeGreaterThan(0)
    })

    test('clearing the descriptor reduces lit pixels', async ({ page }) => {
        const before = await page.evaluate(() => window.countLit())
        const after = await page.evaluate(() => {
            document.getElementById('led').show({ label: '', value: '', mode: 'value' })
            return window.countLit()
        })
        expect(after).toBeLessThan(before)
    })

    test('euclid mode renders onset pulses', async ({ page }) => {
        const lit = await page.evaluate(() => {
            document.getElementById('led').show({
                label: 'EUC', value: '16', mode: 'euclid',
                data: { onsets: [true, false, true, false, true, false, true, false] }, playhead: 2,
            })
            return window.countLit()
        })
        expect(lit).toBeGreaterThan(0)
    })

    test('bars mode renders a gauge without error', async ({ page }) => {
        const lit = await page.evaluate(() => {
            document.getElementById('led').show({
                label: 'LVL', value: '64', mode: 'bars', data: { value: 64, max: 127 },
            })
            return window.countLit()
        })
        expect(lit).toBeGreaterThan(0)
    })

    test('declarative label/value attributes render', async ({ page }) => {
        const lit = await page.evaluate(() => {
            const el = document.createElement('led-matrix')
            el.id = 'led2'
            el.style.cssText = 'display:block;width:256px;height:64px'
            el.setAttribute('label', 'ATTR')
            el.setAttribute('value', '42')
            document.body.appendChild(el)
            const c = el.querySelector('canvas')
            const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
            let n = 0
            for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 80) n++
            return n
        })
        expect(lit).toBeGreaterThan(0)
    })
})
