import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const PROMPT = 'Connect to my Noisedeck session and help me with it.'

async function mountDialog(page, attrs = {}) {
    await page.evaluate((attributes) => {
        for (const stale of document.querySelectorAll('agent-connect-dialog')) {
            stale.querySelector('dialog')?.close?.()
            stale.remove()
        }
        window.__agentTest = { events: [] }
        const el = document.createElement('agent-connect-dialog')
        el.id = 'agent-test'
        for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value)
        for (const type of ['go-online', 'prompt-copied', 'copy-failed', 'connected', 'cancel']) {
            el.addEventListener(type, (event) => {
                window.__agentTest.events.push({ type, detail: event.detail?.prompt ? { prompt: event.detail.prompt } : null })
            })
        }
        document.body.appendChild(el)
    }, attrs)
}

const events = page => page.evaluate(() => window.__agentTest.events.map(event => event.type))
const stepStates = page => page.locator('agent-connect-dialog#agent-test .hf-agent-step')
    .evaluateAll(items => items.map(item => item.dataset.state))
const show = page => page.evaluate(() => document.getElementById('agent-test').show())
const set = (page, name, value) => page.evaluate(([n, v]) => {
    const el = document.getElementById('agent-test')
    if (v === null) el.removeAttribute(n)
    else el.setAttribute(n, v)
}, [name, value])

test.describe('AgentConnectDialog', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/examples/')
        await page.waitForLoadState('networkidle')
    })

    test('shows three equal steps in a row, the first active and the rest dimmed', async ({ page }) => {
        await mountDialog(page)
        await show(page)
        const dialog = page.locator('agent-connect-dialog#agent-test dialog')
        await expect(dialog).toBeVisible()
        await expect(dialog.locator('.hf-agent-lead')).toHaveText('To connect an agent, follow these steps:')
        await expect(dialog).toHaveAccessibleName('To connect an agent, follow these steps:')
        expect(await dialog.locator('.hf-agent-step [data-role="state"]').allTextContents()).toEqual([', current step', ', not yet', ', not yet'])
        await expect(dialog.locator('.hf-agent-step [data-role="title"]')).toHaveText(['Go online', 'Copy prompt', 'Confirm'])
        expect(await stepStates(page)).toEqual(['active', 'pending', 'pending'])
        const boxes = await dialog.locator('.hf-agent-step').evaluateAll(items => items.map(item => item.getBoundingClientRect().toJSON()))
        expect(new Set(boxes.map(box => Math.round(box.top))).size).toBe(1)
        expect(new Set(boxes.map(box => Math.round(box.width))).size).toBe(1)
        expect(new Set(boxes.map(box => Math.round(box.height))).size).toBe(1)
        const opacity = await dialog.locator('.hf-agent-step').evaluateAll(items => items.map(item => getComputedStyle(item).opacity))
        expect(Number(opacity[0])).toBe(1)
        expect(Number(opacity[1])).toBeLessThan(1)
        expect(Number(opacity[2])).toBeLessThan(1)
        await expect(dialog.locator('[data-action="go-online"]')).toBeFocused()
        await expect(dialog.locator('[data-action="copy-prompt"]')).toBeDisabled()
    })

    test('walks through going online, copying the prompt and the agent connecting', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write'])
        await mountDialog(page)
        await show(page)
        const dialog = page.locator('agent-connect-dialog#agent-test dialog')
        await dialog.locator('[data-action="go-online"]').click()
        expect(await events(page)).toEqual(['go-online'])

        await set(page, 'state', 'connecting')
        await expect(dialog.locator('[data-action="go-online"]')).toBeDisabled()
        await set(page, 'state', 'online')
        await set(page, 'prompt', PROMPT)
        expect(await stepStates(page)).toEqual(['done', 'active', 'pending'])
        await expect(dialog.locator('[data-action="copy-prompt"]')).toBeFocused()

        await dialog.locator('[data-action="copy-prompt"]').click()
        await expect.poll(() => stepStates(page)).toEqual(['done', 'done', 'active'])
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(PROMPT)
        expect(await events(page)).toEqual(['go-online', 'prompt-copied'])
        await expect(dialog.locator('.hf-agent-step[data-step="3"] [data-role="note"]')).toHaveText('Waiting for your agent…')

        await set(page, 'connected', '')
        expect(await stepStates(page)).toEqual(['done', 'done', 'done'])
        await expect(dialog.locator('.hf-agent-step[data-step="3"] [data-role="note"]')).toHaveText('Agent connected')
        await expect(dialog.locator('[data-role="announce"]')).toHaveText('Agent connected')
        // A short pause lets the person see the last step light up.
        await expect(dialog).toBeVisible()
        await expect(dialog).toBeHidden()
        expect(await events(page)).toEqual(['go-online', 'prompt-copied', 'connected'])
    })

    test('opening while already online starts at the prompt', async ({ page }) => {
        await mountDialog(page, { state: 'online', prompt: PROMPT })
        await show(page)
        expect(await stepStates(page)).toEqual(['done', 'active', 'pending'])
        await expect(page.locator('agent-connect-dialog#agent-test [data-action="copy-prompt"]')).toBeFocused()
    })

    test('reopening starts a fresh connection for the next agent', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write'])
        await mountDialog(page, { state: 'online', prompt: PROMPT, connected: '' })
        await show(page)
        expect(await stepStates(page)).toEqual(['done', 'active', 'pending'])
        await expect(page.locator('agent-connect-dialog#agent-test [data-action="copy-prompt"]')).toBeEnabled()
        expect(await page.evaluate(() => document.getElementById('agent-test').connected)).toBe(false)
    })

    test('closing during the pause after the agent connects still confirms it', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write'])
        await mountDialog(page, { state: 'online', prompt: PROMPT })
        await show(page)
        await page.locator('agent-connect-dialog#agent-test [data-action="copy-prompt"]').click()
        await expect.poll(() => stepStates(page)).toEqual(['done', 'done', 'active'])
        await set(page, 'connected', '')
        await page.keyboard.press('Escape')
        await expect(page.locator('agent-connect-dialog#agent-test dialog')).toBeHidden()
        expect(await events(page)).toEqual(['prompt-copied', 'cancel', 'connected'])
    })

    test('a brief reconnect keeps the copied prompt', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write'])
        await mountDialog(page, { state: 'online', prompt: PROMPT })
        await show(page)
        await page.locator('agent-connect-dialog#agent-test [data-action="copy-prompt"]').click()
        await expect.poll(() => stepStates(page)).toEqual(['done', 'done', 'active'])
        await set(page, 'state', 'connecting')
        await set(page, 'state', 'online')
        expect(await stepStates(page)).toEqual(['done', 'done', 'active'])
    })

    test('a refused copy leaves the prompt step active and reports it', async ({ page }) => {
        await mountDialog(page, { state: 'online', prompt: PROMPT })
        await page.evaluate(() => {
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } })
        })
        await show(page)
        await page.locator('agent-connect-dialog#agent-test [data-action="copy-prompt"]').click()
        await expect.poll(() => events(page)).toEqual(['copy-failed'])
        expect(await stepStates(page)).toEqual(['done', 'active', 'pending'])
    })

    test('going offline returns to the first step', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write'])
        await mountDialog(page, { state: 'online', prompt: PROMPT })
        await show(page)
        await page.locator('agent-connect-dialog#agent-test [data-action="copy-prompt"]').click()
        await expect.poll(() => stepStates(page)).toEqual(['done', 'done', 'active'])
        await set(page, 'state', 'offline')
        expect(await stepStates(page)).toEqual(['active', 'pending', 'pending'])
    })

    test('Escape and the close button cancel', async ({ page }) => {
        await mountDialog(page)
        await show(page)
        await page.keyboard.press('Escape')
        await expect(page.locator('agent-connect-dialog#agent-test dialog')).toBeHidden()
        await show(page)
        await page.locator('agent-connect-dialog#agent-test [data-action="close"]').click()
        await expect(page.locator('agent-connect-dialog#agent-test dialog')).toBeHidden()
        expect(await events(page)).toEqual(['cancel', 'cancel'])
    })

    test('the steps stack on a narrow screen', async ({ page }) => {
        await page.setViewportSize({ width: 420, height: 800 })
        await mountDialog(page)
        await show(page)
        const tops = await page.locator('agent-connect-dialog#agent-test .hf-agent-step')
            .evaluateAll(items => items.map(item => Math.round(item.getBoundingClientRect().top)))
        expect(tops[0]).toBeLessThan(tops[1])
        expect(tops[1]).toBeLessThan(tops[2])
    })

    test('agentConnectPrompt gives the agent its contract and a join command that runs as written', async ({ page }) => {
        const prompt = await page.evaluate(async () => {
            const { agentConnectPrompt } = await import('/dist/handfish.esm.js')
            return agentConnectPrompt({ app: 'Noisedeck', contractUrl: 'https://noisedeck.app/llms-full.txt', sessionUrl: 'https://noisedeck.app/?mode=freeform&seance=Ab3dE9' })
        })
        expect(prompt).toBe([
            'Connect to my Noisedeck session and help me with it.',
            'Read https://noisedeck.app/llms-full.txt first.',
            'Then run:',
            '  curl -fsSLO https://noisedeck.app/agent/seance-agent.mjs',
            "  node seance-agent.mjs join 'https://noisedeck.app/?seance=Ab3dE9'",
        ].join('\n'))
        // Each shell hands the tool exactly one argument: the link.
        const join = prompt.split('\n').at(-1).trim().replace('node seance-agent.mjs join', "printf '%s|'")
        const shells = ['/bin/sh', '/bin/bash', '/bin/zsh', '/usr/bin/zsh'].filter(shell => existsSync(shell))
        expect(shells).toEqual(expect.arrayContaining(['/bin/sh', '/bin/bash']))
        for (const shell of shells) {
            expect(execFileSync(shell, ['-c', join], { encoding: 'utf8' }), shell).toBe('https://noisedeck.app/?seance=Ab3dE9|')
        }
    })
})
