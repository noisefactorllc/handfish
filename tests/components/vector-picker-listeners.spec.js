import { test, expect } from '@playwright/test'

const ZERO = { mousemove: 0, mouseup: 0, touchmove: 0, touchend: 0 }

const DRAG_SURFACE = {
    'vector3d-picker': '.sphere-gizmo',
    'vector2d-picker': '.pad-2d',
}

/** Press the mouse at the centre of `locator` and leave the button down. */
async function pressCentre(page, locator) {
    const box = await locator.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
}

test.describe('vector picker document listeners', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/fixtures/vector-picker-listeners.html', { waitUntil: 'load' })
        await page.waitForFunction(() => window.__ready === true)
    })

    for (const [tag, surfaceSelector] of Object.entries(DRAG_SURFACE)) {
        test(`${tag}: merely existing costs the document no drag listeners`, async ({ page }) => {
            const delta = await page.evaluate((t) => {
                window.__make(t)
                window.__make(t)
                window.__make(t)
                return window.__delta()
            }, tag)
            expect(delta).toEqual(ZERO)
        })

        test(`${tag}: a drag holds document listeners only while the button is down`, async ({ page }) => {
            await page.evaluate((t) => window.__make(t), tag)
            await page.locator(`${tag} .vector-button`).click()

            await pressCentre(page, page.locator(`${tag} ${surfaceSelector}`))

            const during = await page.evaluate(() => window.__delta())
            expect(during.mousemove).toBe(1)
            expect(during.mouseup).toBe(1)

            await page.mouse.up()
            expect(await page.evaluate(() => window.__delta())).toEqual(ZERO)
        })

        test(`${tag}: leaving the DOM mid-drag releases its document listeners`, async ({ page }) => {
            await page.evaluate((t) => window.__make(t), tag)
            await page.locator(`${tag} .vector-button`).click()

            await pressCentre(page, page.locator(`${tag} ${surfaceSelector}`))
            await page.evaluate(() => document.getElementById('picker').remove())

            expect(await page.evaluate(() => window.__delta())).toEqual(ZERO)
            await page.mouse.up()
        })
    }
    for (const [tag, surfaceSelector] of Object.entries(DRAG_SURFACE)) {
        test(`${tag}: dragging still tracks the pointer and commits on release`, async ({ page }) => {
            await page.evaluate((t) => {
                const el = window.__make(t)
                window.__ev = []
                el.addEventListener('input', () => window.__ev.push('input'))
                el.addEventListener('change', () => window.__ev.push('change'))
            }, tag)
            await page.locator(`${tag} .vector-button`).click()

            const surface = page.locator(`${tag} ${surfaceSelector}`)
            const box = await surface.boundingBox()
            const cx = box.x + box.width / 2
            const cy = box.y + box.height / 2

            const read = () => page.evaluate(() => ({
                value: document.getElementById('picker').value,
                events: window.__ev.slice(),
            }))

            await page.mouse.move(cx, cy)
            await page.mouse.down()
            const pressed = await read()

            // Move a quarter of the surface toward the top-right. The value has
            // to follow the pointer, which it only can while the document-level
            // mousemove listener of this drag is attached.
            await page.mouse.move(cx + box.width / 4, cy - box.height / 4)
            const moved = await read()

            expect(moved.value).not.toEqual(pressed.value)
            expect(moved.events).toContain('input')
            expect(moved.events).not.toContain('change')

            await page.mouse.up()
            const released = await read()

            expect(released.events).toContain('change')
            expect(released.value).toEqual(moved.value)
        })
    }
})
