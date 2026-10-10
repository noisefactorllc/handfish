import { test, expect } from '@playwright/test'

test.describe('DropdownMenu', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/examples/')
        await page.waitForLoadState('networkidle')
    })

    test('click trigger opens menu', async ({ page }) => {
        const menu = page.locator('dropdown-menu#dm1')
        const trigger = menu.locator('.dropdown-trigger')
        const content = menu.locator('.dropdown-content')

        await expect(content).not.toBeVisible()
        await trigger.click()
        await expect(content).toBeVisible()
    })

    test('click item fires change event with value', async ({ page }) => {
        const menu = page.locator('dropdown-menu#dm1')
        const trigger = menu.locator('.dropdown-trigger')

        const changePromise = menu.evaluate(el =>
            new Promise(resolve =>
                el.addEventListener('change', e => resolve(e.detail), { once: true })
            )
        )

        await trigger.click()
        const firstItem = menu.locator('dropdown-item').first()
        const expectedValue = await firstItem.getAttribute('value')
        await firstItem.click()

        const detail = await changePromise
        expect(detail.value).toBe(expectedValue)
    })

    test('keyboard: ArrowDown opens, arrows navigate, Escape closes', async ({ page }) => {
        const menu = page.locator('dropdown-menu#dm1')
        const trigger = menu.locator('.dropdown-trigger')
        const content = menu.locator('.dropdown-content')

        // Focus and open with ArrowDown
        await trigger.focus()
        await page.keyboard.press('ArrowDown')
        await expect(content).toBeVisible()

        // Escape closes
        await page.keyboard.press('Escape')
        await expect(content).not.toBeVisible()
    })

    test('click outside closes menu', async ({ page }) => {
        const menu = page.locator('dropdown-menu#dm1')
        const trigger = menu.locator('.dropdown-trigger')
        const content = menu.locator('.dropdown-content')

        await trigger.click()
        await expect(content).toBeVisible()

        await page.locator('body').click({ position: { x: 10, y: 10 } })
        await expect(content).not.toBeVisible()
    })

    test('selectable mode tracks selected state', async ({ page }) => {
        const menu = page.locator('dropdown-menu#dm2')
        const trigger = menu.locator('.dropdown-trigger')

        // Open and select an item
        await trigger.click()
        const items = menu.locator('dropdown-item')
        const secondItem = items.nth(1)
        const secondValue = await secondItem.getAttribute('value')
        await secondItem.click()

        // Value should reflect the selection
        const value = await menu.evaluate(el => el.value)
        expect(value).toBe(secondValue)
    })

    test('only one menu open at a time', async ({ page }) => {
        const menu1 = page.locator('dropdown-menu#dm1')
        const menu2 = page.locator('dropdown-menu#dm2')

        // Open first menu
        await menu1.locator('.dropdown-trigger').click()
        await expect(menu1.locator('.dropdown-content')).toBeVisible()

        // Open second menu — first should close
        await menu2.locator('.dropdown-trigger').click()
        await expect(menu2.locator('.dropdown-content')).toBeVisible()
        await expect(menu1.locator('.dropdown-content')).not.toBeVisible()
    })

    // Item labels and values reach setItems as runtime data (file names,
    // preset names, session titles). They must be rendered as text and
    // attribute values, never parsed as HTML.
    test('setItems renders item data as text, not markup', async ({ page }) => {
        const menu = page.locator('dropdown-menu#dm1')
        const marker = 'dropdown-set-items-marker'

        await menu.evaluate((el, marker) => {
            el.setItems([
                { value: 'a"b', label: `<img src=x onerror="window['${marker}']=1">Plain & <b>bold</b>` },
                { value: 'plain', label: 'Normal item' },
                { value: 'danger', label: 'Delete', destructive: true },
            ])
        }, marker)

        const items = menu.locator('dropdown-item')
        await expect(items).toHaveCount(3)

        const first = items.nth(0)
        await expect(first).toHaveText('<img src=x onerror="window[\'dropdown-set-items-marker\']=1">Plain & <b>bold</b>')
        await expect(first).toHaveAttribute('value', 'a"b')
        await expect(first.locator('img')).toHaveCount(0)
        await expect(first.locator('b')).toHaveCount(0)

        await expect(items.nth(1)).toHaveText('Normal item')
        await expect(items.nth(2)).toHaveAttribute('destructive', '')

        // Nothing from the label executed as markup
        const leaked = await page.evaluate(flag => window[flag], marker)
        expect(leaked).toBeUndefined()
    })

    test('label and icon attributes render as text, not markup', async ({ page }) => {
        const probe = await page.evaluate(() => {
            const el = document.createElement('dropdown-menu')
            el.setAttribute('label', 'Settings <b>x</b>')
            el.setAttribute('icon', '<svg onload="window.__iconRan=1"></svg>')
            document.body.appendChild(el)
            return {
                text: el.querySelector('.trigger-text').textContent,
                icon: el.querySelector('.trigger-icon').textContent,
                boldCount: el.querySelectorAll('b').length,
                svgCount: el.querySelectorAll('svg').length,
                iconHidden: el.querySelector('.trigger-icon').style.display === 'none',
            }
        })

        expect(probe.text).toBe('Settings <b>x</b>')
        expect(probe.icon).toBe('<svg onload="window.__iconRan=1"></svg>')
        expect(probe.boldCount).toBe(0)
        expect(probe.svgCount).toBe(0)
        expect(probe.iconHidden).toBe(false)
        expect(await page.evaluate(() => window.__iconRan)).toBeUndefined()
    })

    test('label and icon attribute updates keep markup inert', async ({ page }) => {
        const menu = page.locator('dropdown-menu#dm1')
        await menu.evaluate(el => {
            el.setAttribute('label', 'Renamed <i>state</i>')
            el.setAttribute('icon', 'casino')
        })

        await expect(menu.locator('.trigger-text')).toHaveText('Renamed <i>state</i>')
        await expect(menu.locator('.trigger-text i')).toHaveCount(0)
        await expect(menu.locator('.trigger-icon')).toHaveText('casino')
    })
})
