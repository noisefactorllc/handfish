import { test, expect } from '@playwright/test'

async function mountDialog(page, attrs = {}) {
    await page.evaluate((attributes) => {
        // Close and remove any dialog a prior test left open — a lingering
        // showModal() dialog stays in the top layer and would swallow the
        // Escape key / backdrop clicks aimed at this test's instance.
        for (const stale of document.querySelectorAll('seance-dialog')) {
            stale.querySelector('dialog')?.close?.()
            stale.remove()
        }

        window.__seanceTest = { events: [] }

        const el = document.createElement('seance-dialog')
        el.id = 'seance-test'
        for (const [name, value] of Object.entries(attributes)) {
            el.setAttribute(name, value)
        }
        for (const type of ['take-online', 'join-session', 'go-offline', 'copy-url', 'cancel']) {
            el.addEventListener(type, (event) => {
                window.__seanceTest.events.push({ type, detail: event.detail || null })
            })
        }
        document.body.appendChild(el)
    }, attrs)
}

function events(page) {
    return page.evaluate(() => window.__seanceTest.events)
}

test.describe('SeanceDialog', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/examples/')
        await page.waitForLoadState('networkidle')
    })

    test('renders logo, logotype, and offline view by default', async ({ page }) => {
        await mountDialog(page)
        await page.evaluate(() => document.getElementById('seance-test').show())

        const dialog = page.locator('seance-dialog#seance-test dialog')
        await expect(dialog).toBeVisible()
        await expect(page.locator('seance-dialog#seance-test .hf-seance-graphic svg')).toBeVisible()
        await expect(page.locator('seance-dialog#seance-test .hf-seance-name')).toHaveText('Seance')
        await expect(page.locator('seance-dialog#seance-test .hf-seance-status-text')).toHaveText('Offline')
        await expect(page.locator('seance-dialog#seance-test [data-action="take-online"]')).toBeVisible()
        await expect(page.locator('seance-dialog#seance-test .hf-seance-join-input')).toBeVisible()
        await expect(page.locator('seance-dialog#seance-test .hf-seance-url')).toBeHidden()
        await expect(page.locator('seance-dialog#seance-test [data-action="go-offline"]')).toBeHidden()
    })

    test('logo svg inherits currentColor', async ({ page }) => {
        await mountDialog(page)
        const fill = await page.evaluate(() => {
            const svg = document.querySelector('seance-dialog#seance-test .hf-seance-graphic svg')
            return svg.getAttribute('fill')
        })
        expect(fill).toBe('currentColor')
    })

    test('take online button emits take-online', async ({ page }) => {
        await mountDialog(page)
        await page.evaluate(() => document.getElementById('seance-test').show())
        await page.locator('seance-dialog#seance-test [data-action="take-online"]').click()
        await expect.poll(() => events(page)).toEqual([{ type: 'take-online', detail: null }])
    })

    test('join form normalizes input and emits join-session with six-char id', async ({ page }) => {
        await mountDialog(page)
        await page.evaluate(() => document.getElementById('seance-test').show())

        const input = page.locator('seance-dialog#seance-test .hf-seance-join-input')
        await input.fill('ab-12*cd99')
        await expect(input).toHaveValue('ab12cd')
        await page.locator('seance-dialog#seance-test [data-action="join"]').click()
        await expect.poll(() => events(page)).toEqual([
            { type: 'join-session', detail: { sessionId: 'ab12cd' } },
        ])
    })

    test('short session id does not emit join-session', async ({ page }) => {
        await mountDialog(page)
        await page.evaluate(() => document.getElementById('seance-test').show())
        await page.locator('seance-dialog#seance-test .hf-seance-join-input').fill('abc')
        await page.locator('seance-dialog#seance-test [data-action="join"]').click()
        await page.waitForTimeout(150)
        expect(await events(page)).toEqual([])
    })

    test('online state shows indicator, session id, url bar, copy, and go offline', async ({ page }) => {
        await mountDialog(page, {
            'state': 'online',
            'session-id': 'Ab12Cd',
            'session-url': 'https://example.test/?features=onlineCollaboration&seance=Ab12Cd',
        })
        await page.evaluate(() => document.getElementById('seance-test').show())

        await expect(page.locator('seance-dialog#seance-test .hf-seance-status-text')).toHaveText('Online')
        await expect(page.locator('seance-dialog#seance-test [data-role="session-id"]')).toHaveText('Ab12Cd')
        await expect(page.locator('seance-dialog#seance-test .hf-seance-url'))
            .toHaveValue('https://example.test/?features=onlineCollaboration&seance=Ab12Cd')
        await expect(page.locator('seance-dialog#seance-test [data-action="copy-url"]')).toBeVisible()
        await expect(page.locator('seance-dialog#seance-test [data-action="go-offline"]')).toBeVisible()
        await expect(page.locator('seance-dialog#seance-test [data-action="take-online"]')).toBeHidden()
        await expect(page.locator('seance-dialog#seance-test .hf-seance-join-input')).toBeHidden()
    })

    test('copy button emits copy-url with the session url', async ({ page }) => {
        await mountDialog(page, {
            'state': 'online',
            'session-id': 'Ab12Cd',
            'session-url': 'https://example.test/?seance=Ab12Cd',
        })
        await page.evaluate(() => document.getElementById('seance-test').show())
        await page.locator('seance-dialog#seance-test [data-action="copy-url"]').click()
        await expect.poll(() => events(page)).toEqual([
            { type: 'copy-url', detail: { sessionUrl: 'https://example.test/?seance=Ab12Cd' } },
        ])
    })

    test('go offline emits go-offline and offline view returns when state flips', async ({ page }) => {
        await mountDialog(page, { 'state': 'online', 'session-id': 'Ab12Cd', 'session-url': 'https://x.test/' })
        await page.evaluate(() => document.getElementById('seance-test').show())
        await page.locator('seance-dialog#seance-test [data-action="go-offline"]').click()
        await expect.poll(() => events(page)).toEqual([{ type: 'go-offline', detail: null }])

        await page.evaluate(() => {
            const el = document.getElementById('seance-test')
            el.state = 'offline'
            el.sessionId = ''
            el.sessionUrl = ''
        })
        await expect(page.locator('seance-dialog#seance-test [data-action="take-online"]')).toBeVisible()
        await expect(page.locator('seance-dialog#seance-test .hf-seance-url')).toBeHidden()
    })

    test('connecting state disables actions and shows connecting text', async ({ page }) => {
        await mountDialog(page, { 'state': 'connecting' })
        await page.evaluate(() => document.getElementById('seance-test').show())
        await expect(page.locator('seance-dialog#seance-test .hf-seance-status-text')).toHaveText('Connecting…')
        await expect(page.locator('seance-dialog#seance-test [data-action="take-online"]')).toBeDisabled()
        await expect(page.locator('seance-dialog#seance-test [data-action="join"]')).toBeDisabled()
    })

    test('label attributes override defaults', async ({ page }) => {
        await mountDialog(page, {
            'heading': 'Go Online',
            'copy': 'Custom copy text.',
            'take-label': 'go live',
            'join-label': 'hop in',
            'copy-label': 'copy link',
            'offline-label': 'leave',
            'state': 'online',
            'session-id': 'Ab12Cd',
        })
        await page.evaluate(() => document.getElementById('seance-test').show())
        await expect(page.locator('seance-dialog#seance-test .hf-seance-name')).toHaveText('Go Online')
        await expect(page.locator('seance-dialog#seance-test [data-action="copy-url"]')).toHaveText('copy link')
        await expect(page.locator('seance-dialog#seance-test [data-action="go-offline"]')).toHaveText('leave')
    })

    test('escape closes the dialog and emits cancel', async ({ page }) => {
        await mountDialog(page)
        await page.evaluate(() => document.getElementById('seance-test').show())
        await expect(page.locator('seance-dialog#seance-test dialog')).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(page.locator('seance-dialog#seance-test dialog')).toBeHidden()
        await expect.poll(() => events(page)).toEqual([{ type: 'cancel', detail: null }])
    })

    test('backdrop click closes the dialog and emits cancel', async ({ page }) => {
        await mountDialog(page)
        await page.evaluate(() => document.getElementById('seance-test').show())
        await expect(page.locator('seance-dialog#seance-test dialog')).toBeVisible()
        // A real backdrop click resolves its target to the <dialog> element
        // itself (the padding region around the content). Dispatch that
        // directly rather than clicking a screen coordinate outside the
        // dialog, which could land on unrelated examples-page chrome.
        await page.locator('seance-dialog#seance-test dialog').dispatchEvent('click')
        await expect(page.locator('seance-dialog#seance-test dialog')).toBeHidden()
        await expect.poll(() => events(page)).toEqual([{ type: 'cancel', detail: null }])
    })

    test('SEANCE_LOGO_SVG is exported for app trigger buttons', async ({ page }) => {
        // Import the component module directly (not the barrel) so this does
        // not re-run every other component's customElements.define and throw
        // a duplicate-registration error under the already-bundled page.
        const exported = await page.evaluate(async () => {
            const mod = await import('/src/components/seance-dialog/SeanceDialog.js')
            return {
                hasClass: typeof mod.SeanceDialog === 'function',
                logoIsSvg: typeof mod.SEANCE_LOGO_SVG === 'string'
                    && mod.SEANCE_LOGO_SVG.startsWith('<svg')
                    && mod.SEANCE_LOGO_SVG.includes('currentColor'),
            }
        })
        expect(exported).toEqual({ hasClass: true, logoIsSvg: true })
    })
})
