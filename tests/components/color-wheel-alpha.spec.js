import { test, expect } from '@playwright/test'
import { parseHex, rgbToHexWithAlpha, rgbToHex } from '../../src/utils/colorConversions.js'

// parseHex runs in Node directly: colorConversions.js is DOM-free.
test.describe('parseHex', () => {
    test('parses 6-digit and 3-digit hex unchanged (no alpha key)', () => {
        expect(parseHex('#ff8000')).toEqual({ r: 255, g: 128, b: 0 })
        expect(parseHex('ff8000')).toEqual({ r: 255, g: 128, b: 0 })
        // CSS nibble-doubling: #f80 = #ff8800
        expect(parseHex('#f80')).toEqual({ r: 255, g: 0x88, b: 0 })
        expect('a' in parseHex('#ff8000')).toBe(false)
    })

    test('parses 8-digit hex with alpha as a 0-1 fraction', () => {
        expect(parseHex('#ff800080')).toEqual({ r: 255, g: 128, b: 0, a: 128 / 255 })
        expect(parseHex('ff800080')).toEqual({ r: 255, g: 128, b: 0, a: 128 / 255 })
        expect(parseHex('#ff800000')).toEqual({ r: 255, g: 128, b: 0, a: 0 })
        expect(parseHex('#ff8000ff')).toEqual({ r: 255, g: 128, b: 0, a: 1 })
    })

    test('parses 4-digit shorthand hex with alpha', () => {
        // #RGBA nibble-doubling: #f808 = #ff880088
        expect(parseHex('#f808')).toEqual({ r: 255, g: 0x88, b: 0, a: 0x88 / 255 })
        expect(parseHex('#f80f')).toEqual({ r: 255, g: 0x88, b: 0, a: 1 })
    })

    test('round-trips valueWithAlpha output', () => {
        const rgb = { r: 255, g: 128, b: 0 }
        const hexWithAlpha = rgbToHexWithAlpha(rgb, 0.5)
        expect(hexWithAlpha).toBe('#ff800080')
        const parsed = parseHex(hexWithAlpha)
        expect(parsed.r).toBe(rgb.r)
        expect(parsed.g).toBe(rgb.g)
        expect(parsed.b).toBe(rgb.b)
        expect(rgbToHexWithAlpha(parsed, parsed.a)).toBe(hexWithAlpha)
    })

    test('rejects malformed hex', () => {
        expect(parseHex('#f')).toBeNull()
        expect(parseHex('#ff')).toBeNull()
        expect(parseHex('#ff800')).toBeNull()
        expect(parseHex('#ff80000')).toBeNull()
        expect(parseHex('#ff8000800')).toBeNull()
        expect(parseHex('#zzzzzz')).toBeNull()
        expect(parseHex('')).toBeNull()
        expect(parseHex(null)).toBeNull()
    })
})

test.describe('color-wheel alpha values', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/fixtures/color-wheel-alpha.html', { waitUntil: 'load' })
        await page.waitForFunction(() => window.__ready === true)
    })

    test('value attribute with 8-digit hex sets rgb and alpha', async ({ page }) => {
        const info = await page.evaluate(() => {
            const cw = document.getElementById('cw-attr')
            return { rgb: cw.getColor().rgb, alpha: cw.alpha }
        })
        expect(info.rgb).toEqual({ r: 255, g: 128, b: 0 })
        expect(info.alpha).toBeCloseTo(128 / 255, 5)
    })

    test('valueWithAlpha output round-trips through the value setter', async ({ page }) => {
        const info = await page.evaluate(() => {
            const cw = document.getElementById('cw')
            cw.setColor({ value: '#00ccff', alpha: 0.25 })
            const emitted = cw.valueWithAlpha
            // Move to a different color and opaque alpha, then feed the
            // emitted string back; it must restore both rgb and alpha.
            cw.alpha = 1
            cw.value = '#ff0000'
            cw.value = emitted
            return { emitted, alpha: cw.alpha, rgb: cw.getColor().rgb, reEmitted: cw.valueWithAlpha }
        })
        expect(info.emitted).toBe('#00ccff40')
        // Alpha quantizes to the emitted byte: 0x40/255, not exactly 0.25.
        expect(info.alpha).toBeCloseTo(0x40 / 255, 5)
        expect(info.rgb).toEqual({ r: 0, g: 204, b: 255 })
        // Restoring from the emitted string is byte-stable.
        expect(info.reEmitted).toBe(info.emitted)
    })

    test('setColor adopts alpha from an 8-digit hex value', async ({ page }) => {
        const info = await page.evaluate(() => {
            const cw = document.getElementById('cw')
            cw.setColor({ value: '#11223344' })
            return { rgb: cw.getColor().rgb, alpha: cw.alpha }
        })
        expect(info.rgb).toEqual({ r: 0x11, g: 0x22, b: 0x33 })
        expect(info.alpha).toBeCloseTo(0x44 / 255, 5)
    })

    test('6-digit values keep the current alpha', async ({ page }) => {
        const info = await page.evaluate(() => {
            const cw = document.getElementById('cw')
            cw.setColor({ value: '#00ccff', alpha: 0.5 })
            cw.setColor({ value: '#336699' })
            return { rgb: cw.getColor().rgb, alpha: cw.alpha, value: cw.value }
        })
        expect(info.rgb).toEqual({ r: 0x33, g: 0x66, b: 0x99 })
        expect(info.alpha).toBe(0.5)
        expect(info.value).toBe('#336699')
    })

    test('typing 8-digit hex into the hex input adopts alpha', async ({ page }) => {
        const info = await page.evaluate(() => {
            const cw = document.getElementById('cw')
            const input = cw.querySelector('.hex-input')
            input.focus()
            input.value = '#ff800080'
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
            return { rgb: cw.getColor().rgb, alpha: cw.alpha, value: cw.value }
        })
        expect(info.rgb).toEqual({ r: 255, g: 128, b: 0 })
        expect(info.alpha).toBeCloseTo(128 / 255, 5)
        // The committed value stays the 6-digit RGB hex; alpha lives in .alpha.
        expect(info.value).toBe('#ff8000')
    })

    test('alpha attribute of 0 is honored, not coerced to 1', async ({ page }) => {
        const info = await page.evaluate(() => {
            const cw = document.getElementById('cw-zero-alpha')
            return { alpha: cw.alpha }
        })
        expect(info.alpha).toBe(0)
    })
})
