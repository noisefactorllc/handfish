import { test, expect } from '@playwright/test'

const FONT_URL = '/tests/fonts/LiberationMono-Regular.ttf'

const LONG_LINE = Array.from({ length: 60 }, (_, index) => `word${index}`).join(' ')

const VALUE = ['first', LONG_LINE, 'third', 'fourth', 'fifth'].join('\n')

/** Rendered position and height of every code line and its line number. */
function measure(page) {
    return page.evaluate(() => {
        const editor = document.getElementById('late-font-editor')
        const lines = [...editor.querySelectorAll('.code-editor-display .code-line')]
        const numbers = [...editor.querySelectorAll('.code-editor-gutter .line-number')]
        return {
            tallestLine: Math.max(...lines.map(line => line.getBoundingClientRect().height)),
            tallestNumber: Math.max(...numbers.map(number => number.getBoundingClientRect().height)),
            drift: Math.max(...lines.map((line, index) => Math.abs(
                numbers[index].getBoundingClientRect().top - line.getBoundingClientRect().top,
            ))),
        }
    })
}

test.describe('CodeEditor line numbers', () => {
    test('stay beside their lines when a web font lands after the first measure', async ({ page }) => {
        let release
        const held = new Promise(resolve => { release = resolve })
        await page.route(`**${FONT_URL}`, async route => {
            await held
            await route.continue()
        })

        await page.goto('/examples/')
        await page.waitForLoadState('networkidle')

        // Mount under the fallback, which is narrower than the web font, so the
        // long line takes more rows once the font lands.
        await page.evaluate(({ url, value }) => {
            const style = document.createElement('style')
            style.textContent = `@font-face {
                font-family: "Late Mono";
                src: url("${url}") format("truetype");
                font-display: swap;
            }`
            document.head.appendChild(style)

            const editor = document.createElement('code-editor')
            editor.id = 'late-font-editor'
            editor.style.width = '420px'
            editor.style.height = '240px'
            editor.setAttribute('font-family', '"Late Mono", serif')
            document.body.appendChild(editor)
            editor.value = value
        }, { url: FONT_URL, value: VALUE })

        await expect.poll(async () => (await measure(page)).drift).toBeLessThanOrEqual(1)
        const before = await measure(page)
        expect(before.tallestNumber).toBe(before.tallestLine)

        release()
        await page.waitForFunction(() => document.fonts.check('14px "Late Mono"'))

        await expect.poll(async () => (await measure(page)).tallestLine).toBeGreaterThan(before.tallestLine)
        await expect.poll(async () => (await measure(page)).drift).toBeLessThanOrEqual(1)
        const after = await measure(page)
        expect(after.tallestNumber).toBe(after.tallestLine)
    })

    test('stop listening for font loads while the editor is detached', async ({ page }) => {
        await page.goto('/examples/')
        await page.waitForLoadState('networkidle')

        const counts = await page.evaluate(async () => {
            let listeners = 0
            const add = document.fonts.addEventListener.bind(document.fonts)
            const remove = document.fonts.removeEventListener.bind(document.fonts)
            document.fonts.addEventListener = (type, ...rest) => {
                if (type === 'loadingdone') listeners += 1
                return add(type, ...rest)
            }
            document.fonts.removeEventListener = (type, ...rest) => {
                if (type === 'loadingdone') listeners -= 1
                return remove(type, ...rest)
            }

            const editor = document.createElement('code-editor')
            document.body.appendChild(editor)
            const attached = listeners
            editor.remove()
            const detached = listeners
            document.body.appendChild(editor)
            const reattached = listeners
            editor.remove()
            return { attached, detached, reattached, final: listeners }
        })

        expect(counts).toEqual({ attached: 1, detached: 0, reattached: 1, final: 0 })
    })
})
