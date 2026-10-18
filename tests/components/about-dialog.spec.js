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
        await expect(dialog.locator('.hf-about-build-hash')).toHaveText('Build: local')
        await expect(dialog.locator('.hf-about-build-date')).toHaveText('Deployed: n/a')
    })

    test('minimal dialog omits optional fields and sections', async ({ page }) => {
        await page.click('#about-demo-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog.locator('.hf-about-tagline')).toHaveCount(0)
        await expect(dialog.locator('.hf-about-version')).toHaveCount(0)
        await expect(dialog.locator('.hf-about-graphic')).toHaveCount(0)
        // Optional sections are lazy-created — absent until populated
        await expect(dialog.locator('.hf-about-noisemaker-section')).toHaveCount(0)
        await expect(dialog.locator('.hf-about-ecosystem')).toHaveCount(0)
        // Divider is present but hidden via :last-child when no content follows
        await expect(dialog.locator('.hf-about-divider')).not.toBeVisible()
    })

    test('full dialog shows all fields', async ({ page }) => {
        await page.click('#about-demo-full-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog).toBeVisible()
        await expect(dialog.locator('.hf-about-name')).toHaveText('Noisedeck')
        await expect(dialog.locator('.hf-about-tagline')).toHaveText('GPU Video Synth')
        // Dialog strips product version to MAJOR.MINOR. Demo passes
        // `version: '1.9.0'` at construction, which renders as "Version 1.9".
        await expect(dialog.locator('.hf-about-version')).toHaveText('Version 1.9')
        await expect(dialog.locator('.hf-about-copyright')).toContainText('2020-2026')
    })

    test('full dialog shows build and deployed on separate lines with hash link', async ({ page }) => {
        await page.click('#about-demo-full-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog.locator('.hf-about-build-hash')).toContainText('Build: a1b2c3d4')
        await expect(dialog.locator('.hf-about-build-date')).toContainText('Deployed: 2026-04-01 14:30')
        const buildLink = dialog.locator('.hf-about-build-hash a')
        await expect(buildLink).toHaveText('a1b2c3d4')
        await expect(buildLink).toHaveAttribute('href', 'https://github.com/noisefactorllc/handfish/tree/a1b2c3d4')
    })

    test('full dialog shows noisemaker engine section with version, build, and deployed', async ({ page }) => {
        await page.click('#about-demo-full-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog.locator('.hf-about-noisemaker-heading')).toHaveText('Noisemaker Engine: 0.9.0')
        await expect(dialog.locator('.hf-about-noisemaker-hash')).toContainText('Build: f9e8d7c6')
        await expect(dialog.locator('.hf-about-noisemaker-date')).toContainText('Deployed: 2026-04-01 09:15')
        const nmLink = dialog.locator('.hf-about-noisemaker-hash a')
        await expect(nmLink).toHaveText('f9e8d7c6')
        await expect(nmLink).toHaveAttribute('href', 'https://github.com/noisefactorllc/noisemaker/tree/f9e8d7c6')
    })

    test('full dialog shows ecosystem blurb', async ({ page }) => {
        await page.click('#about-demo-full-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog.locator('.hf-about-ecosystem')).toContainText('Noise Factor')
    })

    test('full dialog shows divider between build info and tagline', async ({ page }) => {
        await page.click('#about-demo-full-btn')
        const dialog = page.locator('dialog.hf-about')
        await expect(dialog.locator('.hf-about-divider')).toBeVisible()
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
