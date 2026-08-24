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
        // Force Playwright's own capturing window listeners into place, then
        // mark: they cover the same event types this spec counts.
        await page.mouse.move(0, 0)
        await page.evaluate(() => window.__mark())
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

            // Full object, not just the mouse keys: a stray touch attach on
            // mousedown would otherwise slip through.
            expect(await page.evaluate(() => window.__delta())).toEqual({
                ...ZERO, mousemove: 1, mouseup: 1,
            })

            await page.mouse.up()
            expect(await page.evaluate(() => window.__delta())).toEqual(ZERO)
        })

        test(`${tag}: leaving the DOM mid-drag releases its document listeners`, async ({ page }) => {
            await page.evaluate((t) => window.__make(t), tag)
            await page.locator(`${tag} .vector-button`).click()

            await pressCentre(page, page.locator(`${tag} ${surfaceSelector}`))
            await page.evaluate(() => window.__picker.remove())

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
                value: window.__picker.value,
                events: window.__ev.slice(),
            }))

            await page.mouse.move(cx, cy)
            await page.mouse.down()
            const pressed = await read()

            // Move clear of the surface entirely. Tracking out here is the
            // whole reason these listeners sit on the document: a listener
            // bound to the drag surface would never see this move.
            await page.mouse.move(box.x - 60, box.y - 60)
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
    for (const [tag, surfaceSelector] of Object.entries(DRAG_SURFACE)) {
        test(`${tag}: a second mouse press mid-drag does not orphan a listener pair`, async ({ page }) => {
            await page.evaluate((t) => window.__make(t), tag)
            await page.locator(`${tag} .vector-button`).click()

            const box = await page.locator(`${tag} ${surfaceSelector}`).boundingBox()
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
            await page.mouse.down({ button: 'left' })
            await page.mouse.down({ button: 'right' })
            await page.mouse.up({ button: 'right' })
            await page.mouse.up({ button: 'left' })

            expect(await page.evaluate(() => window.__delta())).toEqual(ZERO)
        })

        test(`${tag}: a second finger mid-drag does not orphan a listener pair`, async ({ page }) => {
            await page.evaluate((t) => window.__make(t), tag)
            await page.locator(`${tag} .vector-button`).click()

            const sel = `${tag} ${surfaceSelector}`
            await page.evaluate(([s]) => {
                const one = [{ id: 1, fx: 0.5, fy: 0.5 }]
                const two = [...one, { id: 2, fx: 0.6, fy: 0.4 }]
                window.__touch(s, 'touchstart', one)
                window.__touch(s, 'touchstart', two)
                window.__touch(s, 'touchend', two)
                window.__touch(s, 'touchend', one)
            }, [sel])

            expect(await page.evaluate(() => window.__delta())).toEqual(ZERO)
        })

        test(`${tag}: a touch drag holds document listeners only while a finger is down`, async ({ page }) => {
            await page.evaluate((t) => window.__make(t), tag)
            await page.locator(`${tag} .vector-button`).click()

            const sel = `${tag} ${surfaceSelector}`
            const one = [{ id: 1, fx: 0.5, fy: 0.5 }]

            await page.evaluate(([s, pts]) => window.__touch(s, 'touchstart', pts), [sel, one])
            expect(await page.evaluate(() => window.__delta())).toEqual({
                ...ZERO, touchmove: 1, touchend: 1,
            })

            await page.evaluate(([s, pts]) => window.__touch(s, 'touchend', pts), [sel, one])
            expect(await page.evaluate(() => window.__delta())).toEqual(ZERO)
        })

        test(`${tag}: closing the dialog mid-drag ends the drag instead of tracking a hidden surface`, async ({ page }) => {
            await page.evaluate((t) => {
                const el = window.__make(t)
                window.__ev = []
                el.addEventListener('change', () => window.__ev.push('change'))
            }, tag)
            await page.locator(`${tag} .vector-button`).click()

            const box = await page.locator(`${tag} ${surfaceSelector}`).boundingBox()
            const cx = box.x + box.width / 2
            const cy = box.y + box.height / 2
            await page.mouse.move(cx, cy)
            await page.mouse.down()

            await page.keyboard.press('Escape')
            const atClose = await page.evaluate(() => window.__picker.value)

            // The dialog is gone; its surface has a zero-size rect. Anything
            // still tracking would divide by it.
            await page.mouse.move(cx + box.width / 4, cy - box.height / 4)
            await page.mouse.up()

            const after = await page.evaluate(() => ({
                value: window.__picker.value,
                delta: window.__delta(),
            }))
            expect(Object.values(after.value).every(Number.isFinite)).toBe(true)
            expect(after.value).toEqual(atClose)
            expect(after.delta).toEqual(ZERO)
        })
    }
})
