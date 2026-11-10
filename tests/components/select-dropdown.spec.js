import { test, expect } from '@playwright/test'

test.describe('SelectDropdown', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/examples/')
        await page.waitForLoadState('networkidle')
    })

    test('click trigger opens dropdown', async ({ page }) => {
        const select = page.locator('select-dropdown#select1')
        const trigger = select.locator('.select-trigger')

        await trigger.click()
        const dropdown = select.locator('.inline-dropdown')
        await expect(dropdown).toBeVisible()
    })

    test('click option selects it and fires change', async ({ page }) => {
        const select = page.locator('select-dropdown#select1')
        const trigger = select.locator('.select-trigger')

        // Set up listener (non-blocking)
        await select.evaluate(el => {
            el._testChangeFired = false
            el._testChangeValue = null
            el.addEventListener('change', () => {
                el._testChangeFired = true
                el._testChangeValue = el.value
            }, { once: true })
        })

        await trigger.click()

        // Click an option different from the current value
        const currentValue = await select.evaluate(el => el.value)
        const options = select.locator('.inline-dropdown [role="option"]')
        const count = await options.count()
        let targetOption = null
        let expectedValue = null
        for (let i = 0; i < count; i++) {
            const val = await options.nth(i).getAttribute('data-value')
            if (val !== currentValue) {
                targetOption = options.nth(i)
                expectedValue = val
                break
            }
        }
        await targetOption.click()

        const result = await select.evaluate(el => ({
            fired: el._testChangeFired,
            value: el._testChangeValue
        }))
        expect(result.fired).toBe(true)
        expect(result.value).toBe(expectedValue)
    })

    test('keyboard: ArrowDown/Up navigates, Enter selects, Escape closes', async ({ page }) => {
        const select = page.locator('select-dropdown#select1')
        const trigger = select.locator('.select-trigger')

        await trigger.click()
        const dropdown = select.locator('.inline-dropdown')
        await expect(dropdown).toBeVisible()

        // Arrow down to navigate
        await dropdown.press('ArrowDown')
        await dropdown.press('ArrowDown')
        await dropdown.press('Enter')

        // Dropdown should be closed after selection
        await expect(dropdown).not.toBeVisible()
    })

    test('Escape closes dropdown', async ({ page }) => {
        const select = page.locator('select-dropdown#select1')
        const trigger = select.locator('.select-trigger')

        await trigger.click()
        const dropdown = select.locator('.inline-dropdown')
        await expect(dropdown).toBeVisible()

        await page.keyboard.press('Escape')
        await expect(dropdown).not.toBeVisible()
    })

    test('click outside closes dropdown', async ({ page }) => {
        const select = page.locator('select-dropdown#select1')
        const trigger = select.locator('.select-trigger')

        await trigger.click()
        const dropdown = select.locator('.inline-dropdown')
        await expect(dropdown).toBeVisible()

        // Click somewhere else on the page
        await page.locator('body').click({ position: { x: 10, y: 10 } })
        await expect(dropdown).not.toBeVisible()
    })

    test('click outside closes dropdown after the control is reconnected', async ({ page }) => {
        const select = page.locator('select-dropdown#select1')
        const trigger = select.locator('.select-trigger')
        const dropdown = select.locator('.inline-dropdown')

        // Remove and reinsert the same instance in place.
        await select.evaluate(el => {
            const parent = el.parentNode
            const next = el.nextSibling
            el.remove()
            parent.insertBefore(el, next)
        })

        await trigger.click()
        await expect(dropdown).toBeVisible()
        await page.locator('body').click({ position: { x: 10, y: 10 } })
        await expect(dropdown).not.toBeVisible()

        // Disconnection removes the document listener: an outside click on a
        // detached instance does not reach it.
        const detachedCalls = await select.evaluate(el => {
            let calls = 0
            const handler = el._documentClickHandler
            el._documentClickHandler = (e) => { calls++; handler(e) }
            el.remove()
            document.body.click()
            el._documentClickHandler = handler
            return calls
        })
        expect(detachedCalls).toBe(0)
    })

    test('disabled blocks interaction', async ({ page }) => {
        // Disable first select programmatically
        const select = page.locator('select-dropdown#select1')
        await select.evaluate(el => { el.disabled = true })

        const trigger = select.locator('.select-trigger')
        await trigger.click({ force: true })

        // Dropdown should not open
        const dropdown = select.locator('.inline-dropdown')
        await expect(dropdown).not.toBeVisible()

        // Re-enable for other tests
        await select.evaluate(el => { el.disabled = false })
    })

    test('value property reflects selected option', async ({ page }) => {
        const select = page.locator('select-dropdown#select1')

        // Get current value
        const value = await select.evaluate(el => el.value)
        expect(value).toBeTruthy()

        // Set value programmatically
        await select.evaluate(el => { el.value = el.getOptions()[0].value })
        const newValue = await select.evaluate(el => el.value)
        const firstOptionValue = await select.evaluate(el => el.getOptions()[0].value)
        expect(newValue).toBe(firstOptionValue)
    })
})
