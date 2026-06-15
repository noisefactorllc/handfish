import { test, expect } from '@playwright/test'

test.describe('knob-dial', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/fixtures/knob-dial.html', { waitUntil: 'load' })
        await page.waitForFunction(() => window.__ready === true)
    })

    test('upgrades to a slider with a dial', async ({ page }) => {
        const info = await page.evaluate(() => {
            const k = document.getElementById('k')
            return {
                defined: !!customElements.get('knob-dial'),
                role: k.getAttribute('role'),
                hasDial: !!k.querySelector('svg.knob-dial__dial'),
                valuenow: k.getAttribute('aria-valuenow'),
            }
        })
        expect(info.defined).toBe(true)
        expect(info.role).toBe('slider')
        expect(info.hasDial).toBe(true)
        expect(Number(info.valuenow)).toBeCloseTo(0.3, 3)
    })

    test('renders the formatted value inside the cap and the label below', async ({ page }) => {
        const { value, label } = await page.evaluate(() => {
            const k = document.getElementById('k')
            return {
                value: k.querySelector('.knob-dial__value').textContent,
                label: k.querySelector('.knob-dial__label').textContent,
            }
        })
        expect(value).toBe('30') // default format: round(0.3 * 100)
        expect(label).toBe('gain')
    })

    test('value-arc ring grows with the value', async ({ page }) => {
        const { lo, hi } = await page.evaluate(() => {
            const k = document.getElementById('k')
            k.value = 0.1
            const lo = k.querySelector('.knob-dial__arc').getAttribute('d')
            k.value = 0.9
            const hi = k.querySelector('.knob-dial__arc').getAttribute('d')
            return { lo, hi }
        })
        expect(lo).not.toBe(hi)
        // crossing the 180° sweep point flips the large-arc flag from 0 to 1
        expect(lo).toContain('18 0 0 1')
        expect(hi).toContain('18 0 1 1')
    })

    test('ArrowUp increases the value and emits change', async ({ page }) => {
        await page.evaluate(() => {
            window.__ev = []
            const k = document.getElementById('k')
            k.value = 0.3
            k.addEventListener('change', () => window.__ev.push('change'))
        })
        await page.locator('#k').focus()
        await page.keyboard.press('ArrowUp')
        const { value, ev } = await page.evaluate(() => ({ value: document.getElementById('k').value, ev: window.__ev }))
        expect(value).toBeGreaterThan(0.3)
        expect(ev).toContain('change')
    })

    test('wheel-up increases the value and emits input', async ({ page }) => {
        await page.evaluate(() => {
            window.__ev = []
            const k = document.getElementById('k')
            k.value = 0.3
            k.addEventListener('input', () => window.__ev.push('input'))
        })
        await page.locator('#k').hover()
        await page.mouse.wheel(0, -100)
        const { value, ev } = await page.evaluate(() => ({ value: document.getElementById('k').value, ev: window.__ev }))
        expect(value).toBeGreaterThan(0.3)
        expect(ev).toContain('input')
    })

    test('double-click resets to the default', async ({ page }) => {
        await page.evaluate(() => {
            const k = document.getElementById('k')
            k.default = 0.5
            k.value = 0.1
        })
        await page.locator('#k').dblclick()
        const value = await page.evaluate(() => document.getElementById('k').value)
        expect(value).toBeCloseTo(0.5, 5)
    })

    test('right-click requests MIDI learn', async ({ page }) => {
        await page.evaluate(() => {
            window.__learn = false
            document.getElementById('k').addEventListener('learn', () => { window.__learn = true })
        })
        await page.locator('#k').click({ button: 'right' })
        expect(await page.evaluate(() => window.__learn)).toBe(true)
    })

    test('disabled blocks keyboard interaction', async ({ page }) => {
        await page.evaluate(() => {
            const k = document.getElementById('k')
            k.value = 0.3
            k.setAttribute('disabled', '')
            k.focus()
        })
        await page.keyboard.press('ArrowUp')
        const value = await page.evaluate(() => document.getElementById('k').value)
        expect(value).toBeCloseTo(0.3, 5)
    })

    // ---- endless mode (relative encoder) ----

    test('endless: wheel emits a turn delta', async ({ page }) => {
        await page.evaluate(() => {
            window.__turns = []
            document.getElementById('ke').addEventListener('turn', (e) => window.__turns.push(e.detail.delta))
        })
        await page.locator('#ke').hover()
        await page.mouse.wheel(0, -50)
        const turns = await page.evaluate(() => window.__turns)
        expect(turns.length).toBeGreaterThan(0)
        expect(turns[0]).toBe(1)
    })

    test('endless: arrow keys emit turn deltas', async ({ page }) => {
        await page.evaluate(() => {
            window.__t2 = []
            document.getElementById('ke').addEventListener('turn', (e) => window.__t2.push(e.detail.delta))
        })
        await page.locator('#ke').focus()
        await page.keyboard.press('ArrowUp')
        await page.keyboard.press('ArrowDown')
        expect(await page.evaluate(() => window.__t2)).toEqual([1, -1])
    })

    test('endless: double-click emits lock', async ({ page }) => {
        await page.evaluate(() => {
            window.__lock = false
            document.getElementById('ke').addEventListener('lock', () => { window.__lock = true })
        })
        await page.locator('#ke').dblclick()
        expect(await page.evaluate(() => window.__lock)).toBe(true)
    })

    test('endless: display sets the readout and the level arc is hidden', async ({ page }) => {
        const { display, label, arcHidden } = await page.evaluate(() => {
            const k = document.getElementById('ke')
            k.display = 'SAW'
            const arc = k.querySelector('.knob-dial__arc')
            return {
                display: k.querySelector('.knob-dial__value').textContent,
                label: k.querySelector('.knob-dial__label').textContent,
                arcHidden: getComputedStyle(arc).display === 'none',
            }
        })
        expect(display).toBe('SAW')
        expect(label).toBe('enc')
        expect(arcHidden).toBe(true)
    })
})
