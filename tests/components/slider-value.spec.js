import { test, expect } from '@playwright/test'

test.describe('SliderValue', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/examples/')
        await page.waitForLoadState('networkidle')
    })

    test('drag slider changes value', async ({ page }) => {
        const slider = page.locator('slider-value#slider1')
        const input = slider.locator('input[type="range"]')

        const valueBefore = await slider.evaluate(el => el.value)
        // Fill to a new value via the range input
        await input.fill('75')
        const valueAfter = await slider.evaluate(el => el.value)

        expect(Number(valueAfter)).toBe(75)
        expect(Number(valueAfter)).not.toBe(Number(valueBefore))
    })

    test('value display updates when slider changes', async ({ page }) => {
        const slider = page.locator('slider-value#slider1')
        const input = slider.locator('input[type="range"]')
        const display = slider.locator('.value-display')

        await input.fill('82')
        const displayText = await display.textContent()
        expect(displayText).toContain('82')
    })

    test('click value display to edit, type number, blur updates value', async ({ page }) => {
        const slider = page.locator('slider-value#slider1')
        const display = slider.locator('.value-display')

        // Focus the contenteditable display
        await display.click()
        // Select all using the platform's editing shortcut.
        await page.keyboard.press('ControlOrMeta+A')
        await page.keyboard.type('33')
        // Blur by clicking elsewhere
        await page.locator('body').click({ position: { x: 10, y: 10 } })

        const value = await slider.evaluate(el => el.value)
        expect(Number(value)).toBe(33)
    })

    test('change event fires on value commit', async ({ page }) => {
        const slider = page.locator('slider-value#slider1')
        const input = slider.locator('input[type="range"]')

        // Set up listener (non-blocking)
        await slider.evaluate(el => {
            el._testChangeFired = false
            el._testChangeValue = null
            el.addEventListener('change', () => {
                el._testChangeFired = true
                el._testChangeValue = el.value
            }, { once: true })
        })

        await input.fill('60')

        const result = await slider.evaluate(el => ({
            fired: el._testChangeFired,
            value: el._testChangeValue
        }))
        expect(result.fired).toBe(true)
        expect(Number(result.value)).toBe(60)
    })

    test('min/max bounds enforced', async ({ page }) => {
        const slider = page.locator('slider-value#slider1')
        const display = slider.locator('.value-display')

        // Try to set value above max
        await display.click()
        await page.keyboard.press('ControlOrMeta+A')
        await page.keyboard.type('999')
        await page.keyboard.press('Tab')

        const value = await slider.evaluate(el => Number(el.value))
        const max = await slider.evaluate(el => Number(el.max))
        expect(value).toBeLessThanOrEqual(max)
    })

    test('disabled blocks interaction', async ({ page }) => {
        const slider = page.locator('slider-value[disabled]').first()

        // The component should report itself as disabled
        const isDisabled = await slider.evaluate(el => el.disabled)
        expect(isDisabled).toBe(true)

        // Verify the disabled attribute is present
        await expect(slider).toHaveAttribute('disabled', '')
    })

    // Sends ArrowRight to the range, then types into the value display, and
    // returns the value after each keyboard path.
    const keyboardEdits = async (page, slider) => {
        await slider.locator('input[type="range"]').focus()
        await page.keyboard.press('ArrowRight')
        const afterArrow = await slider.evaluate(el => el.value)
        await slider.locator('.value-display').focus()
        await page.keyboard.press('ControlOrMeta+A')
        await page.keyboard.type('77')
        await page.keyboard.press('Tab')
        const afterTyping = await slider.evaluate(el => el.value)
        return { afterArrow, afterTyping }
    }

    test('an initially disabled slider rejects keyboard changes', async ({ page }) => {
        await page.evaluate(() => {
            document.body.insertAdjacentHTML('beforeend',
                '<slider-value id="disabled-at-connect" min="0" max="100" step="1" value="20" disabled></slider-value>')
        })
        const slider = page.locator('slider-value#disabled-at-connect')
        expect(await keyboardEdits(page, slider)).toEqual({ afterArrow: 20, afterTyping: 20 })
    })

    test('a slider disabled after connection rejects keyboard changes', async ({ page }) => {
        await page.evaluate(() => {
            document.body.insertAdjacentHTML('beforeend',
                '<slider-value id="disabled-later" min="0" max="100" step="1" value="20"></slider-value>')
            document.getElementById('disabled-later').disabled = true
        })
        const slider = page.locator('slider-value#disabled-later')
        expect(await keyboardEdits(page, slider)).toEqual({ afterArrow: 20, afterTyping: 20 })

        // Enabling it again restores both keyboard paths.
        await slider.evaluate(el => { el.disabled = false })
        expect(await keyboardEdits(page, slider)).toEqual({ afterArrow: 21, afterTyping: 77 })
    })

    test('assigning the value property respects min and max', async ({ page }) => {
        const state = await page.evaluate(() => {
            const form = document.createElement('form')
            form.innerHTML = '<slider-value name="gain" min="10" max="100" step="1"></slider-value>'
            document.body.appendChild(form)
            const slider = form.querySelector('slider-value')
            const read = () => ({
                value: slider.value,
                range: slider.querySelector('input').value,
                display: slider.querySelector('.value-display').textContent,
                submitted: new FormData(form).get('gain'),
            })
            slider.value = 999
            const above = read()
            slider.value = -5
            const below = read()
            slider.value = 42
            const inside = read()
            return { above, below, inside }
        })
        expect(state.above).toEqual({ value: 100, range: '100', display: '100', submitted: '100' })
        expect(state.below).toEqual({ value: 10, range: '10', display: '10', submitted: '10' })
        expect(state.inside).toEqual({ value: 42, range: '42', display: '42', submitted: '42' })
    })

    test('a mouse drag emits input while the button is down and one change on release', async ({ page }) => {
        const slider = page.locator('slider-value#slider1')
        const range = slider.locator('input[type="range"]')
        await slider.evaluate(el => {
            window.sliderEvents = []
            for (const type of ['input', 'change']) {
                el.addEventListener(type, event => window.sliderEvents.push(`${type}:${event.target.tagName}`))
            }
        })
        await range.scrollIntoViewIfNeeded()
        const box = await range.boundingBox()
        const y = box.y + box.height / 2
        await page.mouse.move(box.x + box.width * 0.5, y)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width * 0.6, y, { steps: 3 })
        await page.mouse.move(box.x + box.width * 0.7, y, { steps: 3 })
        const beforeRelease = await page.evaluate(() => window.sliderEvents.splice(0))
        await page.mouse.up()
        const afterRelease = await page.evaluate(() => window.sliderEvents.splice(0))

        // Continuous input from the component only: no committed change and
        // no second notification from the inner range.
        expect(beforeRelease.length).toBeGreaterThan(0)
        expect(new Set(beforeRelease)).toEqual(new Set(['input:SLIDER-VALUE']))
        // Release commits once.
        expect(afterRelease).toEqual(['change:SLIDER-VALUE'])
        expect(await slider.evaluate(el => el.value)).toBeGreaterThan(50)
    })

    test('a typed value commits one input and one change from the component', async ({ page }) => {
        const slider = page.locator('slider-value#slider1')
        const display = slider.locator('.value-display')
        await slider.evaluate(el => {
            window.sliderEvents = []
            for (const type of ['input', 'change']) {
                el.addEventListener(type, event => window.sliderEvents.push(`${type}:${event.target.tagName}`))
            }
        })
        await display.click()
        await page.keyboard.press('ControlOrMeta+A')
        await page.keyboard.type('33')
        await page.locator('body').click({ position: { x: 10, y: 10 } })
        expect(await page.evaluate(() => window.sliderEvents)).toEqual(['input:SLIDER-VALUE', 'change:SLIDER-VALUE'])
    })

    test('percent input commits the normalized stepped value to its form', async ({ page }) => {
        await page.evaluate(() => {
            const form = document.createElement('form')
            form.id = 'percent-form'
            form.innerHTML = '<slider-value id="percent-slider" name="mix" min="0" max="1" step="0.05" value="0.2" format="percent"></slider-value>'
            document.body.appendChild(form)
        })
        const slider = page.locator('#percent-slider')
        await slider.locator('.value-display').fill('76%')
        await page.keyboard.press('Tab')
        expect(await slider.evaluate(el => ({
            value: el.value,
            display: el.querySelector('.value-display').textContent,
            submitted: new FormData(el.closest('form')).get('mix'),
        }))).toEqual({ value: 0.75, display: '75%', submitted: '0.75' })
    })

    test('invalid typed text restores the value without emitting a committed change', async ({ page }) => {
        const slider = page.locator('slider-value#slider1')
        await slider.evaluate(el => {
            el.value = 42
            window.invalidEditEvents = []
            for (const type of ['input', 'change']) {
                el.addEventListener(type, () => window.invalidEditEvents.push(type))
            }
        })
        await slider.locator('.value-display').fill('not a number')
        await page.keyboard.press('Tab')
        expect(await slider.evaluate(el => el.value)).toBe(42)
        await expect(slider.locator('.value-display')).toHaveText('42')
        expect(await page.evaluate(() => window.invalidEditEvents)).toEqual([])
    })
})
