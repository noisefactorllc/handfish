/**
 * Agent Connect Dialog Component
 *
 * The shared "connect agent..." dialog. It walks a person through connecting
 * their own software agent to their open document in three steps, laid out as
 * three equal boxes in a row:
 *
 *   1. Go online: takes the document online with Seance (skipped when it
 *      already is).
 *   2. Copy prompt: copies the prompt the person pastes into their agent.
 *   3. Confirm: lights up when the app sees the agent connect; the dialog then
 *      closes after a short pause.
 *
 * A step is dimmed until it is reached, and lights up when it is done.
 *
 * Stateless with respect to networking, like <seance-dialog>: the app reflects
 * the session back through the `state` (offline | connecting | online |
 * readonly) and `prompt` attributes and the `connected` boolean attribute. The
 * component copies the prompt itself, inside the click that asks for it, and
 * emits intent and progress events: `go-online`, `prompt-copied`,
 * `copy-failed`, `connected` (as it closes after the pause, or when the person
 * closes it during the pause; the app's cue for an "Agent connected" toast) and
 * `cancel`.
 *
 * Each opening is a fresh connection: `show()` clears `connected`, and the app
 * sets it again when the next agent connects.
 *
 * @module components/agent-connect-dialog/AgentConnectDialog
 */

import { registerEscapeable, unregisterEscapeable } from '../../utils/escapeHandler.js'

const AGENT_CONNECT_DIALOG_STYLES_ID = 'hf-agent-connect-dialog-styles'
const CLOSE_DELAY_MS = 1200

/** The tool every app's prompt tells the agent to fetch. */
export const AGENT_TOOL_URL = 'https://noisedeck.app/agent/seance-agent.mjs'

/**
 * The prompt a person gives their agent to join their session. The session
 * link keeps only the page and its `seance` code, and is quoted, so that the
 * join command runs as written in sh, bash, zsh, fish and PowerShell.
 *
 * @param {{ app: string, contractUrl: string, sessionUrl: string }} options
 * @returns {string}
 */
export function agentConnectPrompt({ app, contractUrl, sessionUrl }) {
    let link = String(sessionUrl || '')
    try {
        const url = new URL(link)
        const code = url.searchParams.get('seance')
        if (code) link = `${url.origin}${url.pathname}?seance=${encodeURIComponent(code)}`
    } catch { /* not a URL: a bare code */ }
    return [
        `Connect to my ${app} session and help me with it.`,
        `Read ${contractUrl} first.`,
        'Then run:',
        `  curl -fsSLO ${AGENT_TOOL_URL}`,
        `  node seance-agent.mjs join '${link.replace(/'/g, '')}'`,
    ].join('\n')
}

if (typeof document !== 'undefined' && !document.getElementById(AGENT_CONNECT_DIALOG_STYLES_ID)) {
    const style = document.createElement('style')
    style.id = AGENT_CONNECT_DIALOG_STYLES_ID
    style.textContent = `
        agent-connect-dialog dialog.hf-agent-connect-dialog {
            width: min(760px, calc(100vw - 2rem));
            max-width: 760px;
            padding: 0;
            font-family: var(--hf-font-family, sans-serif);
        }

        agent-connect-dialog .hf-agent-content {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 1.1rem;
            padding: 1.75rem;
            background: var(--hf-bg-elevated, rgba(11, 14, 19, 0.96));
            color: var(--hf-text-normal, #d7dde7);
        }

        agent-connect-dialog .hf-agent-close {
            position: absolute;
            top: 0.6rem;
            right: 0.6rem;
            appearance: none;
            border: 1px solid transparent;
            border-radius: var(--hf-radius-sm, 6px);
            background: transparent;
            color: var(--hf-text-dim, #b6bdc9);
            font: 700 1rem/1 var(--hf-font-family, sans-serif);
            padding: 0.25rem 0.5rem;
            cursor: pointer;
        }

        agent-connect-dialog .hf-agent-close:hover {
            color: var(--hf-text-bright, #f5f7fb);
            border-color: var(--hf-border, rgba(255, 255, 255, 0.16));
        }

        agent-connect-dialog .hf-agent-lead {
            margin: 0;
            padding-right: 2rem;
            font-weight: 800;
            font-size: 1.1rem;
            line-height: 1.3;
            color: var(--hf-text-bright, var(--hf-color-7, #f5f7fb));
        }

        agent-connect-dialog .hf-agent-sr {
            position: absolute;
            width: 1px;
            height: 1px;
            margin: -1px;
            padding: 0;
            overflow: hidden;
            clip: rect(0 0 0 0);
            white-space: nowrap;
            border: 0;
        }

        agent-connect-dialog .hf-agent-steps {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.75rem;
            margin: 0;
            padding: 0;
            list-style: none;
        }

        agent-connect-dialog .hf-agent-step {
            display: flex;
            flex-direction: column;
            gap: 0.7rem;
            min-height: 9.5rem;
            padding: 1rem;
            border: 1px solid var(--hf-border, rgba(255, 255, 255, 0.16));
            border-radius: var(--hf-radius, 8px);
            background: color-mix(in srgb, var(--hf-bg-surface, rgba(16, 20, 27, 0.96)) 94%, transparent);
            opacity: 0.45;
            transition: opacity var(--hf-transition, 180ms ease), border-color var(--hf-transition, 180ms ease), background var(--hf-transition, 180ms ease);
        }

        agent-connect-dialog .hf-agent-step[data-state="active"] {
            opacity: 1;
            border-color: color-mix(in srgb, var(--hf-accent, #5a7fdd) 92%, transparent);
        }

        agent-connect-dialog .hf-agent-step[data-state="done"] {
            opacity: 1;
            border-color: color-mix(in srgb, var(--hf-accent, #5a7fdd) 60%, transparent);
            background: color-mix(in srgb, var(--hf-accent, #5a7fdd) 16%, var(--hf-bg-surface, rgba(16, 20, 27, 0.96)));
        }

        agent-connect-dialog .hf-agent-step-head {
            display: flex;
            align-items: center;
            gap: 0.55rem;
            font-weight: 800;
            font-size: 0.95rem;
            color: var(--hf-text-bright, #f5f7fb);
        }

        agent-connect-dialog .hf-agent-step-number {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: none;
            width: 1.6rem;
            height: 1.6rem;
            border-radius: 50%;
            border: 1px solid var(--hf-border, rgba(255, 255, 255, 0.16));
            font: 800 0.8rem/1 var(--hf-font-family, sans-serif);
            color: var(--hf-text-normal, #d7dde7);
        }

        agent-connect-dialog .hf-agent-step[data-state="active"] .hf-agent-step-number {
            border-color: color-mix(in srgb, var(--hf-accent, #5a7fdd) 92%, transparent);
            color: var(--hf-text-bright, #f5f7fb);
        }

        agent-connect-dialog .hf-agent-step[data-state="done"] .hf-agent-step-number {
            border-color: transparent;
            background: color-mix(in srgb, var(--hf-accent, #5a7fdd) 84%, transparent);
            color: #ffffff;
        }

        agent-connect-dialog .hf-agent-step-body {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            flex: 1;
            gap: 0.5rem;
        }

        agent-connect-dialog .hf-agent-step-note {
            font-size: 0.8rem;
            line-height: 1.35;
            color: var(--hf-text-dim, #b6bdc9);
        }

        agent-connect-dialog .hf-agent-button {
            appearance: none;
            align-self: flex-start;
            border: 1px solid var(--hf-border, rgba(255, 255, 255, 0.16));
            border-radius: var(--hf-radius-sm, 6px);
            background: color-mix(in srgb, var(--hf-bg-surface, rgba(16, 20, 27, 0.96)) 94%, transparent);
            color: var(--hf-text-normal, #d7dde7);
            padding: 0.5rem 0.8rem;
            font: 600 0.82rem/1.2 var(--hf-font-family, sans-serif);
            cursor: pointer;
            white-space: nowrap;
        }

        agent-connect-dialog .hf-agent-step[data-state="active"] .hf-agent-button {
            background: color-mix(in srgb, var(--hf-accent, #5a7fdd) 84%, transparent);
            border-color: color-mix(in srgb, var(--hf-accent, #5a7fdd) 92%, transparent);
            color: #ffffff;
        }

        agent-connect-dialog .hf-agent-button:disabled {
            cursor: default;
        }

        @media (max-width: 560px) {
            agent-connect-dialog .hf-agent-steps {
                grid-template-columns: 1fr;
            }

            agent-connect-dialog .hf-agent-step {
                min-height: 0;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            agent-connect-dialog .hf-agent-step {
                transition: none;
            }
        }
    `
    document.head.appendChild(style)
}

let instanceCount = 0

/**
 * AgentConnectDialog: modal dialog that walks a person through connecting
 * their agent.
 *
 * @extends HTMLElement
 */
class AgentConnectDialog extends HTMLElement {
    static get observedAttributes() {
        return ['state', 'prompt', 'connected', 'lead', 'online-title', 'online-button', 'copy-title',
            'copy-button', 'confirm-title', 'waiting-note', 'connected-note']
    }

    constructor() {
        super()
        this._rendered = false
        this._dialog = null
        this._copied = false
        this._closeTimer = null
        instanceCount += 1
        this._headingId = `hf-agent-connect-heading-${instanceCount}`
    }

    connectedCallback() {
        if (!this._rendered) {
            this._render()
            this._rendered = true
        }
        this._attachEventListeners()
        this._sync()
    }

    disconnectedCallback() {
        this._detachEventListeners()
        clearTimeout(this._closeTimer)
        unregisterEscapeable(this)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return
        // A brief reconnect passes through `connecting`; only going offline
        // takes the person back to the first step.
        if (name === 'state' && (newValue || 'offline') === 'offline') this._copied = false
        if (name === 'connected') {
            if (newValue === null) {
                clearTimeout(this._closeTimer)
                this._closeTimer = null
            } else if (this._dialog?.open) {
                this._finishWhenConnected()
            }
        }
        this._sync()
    }

    get state() {
        return this.getAttribute('state') || 'offline'
    }

    set state(value) {
        this.setAttribute('state', value || 'offline')
    }

    get prompt() {
        return this.getAttribute('prompt') || ''
    }

    set prompt(value) {
        this.setAttribute('prompt', value ?? '')
    }

    get connected() {
        return this.hasAttribute('connected')
    }

    set connected(value) {
        this.toggleAttribute('connected', Boolean(value))
    }

    /** Whether the dialog is showing. */
    get open() {
        return Boolean(this._dialog?.open)
    }

    get lead() {
        return this.getAttribute('lead') || 'To connect an agent, follow these steps:'
    }

    set lead(value) {
        if (value) this.setAttribute('lead', value)
        else this.removeAttribute('lead')
    }

    /** The step the person is on: 1, 2 or 3, or 4 once every step is done. */
    get step() {
        if (!this._isOnline()) return 1
        if (this.connected) return 4
        if (!this._copied) return 2
        return 3
    }

    show() {
        if (!this._dialog) return
        clearTimeout(this._closeTimer)
        this._closeTimer = null
        // Each opening connects an agent afresh: from the session as it is,
        // the person copies the prompt again and waits for the next agent.
        this._copied = false
        this.removeAttribute('connected')
        if (!this._dialog.open) {
            if (this.closest('dialog[open]')) this._dialog.show()
            else this._dialog.showModal()
        }
        registerEscapeable(this, () => this.hide({ emitCancel: true }))
        this._sync()
        this._focusActiveStep()
    }

    hide({ emitCancel = false } = {}) {
        const pausing = Boolean(this._closeTimer)
        clearTimeout(this._closeTimer)
        this._closeTimer = null
        if (this._dialog?.open) this._dialog.close()
        unregisterEscapeable(this)
        if (emitCancel) {
            this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }))
        }
        // Closed during the pause after the agent connected: still confirm it.
        if (pausing && this.connected) {
            this.dispatchEvent(new CustomEvent('connected', { bubbles: true, composed: true }))
        }
    }

    _isOnline(state = this.state) {
        return state === 'online' || state === 'readonly'
    }

    _render() {
        this.innerHTML = `
            <dialog class="hf-dialog hf-agent-connect-dialog" aria-labelledby="${this._headingId}">
                <div class="hf-agent-content">
                    <button class="hf-agent-close" type="button" data-action="close" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <p class="hf-agent-lead" id="${this._headingId}"></p>
                    <ol class="hf-agent-steps">
                        <li class="hf-agent-step" data-step="1">
                            <div class="hf-agent-step-head"><span class="hf-agent-step-number" aria-hidden="true">1</span><span data-role="title"></span><span class="hf-agent-sr" data-role="state"></span></div>
                            <div class="hf-agent-step-body">
                                <button class="hf-agent-button" type="button" data-action="go-online"></button>
                            </div>
                        </li>
                        <li class="hf-agent-step" data-step="2">
                            <div class="hf-agent-step-head"><span class="hf-agent-step-number" aria-hidden="true">2</span><span data-role="title"></span><span class="hf-agent-sr" data-role="state"></span></div>
                            <div class="hf-agent-step-body">
                                <button class="hf-agent-button" type="button" data-action="copy-prompt"></button>
                            </div>
                        </li>
                        <li class="hf-agent-step" data-step="3">
                            <div class="hf-agent-step-head"><span class="hf-agent-step-number" aria-hidden="true">3</span><span data-role="title"></span><span class="hf-agent-sr" data-role="state"></span></div>
                            <div class="hf-agent-step-body">
                                <span class="hf-agent-step-note" data-role="note"></span>
                            </div>
                        </li>
                    </ol>
                    <p class="hf-agent-sr" role="status" aria-live="polite" data-role="announce"></p>
                </div>
            </dialog>
        `
        this._dialog = this.querySelector('dialog')
    }

    _sync() {
        if (!this._rendered) return
        const label = (name, fallback) => this.getAttribute(name) || fallback
        const current = this.step
        const connecting = this.state === 'connecting'

        this.querySelector('.hf-agent-lead').textContent = this.lead

        const steps = [
            { title: label('online-title', 'Go online'), button: label('online-button', 'Go Online') },
            { title: label('copy-title', 'Copy prompt'), button: label('copy-button', 'Copy Prompt') },
            {
                title: label('confirm-title', 'Confirm'),
                note: current > 3 ? label('connected-note', 'Agent connected') : label('waiting-note', 'Waiting for your agent…'),
            },
        ]

        steps.forEach((step, index) => {
            const number = index + 1
            const item = this.querySelector(`.hf-agent-step[data-step="${number}"]`)
            const state = number < current ? 'done' : number === current ? 'active' : 'pending'
            item.dataset.state = state
            if (state === 'active') item.setAttribute('aria-current', 'step')
            else item.removeAttribute('aria-current')
            item.querySelector('[data-role="title"]').textContent = step.title
            // Dimmed and lit are colours; a screen reader hears the words.
            item.querySelector('[data-role="state"]').textContent =
                state === 'done' ? ', done' : state === 'active' ? ', current step' : ', not yet'
            const note = item.querySelector('[data-role="note"]')
            if (note) note.textContent = step.note
            const button = item.querySelector('button')
            if (button) {
                button.textContent = step.button
                button.disabled = state !== 'active' || (number === 1 && connecting) || (number === 2 && !this.prompt)
            }
        })

        const announce = this.querySelector('[data-role="announce"]')
        const message = current > 3
            ? label('connected-note', 'Agent connected')
            : `${steps[current - 1].title}, step ${current} of 3`
        if (this._dialog?.open && announce.textContent !== message) announce.textContent = message

        this._restoreFocus()
    }

    _focusActiveStep() {
        if (!this._dialog?.open) return
        const target = this.querySelector('.hf-agent-step[data-state="active"] button:not([disabled])')
        const close = this.querySelector('[data-action="close"]')
        ;(target || close)?.focus()
        // Close holds focus only until the active step's button can take it.
        this._focusParked = !target && document.activeElement === close
    }

    /** A finished step's button turns off under the person's focus; move it on. */
    _restoreFocus() {
        if (!this._dialog?.open) return
        const active = document.activeElement
        const parked = this._focusParked && active === this.querySelector('[data-action="close"]')
        if (!parked && active && active !== document.body && this.contains(active) && !active.disabled) return
        this._focusActiveStep()
    }

    _finishWhenConnected() {
        if (this._closeTimer) return
        this._closeTimer = setTimeout(() => {
            this._closeTimer = null
            if (!this.connected) return
            this.hide()
            this.dispatchEvent(new CustomEvent('connected', { bubbles: true, composed: true }))
        }, CLOSE_DELAY_MS)
    }

    async _copyPrompt() {
        const prompt = this.prompt
        if (!prompt) return
        try {
            await navigator.clipboard.writeText(prompt)
        } catch (error) {
            this.dispatchEvent(new CustomEvent('copy-failed', {
                bubbles: true,
                composed: true,
                detail: { prompt, error },
            }))
            return
        }
        this._copied = true
        this._sync()
        this.dispatchEvent(new CustomEvent('prompt-copied', {
            bubbles: true,
            composed: true,
            detail: { prompt },
        }))
    }

    _attachEventListeners() {
        if (!this._dialog || this._listenersAttached) return
        this._listenersAttached = true
        this._dialog.addEventListener('click', this._handleDialogClick)
        this._dialog.addEventListener('cancel', this._handleCancel)
        this.addEventListener('click', this._handleActionClick)
    }

    _detachEventListeners() {
        if (!this._listenersAttached || !this._dialog) return
        this._listenersAttached = false
        this._dialog.removeEventListener('click', this._handleDialogClick)
        this._dialog.removeEventListener('cancel', this._handleCancel)
        this.removeEventListener('click', this._handleActionClick)
    }

    _handleActionClick = (event) => {
        const button = event.target.closest('[data-action]')
        const action = button?.dataset?.action
        if (!action || button.disabled) return
        if (action === 'close') {
            this.hide({ emitCancel: true })
        } else if (action === 'go-online') {
            this.dispatchEvent(new CustomEvent('go-online', { bubbles: true, composed: true }))
        } else if (action === 'copy-prompt') {
            this._copyPrompt()
        }
    }

    _handleDialogClick = (event) => {
        if (event.target === this._dialog) this.hide({ emitCancel: true })
    }

    _handleCancel = (event) => {
        event.preventDefault()
        this.hide({ emitCancel: true })
    }
}

if (typeof customElements !== 'undefined' && !customElements.get('agent-connect-dialog')) {
    customElements.define('agent-connect-dialog', AgentConnectDialog)
}

export { AgentConnectDialog }
