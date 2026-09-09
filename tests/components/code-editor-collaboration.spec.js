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
            const inputTargets = []
            editor.addEventListener('input', (event) => values.push(event.detail.value), { once: true })
            editor.addEventListener('input', (event) => {
                inputTargets.push(event.target === textarea ? 'textarea' : event.target.tagName.toLowerCase())
            })

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
                inputTargets,
            }
        })

        expect(baseline.value).toContain('line 40')
        expect(baseline.lastInputValue).toContain('more')
        expect(baseline.displayTransform).toBe('translateY(-48px)')
        expect(baseline.gutterTransform).toBe('translateY(-48px)')
        expect(baseline.gutterVisible).not.toBe('none')
        expect(baseline.inputTargets).toEqual(expect.arrayContaining(['code-editor', 'textarea']))

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

    test('emits compile shortcut events without app-local editor enhancers', async ({ page }) => {
        await mountEditor(page, { value: 'alpha\nbeta' })
        await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            window.__editorTest.compileEvents = []
            editor.addEventListener('forcerecompile', () => window.__editorTest.compileEvents.push('compile'))
            editor.addEventListener('forceevalblock', () => window.__editorTest.compileEvents.push('block'))
        })

        const textarea = page.locator('#collab-editor .code-editor-textarea')
        await textarea.focus()
        await page.keyboard.press('Control+Enter')
        await page.keyboard.press('Control+Shift+Enter')
        await page.keyboard.press('Alt+Enter')

        const events = await page.evaluate(() => window.__editorTest.compileEvents)
        expect(events).toEqual(['compile', 'block', 'block'])
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

    test('emits selectionchange when value setter clamps selection', async ({ page }) => {
        await mountEditor(page, { value: 'alpha beta' })

        const events = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            editor.setSelectionRange(10, 10, 'none')
            window.__editorTest.selectionEvents = []
            editor.value = 'abc'
            return window.__editorTest.selectionEvents
        })

        expect(events).toEqual([
            { start: 3, end: 3, direction: 'none', value: 'abc' },
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
                { id: 'peer-b', label: 'Bea', color: '#4dabf7', start: 6, end: 10, updatedAt: 2 },
                { id: 'peer-c', label: 'Cam', color: '#51cf66', start: 12, end: 12, updatedAt: 3 },
            ])
            return {
                value: editor.value,
                html: editor.getDisplay().innerHTML,
            }
        })

        expect(snapshot.value).toBe('alpha\nbeta\ngamma')
        await expect(page.locator('#collab-editor .code-editor-display .code-editor-remote-selection')).toHaveCount(2)
        await expect(page.locator('#collab-editor .code-editor-display .code-editor-remote-cursor')).toHaveCount(1)
        await expect(page.locator('#collab-editor .code-editor-display .code-editor-remote-selection').first()).toHaveAttribute('data-remote-label', 'Ada')
        await expect(page.locator('#collab-editor .code-editor-display .code-editor-remote-cursor')).toHaveAttribute('data-remote-label', 'Cam')

        const pointerEvents = await page.locator('#collab-editor .code-editor-display .code-editor-remote-selection').first().evaluate((node) => getComputedStyle(node).pointerEvents)
        expect(pointerEvents).toBe('none')
        expect(snapshot.html).toContain('code-editor-remote-selection')
    })

    test('normalizes remote selection ids when clearing one selection', async ({ page }) => {
        await mountEditor(page, { value: 'alpha beta' })

        const remaining = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            editor.setRemoteSelection({ id: 1, label: 'One', color: '#ff4d6d', start: 0, end: 5 })
            editor.clearRemoteSelection(1)
            return editor.getDisplay().querySelectorAll('.code-editor-remote-selection, .code-editor-remote-cursor').length
        })

        expect(remaining).toBe(0)
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

    test('clears flash markers when disconnected before timer expires', async ({ page }) => {
        await mountEditor(page, { value: 'line 1\nline 2\nline 3' })

        const flashCount = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            editor.flashLines(1, 2, { tone: 'remote' })
            editor.remove()
            document.body.appendChild(editor)
            return editor.getDisplay().querySelectorAll('.code-line.flash-remote').length
        })

        expect(flashCount).toBe(0)
    })

    test('normalizes unsupported flash tones to the eval tone', async ({ page }) => {
        await mountEditor(page, { value: 'line 1\nline 2' })

        const classes = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            editor.flashLines(1, 1, { tone: 'remote danger' })
            return Array.from(editor.getDisplay().querySelectorAll('.code-line'))
                .map((line) => line.className)
        })

        expect(classes[0]).toContain('flash-eval')
        expect(classes[0]).not.toContain('flash-remote danger')
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
            staticVersion: 2,
            instanceVersion: 2,
        })
    })

    test('the value setter keeps the caret and the scroll position', async ({ page }) => {
        // The SDK assigns .value for every remote update it cannot express as
        // a range edit, which is most of them once local text is pending. When
        // that threw the caret to the end of the document, the local typist
        // lost their place and broadcast the wrong cursor.
        await mountEditor(page, { value: Array.from({ length: 40 }, (_, i) => `line ${i + 1}`).join('\n'), height: '120px' })

        const outcome = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            const textarea = editor.getTextarea()
            textarea.focus()
            editor.setSelectionRange(7, 7, 'none')
            textarea.scrollTop = 40
            window.__editorTest.selectionEvents = []

            // A peer inserted a line above the caret.
            const next = editor.value.replace('line 1\n', 'line 1\nremote\n')
            editor.value = next

            return {
                selection: editor.getSelectionRange(),
                scrollTop: textarea.scrollTop,
                emitted: window.__editorTest.selectionEvents.map((event) => event.start),
                value: editor.value.split('\n').slice(0, 3),
            }
        })

        expect(outcome.value).toEqual(['line 1', 'remote', 'line 2'])
        // "line 1\n" is 7 chars, so the caret sat exactly where the peer's
        // "remote\n" (7 more) went in, and rides to the end of it.
        expect(outcome.selection).toEqual({ start: 14, end: 14, direction: 'none' })
        expect(outcome.scrollTop).toBe(40)
        expect(outcome.emitted).toEqual([14])
    })

    test('a programmatic write stays silent on the app listener', async ({ page }) => {
        // Assigning .value has never produced an input event, and an app is
        // entitled to read one as "the user changed this". Routing edits
        // through the browser's undo stack fires real input events on the
        // textarea, so they must not escape the component.
        await mountEditor(page, { value: 'hello' })

        const counts = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            const textarea = editor.getTextarea()
            textarea.focus()
            const seen = { host: 0, bubbled: 0 }
            editor.addEventListener('input', (event) => {
                if (event.target === editor) seen.host += 1
                else seen.bubbled += 1
            })
            document.addEventListener('input', () => { seen.bubbled += 1 }, { once: false })

            editor.value = 'hello world'
            editor.applyTextEdit({ start: 0, end: 0, text: '>> ' }, { source: 'remote' })
            return { ...seen, value: editor.value }
        })

        expect(counts.value).toBe('>> hello world')
        expect(counts).toMatchObject({ host: 0, bubbled: 0 })
    })

    test('an unfocused load leaves a caret, never a selection', async ({ page }) => {
        // A stale range mapped through a whole-document load would sit there
        // selected, and the next insert-at-cursor helper would replace it.
        await mountEditor(page, { value: 'search synth\n\nnoise().write(o0)' })

        const outcome = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            const textarea = editor.getTextarea()
            textarea.focus()
            editor.setSelectionRange(14, 21, 'forward')
            textarea.blur()
            document.body.focus()

            editor.value = 'search synth\n\nsolid(g: 1).write(o0)'
            const selection = editor.getSelectionRange()
            return { selection, collapsed: selection.start === selection.end, length: editor.value.length }
        })

        expect(outcome.collapsed).toBe(true)
        expect(outcome.selection.start).toBe(outcome.length)
    })

    test('a remote edit does not throw away the local undo history', async ({ page }) => {
        await mountEditor(page, { value: 'hello' })
        const textarea = page.locator('#collab-editor .code-editor-textarea')
        await textarea.click()
        await textarea.press('End')
        await page.keyboard.type(' world')

        await page.evaluate(() => {
            document.getElementById('collab-editor').applyTextEdit({ start: 0, end: 0, text: '>> ' }, { source: 'remote' })
        })
        await textarea.focus()
        await page.keyboard.press('ControlOrMeta+z')

        // The remote insert is itself undoable, so the first undo takes it
        // back; what matters is that the local typing underneath survived.
        await page.keyboard.press('ControlOrMeta+z')
        const value = await page.evaluate(() => document.getElementById('collab-editor').value)
        expect(value).not.toBe('>> hello world')
        expect(value.replace('>> ', '')).not.toBe('hello world')
    })

    test('remote carets follow the text when anyone edits', async ({ page }) => {
        await mountEditor(page, { value: 'hello world' })

        const outcome = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            editor.setRemoteSelection({ id: 'peer', label: 'Peer', color: '#ff6b6b', start: 6, end: 11 })
            const read = () => {
                const span = editor.getDisplay().querySelector('.code-editor-remote-selection')
                return span ? span.textContent : null
            }
            const before = read()

            // Local typing ahead of the peer's selection.
            const textarea = editor.getTextarea()
            textarea.focus()
            textarea.setSelectionRange(0, 0)
            document.execCommand('insertText', false, 'XX')
            const afterLocal = read()

            // A remote edit ahead of it, through the collab API.
            editor.applyTextEdit({ start: 0, end: 0, text: 'YY' }, { source: 'remote' })
            const afterRemote = read()

            return { before, afterLocal, afterRemote, value: editor.value }
        })

        expect(outcome.value).toBe('YYXXhello world')
        expect(outcome.before).toBe('world')
        expect(outcome.afterLocal).toBe('world')
        expect(outcome.afterRemote).toBe('world')
    })

    test('pruneRemoteSelections drops carets from peers that stopped reporting', async ({ page }) => {
        await mountEditor(page, { value: 'hello world' })

        const outcome = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            const now = Date.now()
            editor.setRemoteSelections([
                { id: 'gone', label: 'Gone', color: '#ff6b6b', start: 0, end: 5, updatedAt: now - 60000 },
                { id: 'here', label: 'Here', color: '#4dabf7', start: 6, end: 11, updatedAt: now },
            ])
            const removed = editor.pruneRemoteSelections(30000, now)
            return {
                removed,
                remaining: [...editor.getDisplay().querySelectorAll('.code-editor-remote-selection')]
                    .map((node) => node.dataset.remoteLabel),
            }
        })

        expect(outcome.removed).toEqual(['gone'])
        expect(outcome.remaining).toEqual(['Here'])
    })

    test('an out-of-range remote edit still applies but reports the desync', async ({ page }) => {
        await mountEditor(page, { value: 'abc' })

        const outcome = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            const events = []
            editor.addEventListener('collabdesync', (event) => events.push(structuredClone(event.detail)))
            editor.applyTextEdit({ start: 100, end: 200, text: 'Z' }, { source: 'remote' })
            editor.applyTextEdit({ start: 0, end: 1, text: 'Q' }, { source: 'remote' })
            return { events, value: editor.value }
        })

        expect(outcome.value).toBe('Qbcz'.replace('z', 'Z'))
        expect(outcome.events).toHaveLength(1)
        expect(outcome.events[0]).toMatchObject({
            reason: 'range-out-of-bounds',
            requested: { start: 100, end: 200 },
            applied: { start: 3, end: 3 },
            length: 3,
            source: 'remote',
        })
    })

    test('a remote edit during an IME composition does not duplicate the composed text', async ({ page }) => {
        await mountEditor(page, { value: 'ab' })

        const outcome = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            const textarea = editor.getTextarea()
            // Write through the native setter, the way a browser updates the
            // field during a composition: our own property hooks must not see it.
            const nativeValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set

            textarea.focus()
            textarea.setSelectionRange(2, 2)
            window.__editorTest.inputEvents = []

            textarea.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
            nativeValue.call(textarea, 'abか')
            textarea.setSelectionRange(3, 3)
            textarea.dispatchEvent(new Event('input', { bubbles: true }))

            const duringComposition = {
                value: editor.value,
                hostInputs: window.__editorTest.inputEvents.length,
            }

            const deferred = editor.applyTextEdit({ start: 0, end: 0, text: 'R' }, { source: 'remote' })
            const afterRemote = editor.value

            textarea.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'か' }))

            return {
                duringComposition,
                deferred: Boolean(deferred.deferred),
                afterRemote,
                value: editor.value,
                hostInputs: window.__editorTest.inputEvents.map((event) => ({ value: event.value, previousValue: event.previousValue })),
            }
        })

        // Nothing is announced mid-composition, the peer's edit waits, and the
        // composed character lands exactly once.
        expect(outcome.duringComposition.hostInputs).toBe(0)
        expect(outcome.deferred).toBe(true)
        expect(outcome.afterRemote).toBe('abか')
        expect(outcome.value).toBe('Rabか')
        expect(outcome.hostInputs).toEqual([{ value: 'Rabか', previousValue: 'ab' }])
    })

    test('forwards its accessible name to the editable textarea', async ({ page }) => {
        await mountEditor(page, { value: 'abc' })

        const labels = await page.evaluate(() => {
            const editor = document.getElementById('collab-editor')
            editor.setAttribute('aria-label', 'Program source')
            const textarea = editor.getTextarea()
            const withLabel = textarea.getAttribute('aria-label')
            editor.removeAttribute('aria-label')
            return { withLabel, afterRemoval: textarea.getAttribute('aria-label') }
        })

        expect(labels).toEqual({ withLabel: 'Program source', afterRemoval: null })
    })

    test('generated component api docs do not include control-flow pseudo-methods', async ({ page }) => {
        const api = await page.evaluate(async () => {
            const response = await fetch('/docs/component-api.json')
            return response.json()
        })
        const codeEditor = api.custom_elements.find((component) => component.tag === 'code-editor')
        const allMethodNames = new Set(
            api.custom_elements.flatMap((component) => (component.api || []).map((entry) => entry.name)),
        )
        const methodNames = new Set((codeEditor.api || []).map((entry) => entry.name))
        const eventNames = new Set((codeEditor.events || []).map((entry) => entry.name))

        expect(codeEditor.description).toContain('Code Editor Web Component')
        expect(methodNames.has('if')).toBe(false)
        expect(methodNames.has('switch')).toBe(false)
        expect(allMethodNames.has('if')).toBe(false)
        expect(allMethodNames.has('for')).toBe(false)
        expect(allMethodNames.has('switch')).toBe(false)
        expect(allMethodNames.has('while')).toBe(false)
        expect(eventNames.has('forceevalblock')).toBe(true)
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
        await expect(dialog.locator('input[name="sessionId"]')).toHaveValue('ab12cd')

        await dialog.locator('input[name="sessionId"]').fill('zx90yX')
        await dialog.locator('button[type="submit"]').click()

        const events = await page.evaluate(() => window.__joinSessionEvents)
        expect(events).toEqual([{ sessionId: 'zx90yX' }])
        await expect(dialog).not.toBeVisible()
    })

    test('requires exactly six session id characters before joining', async ({ page }) => {
        await page.evaluate(() => {
            document.getElementById('join-session-short')?.remove()
            window.__joinSessionEvents = []

            const prompt = document.createElement('join-session-dialog')
            prompt.id = 'join-session-short'
            prompt.addEventListener('join-session', (event) => {
                window.__joinSessionEvents.push(structuredClone(event.detail))
            })
            document.body.appendChild(prompt)
            prompt.show()
        })

        const dialog = page.locator('#join-session-short dialog')
        await dialog.locator('input[name="sessionId"]').fill('a1b')
        await dialog.locator('button[type="submit"]').click()

        const events = await page.evaluate(() => window.__joinSessionEvents)
        expect(events).toEqual([])
        await expect(dialog).toBeVisible()
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
