import { test, expect } from '@playwright/test'

test.describe('AboutDialog', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/examples/')
        await page.waitForLoadState('networkidle')
    })

    test('minimal dialog opens and shows name', async ({ page }) => {
        await page.click('#about-demo-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog).toBeVisible()
        await expect(dialog.locator('.hf-about-name')).toHaveText('Demo App')
    })

    test('minimal dialog has copyright and default build info', async ({ page }) => {
        await page.click('#about-demo-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog.locator('.hf-about-copyright')).toContainText('Noise Factor LLC.')
        await expect(dialog.locator('.hf-about-build')).toHaveText('build: local / deployed: n/a')
    })

    test('minimal dialog omits optional fields', async ({ page }) => {
        await page.click('#about-demo-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog.locator('.hf-about-tagline')).toHaveCount(0)
        await expect(dialog.locator('.hf-about-authors')).toHaveCount(0)
        await expect(dialog.locator('.hf-about-version')).toHaveCount(0)
        await expect(dialog.locator('.hf-about-ecosystem')).toHaveCount(0)
        await expect(dialog.locator('.hf-about-graphic')).toHaveCount(0)
    })

    test('full dialog shows all fields', async ({ page }) => {
        await page.click('#about-demo-full-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog).toBeVisible()
        await expect(dialog.locator('.hf-about-name')).toHaveText('Noisedeck')
        await expect(dialog.locator('.hf-about-tagline')).toHaveText('GPU Video Synth')
        await expect(dialog.locator('.hf-about-authors')).toHaveText('jess hewitt and alex ayars')
        await expect(dialog.locator('.hf-about-version')).toHaveText('version 1.9.0')
        await expect(dialog.locator('.hf-about-copyright')).toContainText('2020-2026')
    })

    test('full dialog shows build info with hash link', async ({ page }) => {
        await page.click('#about-demo-full-btn')
        const dialog = page.locator('dialog.hf-about')
        const buildLink = dialog.locator('.hf-about-build:not(.hf-about-noisemaker) a')
        await expect(buildLink).toHaveText('a1b2c3d4')
        await expect(buildLink).toHaveAttribute('href', 'https://github.com/noisefactorllc/noisedeck/tree/a1b2c3d4')
    })

    test('full dialog shows noisemaker version with link', async ({ page }) => {
        await page.click('#about-demo-full-btn')
        const dialog = page.locator('dialog.hf-about')
        const nmLink = dialog.locator('.hf-about-noisemaker a')
        await expect(nmLink).toHaveText('f9e8d7c6')
        await expect(nmLink).toHaveAttribute('href', 'https://github.com/noisefactorllc/noisemaker/tree/f9e8d7c6')
    })

    test('full dialog shows ecosystem blurb', async ({ page }) => {
        await page.click('#about-demo-full-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog.locator('.hf-about-ecosystem')).toContainText('Noise Factor')
    })

    test('full dialog shows logo', async ({ page }) => {
        await page.click('#about-demo-full-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog.locator('.hf-about-graphic svg')).toBeVisible()
    })

    test('backdrop click closes dialog', async ({ page }) => {
        await page.click('#about-demo-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog).toBeVisible()

        // Click on the backdrop (viewport edge, outside dialog content)
        await page.mouse.click(5, 5)
        await expect(dialog).not.toBeVisible()
    })

    test('Escape key closes dialog', async ({ page }) => {
        await page.click('#about-demo-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog).toBeVisible()

        await page.keyboard.press('Escape')
        await expect(dialog).not.toBeVisible()
    })

    test('CSS is injected only once', async ({ page }) => {
        // Both buttons create dialogs — styles should inject once
        const styleCount = await page.evaluate(() =>
            document.querySelectorAll('#hf-about-styles').length
        )
        expect(styleCount).toBe(1)
    })
})
