import { test, expect } from '@playwright/test'

async function mountEditor(page, options = {}) {
    const {
        id = 'collab-editor',
        value = '',
        height = '180px',
        lineNumbers = true,
    } = options

    await page.evaluate(({ id: editorId, value: initialValue, height: editorHeight, lineNumbers: showLineNumbers }) => {
        document.getElementById(editorId)?.remove()

        window.__editorTest = {
            inputEvents: [],
            selectionEvents: [],
        }

        const editor = document.createElement('code-editor')
        editor.id = editorId
        editor.style.height = editorHeight
        editor.style.border = '1px solid var(--hf-border)'
        editor.style.borderRadius = 'var(--hf-radius-sm)'
        if (!showLineNumbers) {
            editor.setAttribute('line-numbers', 'false')
        }

        editor.addEventListener('input', (event) => {
            if (event.target !== editor) return
            window.__editorTest.inputEvents.push(structuredClone(event.detail))
        })
        editor.addEventListener('selectionchange', (event) => {
            if (event.target !== editor) return
            window.__editorTest.selectionEvents.push(structuredClone(event.detail))
        })

        document.body.appendChild(editor)
        editor.value = initialValue
    }, { id, value, height, lineNumbers })
}

test.describe('CodeEditor collaboration contract', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/examples/')
        await page.waitForLoadState('networkidle')
    })

    test('preserves baseline editor behavior while collaboration features are added', async ({ page }) => {
        const editor1 = page.locator('#editor1')
        const editor2 = page.locator('#editor2')

        await expect(editor1.locator('.code-editor-display .hl-comment')).toContainText('// Noisemaker DSL example')
        await expect(editor2.locator('.code-editor-display')).toContainText('Plain text editor')

        const baseline = await page.evaluate(() => {
            const editor = document.getElementById('editor2')
            const textarea = editor.querySelector('.code-editor-textarea')
            const display = editor.querySelector('.code-editor-display')
            const gutter = editor.querySelector('.code-editor-gutter')

            const values = []
            editor.addEventListener('input', (event) => values.push(event.detail.value), { once: true })

            textarea.focus()
            textarea.setSelectionRange(textarea.value.length, textarea.value.length)
            textarea.value += '\nmore'
            textarea.dispatchEvent(new Event('input', { bubbles: true }))

            editor.value = Array.from({ length: 40 }, (_, index) => `line ${index + 1}`).join('\n')
            textarea.scrollTop = 48
            textarea.dispatchEvent(new Event('scroll'))

            return {
                value: editor.value,
                lastInputValue: values.at(-1),
                displayTransform: display.style.transform,
                gutterTransform: gutter.style.transform,
                gutterVisible: getComputedStyle(gutter).display,
            }
        })

        expect(baseline.value).toContain('line 40')
        expect(baseline.lastInputValue).toContain('more')
        expect(baseline.displayTransform).toBe('translateY(-48px)')
        expect(baseline.gutterTransform).toBe('translateY(-48px)')
        expect(baseline.gutterVisible).not.toBe('none')

        await mountEditor(page, { id: 'baseline-attrs', value: 'x', lineNumbers: false })
        await expect(page.locator('#baseline-attrs .code-editor-gutter')).toBeHidden()
    })

    test('emits enriched input detail for user edits', async ({ page }) => {
        await mountEditor(page, { value: 'abc' })

        const textarea = page.locator('#collab-editor .code-editor-textarea')
        await textarea.click()
        await textarea.press('End')
        await page.keyboard.type('d')

        const inputEvent = await page.evaluate(() => window.__editorTest.inputEvents.at(-1))
        expect(inputEvent).toEqual({
            previousValue: 'abc',
            value: 'abcd',
            edit: { start: 3, end: 3, text: 'd' },
            source: 'user',
        })
    })

    test('emits selectionchange for keyboard and programmatic selection updates', async ({ page }) => {
        await mountEditor(page, { value: 'alpha beta' })

        const textarea = page.locator('#collab-editor .code-editor-textarea')
        await textarea.click()
        await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            editor.setSelectionRange(10, 10, 'none')
            window.__editorTest.selectionEvents = []
        })

        await page.keyboard.down('Shift')
        await page.keyboard.press('ArrowLeft')
        await page.keyboard.up('Shift')

        await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            editor.setSelectionRange(0, 5, 'forward')
        })

        const events = await page.evaluate(() => window.__editorTest.selectionEvents)
        expect(events).toEqual([
            { start: 9, end: 10, direction: 'backward', value: 'alpha beta' },
            { start: 0, end: 5, direction: 'forward', value: 'alpha beta' },
        ])
    })

    test('supports replaceRange and applyTextEdit selection policies', async ({ page }) => {
        await mountEditor(page, { value: 'hello world' })

        const outcome = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')

            editor.setSelectionRange(6, 11, 'forward')
            editor.replaceRange(6, 11, 'friend', {
                select: 'inserted',
                emitInput: true,
                source: 'remote-sync',
            })

            const afterReplace = {
                value: editor.value,
                selection: editor.getSelectionRange(),
                input: window.__editorTest.inputEvents.at(-1),
            }

            editor.setSelectionRange(0, 5, 'forward')
            editor.applyTextEdit({ start: 0, end: 5, text: 'goodbye' }, { select: 'preserve' })

            return {
                afterReplace,
                afterApply: {
                    value: editor.value,
                    selection: editor.getSelectionRange(),
                },
            }
        })

        expect(outcome.afterReplace).toEqual({
            value: 'hello friend',
            selection: { start: 6, end: 12, direction: 'forward' },
            input: {
                previousValue: 'hello world',
                value: 'hello friend',
                edit: { start: 6, end: 11, text: 'friend' },
                source: 'remote-sync',
            },
        })
        expect(outcome.afterApply).toEqual({
            value: 'goodbye friend',
            selection: { start: 0, end: 7, direction: 'forward' },
        })
    })

    test('renders remote selections and cursors in the display layer without mutating editor value', async ({ page }) => {
        await mountEditor(page, { value: 'alpha\nbeta\ngamma' })

        const snapshot = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            editor.setRemoteSelections([
                { id: 'peer-a', label: 'Ada', color: '#ff4d6d', start: 0, end: 5, updatedAt: 1 },
                { id: 'peer-b', label: 'Bea', color: '#4dabf7', start: 6, end: 6, updatedAt: 2 },
            ])
            return {
                value: editor.value,
                html: editor.getDisplay().innerHTML,
            }
        })

        expect(snapshot.value).toBe('alpha\nbeta\ngamma')
        await expect(page.locator('#collab-editor .code-editor-display .code-editor-remote-selection')).toHaveCount(1)
        await expect(page.locator('#collab-editor .code-editor-display .code-editor-remote-cursor')).toHaveCount(1)
        await expect(page.locator('#collab-editor .code-editor-display .code-editor-remote-selection')).toHaveAttribute('data-remote-label', 'Ada')
        await expect(page.locator('#collab-editor .code-editor-display .code-editor-remote-cursor')).toHaveAttribute('data-remote-label', 'Bea')

        const pointerEvents = await page.locator('#collab-editor .code-editor-display .code-editor-remote-selection').evaluate((node) => getComputedStyle(node).pointerEvents)
        expect(pointerEvents).toBe('none')
        expect(snapshot.html).toContain('code-editor-remote-selection')
    })

    test('keeps remote decorations and flash markers across rerenders and scroll sync', async ({ page }) => {
        await mountEditor(page, { value: 'line 1\nline 2\nline 3\nline 4\nline 5\nline 6', height: '120px' })

        const state = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            const textarea = editor.getTextarea()

            editor.setRemoteSelection({ id: 'peer-a', label: 'Ada', color: '#ff4d6d', start: 8, end: 14, updatedAt: 1 })
            editor.flashLines(2, 4, { tone: 'remote' })

            textarea.scrollTop = 42
            textarea.dispatchEvent(new Event('scroll'))

            editor.setTokenizer((line) => [{ type: 'identifier', text: line.toUpperCase() }])
            editor.syncDisplay()

            return {
                scrollTop: textarea.scrollTop,
                displayTransform: editor.getDisplay().style.transform,
                remoteCount: editor.getDisplay().querySelectorAll('.code-editor-remote-selection').length,
                flashCount: editor.getDisplay().querySelectorAll('.code-line.flash-remote').length,
            }
        })

        expect(state.displayTransform).toBe(`translateY(-${state.scrollTop}px)`)
        expect(state.remoteCount).toBe(1)
        expect(state.flashCount).toBe(3)
    })

    test('exposes collabApiVersion statically and on instances', async ({ page }) => {
        const versions = await page.evaluate(() => {
            const EditorClass = customElements.get('code-editor')
            const editor = document.createElement('code-editor')
            return {
                staticVersion: EditorClass.collabApiVersion,
                instanceVersion: editor.collabApiVersion,
            }
        })

        expect(versions).toEqual({
            staticVersion: 1,
            instanceVersion: 1,
        })
    })
})

test.describe('Shared collaboration affordances', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/examples/')
        await page.waitForLoadState('networkidle')
    })

    test('renders session status and emits copy/go-offline events', async ({ page }) => {
        await page.evaluate(() => {
            document.getElementById('session-status-test')?.remove()
            window.__sessionStatusEvents = []

            const status = document.createElement('session-status')
            status.id = 'session-status-test'
            status.setAttribute('state', 'online')
            status.setAttribute('session-id', 'ABC123')
            status.setAttribute('session-url', 'https://example.test/app?seance=ABC123')
            status.addEventListener('copy-url', () => window.__sessionStatusEvents.push('copy-url'))
            status.addEventListener('go-offline', () => window.__sessionStatusEvents.push('go-offline'))

            document.body.appendChild(status)
        })

        await expect(page.locator('#session-status-test')).toContainText('ABC123')
        await expect(page.locator('#session-status-test')).toContainText('Online')

        await page.click('#session-status-test [data-action="copy-url"]')
        await page.click('#session-status-test [data-action="go-offline"]')

        const events = await page.evaluate(() => window.__sessionStatusEvents)
        expect(events).toEqual(['copy-url', 'go-offline'])
    })

    test('shows a join-session dialog and emits join-session on submit', async ({ page }) => {
        await page.evaluate(() => {
            document.getElementById('join-session-test')?.remove()
            window.__joinSessionEvents = []

            const prompt = document.createElement('join-session-dialog')
            prompt.id = 'join-session-test'
            prompt.addEventListener('join-session', (event) => {
                window.__joinSessionEvents.push(structuredClone(event.detail))
            })
            document.body.appendChild(prompt)
            prompt.show({ sessionId: 'ab12cd' })
        })

        const dialog = page.locator('#join-session-test dialog')
        await expect(dialog).toBeVisible()
        await expect(dialog.locator('input[name="sessionId"]')).toHaveValue('AB12CD')

        await dialog.locator('input[name="sessionId"]').fill('zx90yx')
        await dialog.locator('button[type="submit"]').click()

        const events = await page.evaluate(() => window.__joinSessionEvents)
        expect(events).toEqual([{ sessionId: 'ZX90YX' }])
        await expect(dialog).not.toBeVisible()
    })

    test('registers the join-session dialog with escape handling', async ({ page }) => {
        await page.evaluate(() => {
            document.getElementById('join-session-escape')?.remove()
            const prompt = document.createElement('join-session-dialog')
            prompt.id = 'join-session-escape'
            document.body.appendChild(prompt)
            prompt.show()
        })

        const dialog = page.locator('#join-session-escape dialog')
        await expect(dialog).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(dialog).not.toBeVisible()
    })
})
