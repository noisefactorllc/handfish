import { test, expect } from '@playwright/test'

// The focusable widget of each composite component lives inside the host, so
// an aria-label/aria-labelledby on the host changes nothing unless the
// component forwards it. These tests pin the forwarding contract: the host's
// accessible name must reach every inner focusable widget.

test.describe('accessible-name forwarding', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/fixtures/aria-name-forwarding.html', { waitUntil: 'load' })
        await page.waitForFunction(() => window.__ready === true)
    })

    test('slider-value forwards aria-label to the range input and value display', async ({ page }) => {
        const host = page.locator('slider-value#sv')
        await expect(host.locator('.slider')).toHaveAccessibleName('Phase')
        // The contenteditable value display is named by its own value text;
        // forwarding the host label there would announce it twice per control.
        await expect(host.locator('.value-display')).not.toHaveAttribute('aria-label')
        await expect(host.locator('.value-display')).not.toHaveAttribute('aria-labelledby')
    })

    test('slider-value resolves aria-labelledby against the label span', async ({ page }) => {
        const host = page.locator('slider-value#sv-lbl-host')
        await expect(host.locator('.slider')).toHaveAccessibleName('Lfo rate')
        await expect(host.locator('.value-display')).not.toHaveAttribute('aria-labelledby')
    })

    test('toggle-switch forwards the host name to the switch track', async ({ page }) => {
        const host = page.locator('toggle-switch#ts')
        const track = host.locator('.ts-track')
        await expect(track).toHaveAccessibleName('Enable reverb')
        await expect(track).toHaveAttribute('role', 'switch')
    })

    test('toggle-switch resolves aria-labelledby against the label span', async ({ page }) => {
        const track = page.locator('toggle-switch#ts-lbl-host .ts-track')
        await expect(track).toHaveAccessibleName('Freeze playback')
    })

    test('select-dropdown forwards the host name to the trigger button', async ({ page }) => {
        const host = page.locator('select-dropdown#sd')
        await expect(host.locator('.select-trigger')).toHaveAccessibleName('Tempo divider')
    })

    test('select-dropdown resolves aria-labelledby against the label span', async ({ page }) => {
        const trigger = page.locator('select-dropdown#sd-lbl-host .select-trigger')
        await expect(trigger).toHaveAccessibleName('Warp mode')
    })

    test('color-picker forwards the host name to the swatch button', async ({ page }) => {
        const host = page.locator('color-picker#cp')
        await expect(host.locator('.swatch-button')).toHaveAccessibleName('Accent color')
    })

    test('color-picker resolves aria-labelledby against the label span', async ({ page }) => {
        const button = page.locator('color-picker#cp-lbl-host .swatch-button')
        await expect(button).toHaveAccessibleName('Background hue')
    })

    test('label updates made after connecting stay in sync', async ({ page }) => {
        const host = page.locator('toggle-switch#ts-plain')
        const track = host.locator('.ts-track')
        await expect(track).toHaveAccessibleName('')

        await host.evaluate(el => el.setAttribute('aria-label', 'Delay on'))
        await expect(track).toHaveAccessibleName('Delay on')

        await host.evaluate(el => el.setAttribute('aria-label', 'Delay off'))
        await expect(track).toHaveAccessibleName('Delay off')

        await host.evaluate(el => el.removeAttribute('aria-label'))
        await expect(track).toHaveAccessibleName('')
    })

    test('hosts without a label leave the inner widgets unnamed', async ({ page }) => {
        const slider = page.locator('slider-value#sv-plain .slider')
        await expect(slider).toHaveAccessibleName('')
        const track = page.locator('toggle-switch#ts-plain .ts-track')
        await expect(track).toHaveAccessibleName('')
    })
})
