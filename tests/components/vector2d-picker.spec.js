import { test, expect } from '@playwright/test'

test.describe('Vector2dPicker', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/examples/')
        await page.waitForLoadState('networkidle')
    })

    test('displays default value', async ({ page }) => {
        const picker = page.locator('vector2d-picker#v2p1')
        const xValue = picker.locator('.x-value')
        const yValue = picker.locator('.y-value')

        await expect(xValue).toHaveText('0')
        await expect(yValue).toHaveText('0')
    })

    test('displays preset values', async ({ page }) => {
        const picker = page.locator('vector2d-picker#v2p2')
        const xValue = picker.locator('.x-value')
        const yValue = picker.locator('.y-value')

        await expect(xValue).toHaveText('0.50')
        await expect(yValue).toHaveText('-0.30')
    })

    test('opens dialog on button click', async ({ page }) => {
        const picker = page.locator('vector2d-picker#v2p1')
        const button = picker.locator('.vector-button')
        const dialog = picker.locator('.vector-dialog')

        await button.click()
        await expect(dialog).toBeVisible()
    })

    test('slider changes update value', async ({ page }) => {
        const picker = page.locator('vector2d-picker#v2p1')
        const button = picker.locator('.vector-button')
        await button.click()

        const xSlider = picker.locator('.axis-slider.x')
        await xSlider.fill('0.5')

        const value = await picker.evaluate(el => el.value)
        expect(value.x).toBeCloseTo(0.5, 1)
    })

    test('text input changes update value', async ({ page }) => {
        const picker = page.locator('vector2d-picker#v2p1')
        const button = picker.locator('.vector-button')
        await button.click()

        const xInput = picker.locator('.x-input')
        await xInput.fill('0.75')
        await page.keyboard.press('Enter')

        const value = await picker.evaluate(el => el.value)
        expect(value.x).toBeCloseTo(0.75, 1)
    })

    test('disabled picker does not open dialog', async ({ page }) => {
        const picker = page.locator('vector2d-picker[disabled]').first()
        const button = picker.locator('.vector-button')
        const dialog = picker.locator('.vector-dialog')

        await button.click({ force: true })
        await expect(dialog).not.toBeVisible()
    })

    test('change event fires on interaction end', async ({ page }) => {
        const picker = page.locator('vector2d-picker#v2p1')
        const button = picker.locator('.vector-button')
        await button.click()

        await picker.evaluate(el => {
            el._testChangeFired = false
            el.addEventListener('change', () => {
                el._testChangeFired = true
            }, { once: true })
        })

        const xInput = picker.locator('.x-input')
        await xInput.fill('0.5')
        await page.keyboard.press('Enter')

        const fired = await picker.evaluate(el => el._testChangeFired)
        expect(fired).toBe(true)
    })

    test('reset button restores initial value', async ({ page }) => {
        const picker = page.locator('vector2d-picker#v2p2')
        const button = picker.locator('.vector-button')
        await button.click()

        // Change value away from initial
        const xSlider = picker.locator('.axis-slider.x')
        await xSlider.fill('0')

        const resetBtn = picker.locator('.reset-button')
        await resetBtn.click()

        // Should reset to the initial attribute value [0.5, -0.3]
        const value = await picker.evaluate(el => el.value)
        expect(value.x).toBeCloseTo(0.5, 1)
        expect(value.y).toBeCloseTo(-0.3, 1)
    })

    test('normalize constrains vector to unit length', async ({ page }) => {
        const picker = page.locator('vector2d-picker#v2p1')
        const button = picker.locator('.vector-button')
        await button.click()

        const xSlider = picker.locator('.axis-slider.x')
        await xSlider.fill('0.8')
        const ySlider = picker.locator('.axis-slider.y')
        await ySlider.fill('0.8')

        const normalizeCheckbox = picker.locator('.normalize-checkbox')
        await normalizeCheckbox.check()

        const value = await picker.evaluate(el => {
            const v = el.value
            return Math.sqrt(v.x ** 2 + v.y ** 2)
        })
        expect(value).toBeCloseTo(1.0, 2)
    })

    test('normalize with zero vector falls back to [1, 0]', async ({ page }) => {
        const picker = page.locator('vector2d-picker#v2p1')
        const button = picker.locator('.vector-button')
        await button.click()

        const normalizeCheckbox = picker.locator('.normalize-checkbox')
        await normalizeCheckbox.check()

        const value = await picker.evaluate(el => el.value)
        expect(value.x).toBe(1)
        expect(value.y).toBe(0)
    })

    test('pad click updates value', async ({ page }) => {
        const picker = page.locator('vector2d-picker#v2p1')
        const button = picker.locator('.vector-button')
        await button.click()

        const pad = picker.locator('.pad-2d')
        const box = await pad.boundingBox()

        await page.mouse.click(
            box.x + box.width * 0.75,
            box.y + box.height * 0.25
        )

        const value = await picker.evaluate(el => el.value)
        expect(value.x).toBeGreaterThan(0)
        expect(value.y).toBeGreaterThan(0)
    })

    test('value property setter accepts array', async ({ page }) => {
        const picker = page.locator('vector2d-picker#v2p1')

        await picker.evaluate(el => { el.value = [0.5, -0.3] })

        const value = await picker.evaluate(el => el.value)
        expect(value.x).toBeCloseTo(0.5, 1)
        expect(value.y).toBeCloseTo(-0.3, 1)
    })
})
