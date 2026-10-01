import { test, expect } from '@playwright/test'

// Pin 'Courier New' to the vendored Liberation Mono (metric-compatible with
// the MS font and identical to what GitHub CI installs via
// `playwright install --with-deps`). Hosts without that alias substitute a
// different-metric mono font, which shifts the terminal theme's layout
// against the goldens. Same-origin: the test webServer serves the repo root.
// Test-only: the shipped theme CSS and the goldens are not changed.
const MONO_FONT_CSS = `
    @font-face {
        font-family: 'Courier New';
        src: url('/tests/fonts/LiberationMono-Regular.ttf');
        font-weight: 100 900;
    }
    @font-face {
        font-family: 'Courier New';
        src: url('/tests/fonts/LiberationMono-Bold.ttf');
        font-weight: 700;
    }
`

test.describe('Visual Regression', () => {
    test('examples page - dark mode', async ({ page }) => {
        await page.goto('/examples/')
        await page.addStyleTag({ content: MONO_FONT_CSS })
        // Wait for fonts and icons to load
        await page.waitForLoadState('networkidle')
        // Small delay for any CSS transitions to settle
        await page.waitForTimeout(500)
        await expect(page).toHaveScreenshot('examples-dark.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.01,
        })
    })

    test('examples page - light mode', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' })
        await page.goto('/examples/')
        await page.addStyleTag({ content: MONO_FONT_CSS })
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(500)
        await expect(page).toHaveScreenshot('examples-light.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.01,
        })
    })

    for (const theme of ['cyberpunk', 'earthy', 'corporate', 'organic', 'terminal']) {
        test(`examples page - ${theme} theme`, async ({ page }) => {
            await page.goto('/examples/')
            await page.addStyleTag({ content: MONO_FONT_CSS })
            await page.waitForLoadState('networkidle')
            await page.evaluate((t) => {
                document.documentElement.dataset.theme = t
            }, theme)
            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot(`examples-${theme}.png`, {
                fullPage: true,
                maxDiffPixelRatio: 0.01,
            })
        })
    }
})
