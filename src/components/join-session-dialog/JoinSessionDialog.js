/**
 * Join Session Dialog Component
 *
 * Stateless prompt surface for entering a six-character Seance session id.
 * Apps own lifecycle and networking; the component only emits intent events.
 *
 * @module components/join-session-dialog/JoinSessionDialog
 */

import { registerEscapeable, unregisterEscapeable } from '../../utils/escapeHandler.js'

const JOIN_SESSION_DIALOG_STYLES_ID = 'hf-join-session-dialog-styles'

if (!document.getElementById(JOIN_SESSION_DIALOG_STYLES_ID)) {
    const style = document.createElement('style')
    style.id = JOIN_SESSION_DIALOG_STYLES_ID
    style.textContent = `
        join-session-dialog dialog.hf-join-session-dialog {
            width: min(420px, calc(100vw - 2rem));
            max-width: 420px;
            padding: 0;
        }

        join-session-dialog .hf-join-session-shell {
            display: grid;
            gap: 1rem;
            padding: 1.1rem 1.1rem 1rem;
            background: var(--hf-bg-elevated, rgba(11, 14, 19, 0.96));
            color: var(--hf-text-normal, #d7dde7);
        }

        join-session-dialog .hf-join-session-header {
            display: grid;
            gap: 0.25rem;
        }

        join-session-dialog .hf-join-session-title {
            font: 700 1rem/1.2 var(--hf-font-family, sans-serif);
            color: var(--hf-text-bright, #f5f7fb);
        }

        join-session-dialog .hf-join-session-copy {
            font: 0.8rem/1.35 var(--hf-font-family, sans-serif);
            color: var(--hf-text-dim, #b6bdc9);
        }

        join-session-dialog .hf-join-session-field {
            display: grid;
            gap: 0.4rem;
        }

        join-session-dialog .hf-join-session-label {
            font: 600 0.78rem/1.2 var(--hf-font-family, sans-serif);
            color: var(--hf-text-dim, #b6bdc9);
        }

        join-session-dialog .hf-join-session-input {
            width: 100%;
            border: 1px solid var(--hf-border, rgba(255, 255, 255, 0.16));
            border-radius: var(--hf-radius-sm, 6px);
            background: color-mix(in srgb, var(--hf-bg-surface, rgba(16, 20, 27, 0.96)) 94%, transparent);
            color: var(--hf-text-bright, #f5f7fb);
            padding: 0.7rem 0.8rem;
            font: 700 1rem/1.2 var(--hf-font-family-mono, monospace);
            letter-spacing: 0.18em;
            text-transform: uppercase;
        }

        join-session-dialog .hf-join-session-input::placeholder {
            letter-spacing: 0.12em;
            color: var(--hf-text-dim, #8f98a7);
        }

        join-session-dialog .hf-join-session-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.6rem;
        }

        join-session-dialog .hf-join-session-button {
            appearance: none;
            border: 1px solid var(--hf-border, rgba(255, 255, 255, 0.16));
            border-radius: var(--hf-radius-sm, 6px);
            background: color-mix(in srgb, var(--hf-bg-surface, rgba(16, 20, 27, 0.96)) 94%, transparent);
            color: var(--hf-text-normal, #d7dde7);
            padding: 0.5rem 0.8rem;
            font: 600 0.82rem/1.2 var(--hf-font-family, sans-serif);
            cursor: pointer;
        }

        join-session-dialog .hf-join-session-button.primary {
            background: color-mix(in srgb, var(--hf-accent, #5a7fdd) 84%, transparent);
            border-color: color-mix(in srgb, var(--hf-accent, #5a7fdd) 92%, transparent);
            color: #ffffff;
        }
    `
    document.head.appendChild(style)
}

function normalizeSessionId(value) {
    return String(value || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6)
}

class JoinSessionDialog extends HTMLElement {
    static get observedAttributes() {
        return ['title', 'copy', 'join-label', 'cancel-label', 'session-id']
    }

    constructor() {
        super()
        this._rendered = false
        this._dialog = null
        this._form = null
        this._input = null
    }

    connectedCallback() {
        if (!this._rendered) {
            this._render()
            this._rendered = true
        }
        this._sync()
        this._attachEventListeners()
    }

    disconnectedCallback() {
        this._detachEventListeners()
        unregisterEscapeable(this)
    }

    attributeChangedCallback() {
        this._sync()
    }

    get sessionId() {
        return normalizeSessionId(this.getAttribute('session-id') || '')
    }

    set sessionId(value) {
        this.setAttribute('session-id', normalizeSessionId(value))
    }

    show(options = {}) {
        if (options.sessionId != null) {
            this.sessionId = options.sessionId
        }

        if (!this._dialog) return

        const openAncestorDialog = this.closest('dialog[open]')
        if (!this._dialog.open) {
            if (openAncestorDialog) {
                this._dialog.show()
            } else {
                this._dialog.showModal()
            }
        }

        registerEscapeable(this, () => this.hide())
        this._sync()
        this._input?.focus()
        this._input?.select()
    }

    hide({ emitCancel = false } = {}) {
        if (this._dialog?.open) {
            this._dialog.close()
        }
        unregisterEscapeable(this)

        if (emitCancel) {
            this.dispatchEvent(new CustomEvent('cancel', {
                bubbles: true,
                composed: true,
            }))
        }
    }

    _render() {
        this.innerHTML = `
            <dialog class="hf-dialog hf-join-session-dialog" aria-label="Join Session by ID">
                <form class="hf-join-session-shell" method="dialog">
                    <div class="hf-join-session-header">
                        <div class="hf-join-session-title"></div>
                        <div class="hf-join-session-copy"></div>
                    </div>
                    <label class="hf-join-session-field">
                        <span class="hf-join-session-label">Session ID</span>
                        <input class="hf-join-session-input" name="sessionId" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="6" placeholder="ABC123">
                    </label>
                    <div class="hf-join-session-actions">
                        <button class="hf-join-session-button" type="button" data-action="cancel">Cancel</button>
                        <button class="hf-join-session-button primary" type="submit">Join Session</button>
                    </div>
                </form>
            </dialog>
        `

        this._dialog = this.querySelector('dialog')
        this._form = this.querySelector('form')
        this._input = this.querySelector('input[name="sessionId"]')
    }

    _sync() {
        if (!this._rendered) return

        const titleEl = this.querySelector('.hf-join-session-title')
        const copyEl = this.querySelector('.hf-join-session-copy')
        const joinButton = this.querySelector('button[type="submit"]')
        const cancelButton = this.querySelector('[data-action="cancel"]')

        if (titleEl) {
            titleEl.textContent = this.getAttribute('title') || 'Join Session by ID'
        }
        if (copyEl) {
            copyEl.textContent = this.getAttribute('copy') || 'Enter the six-character session id to join the current document.'
        }
        if (joinButton) {
            joinButton.textContent = this.getAttribute('join-label') || 'Join Session'
        }
        if (cancelButton) {
            cancelButton.textContent = this.getAttribute('cancel-label') || 'Cancel'
        }
        if (this._input) {
            this._input.value = this.sessionId
        }
    }

    _attachEventListeners() {
        if (!this._dialog || !this._form || !this._input) return
        if (this._listenersAttached) return
        this._listenersAttached = true

        this._input.addEventListener('input', this._handleInput)
        this._form.addEventListener('submit', this._handleSubmit)
        this._dialog.addEventListener('click', this._handleDialogClick)
        this._dialog.addEventListener('cancel', this._handleCancel)
        this.addEventListener('click', this._handleActionClick)
    }

    _detachEventListeners() {
        if (!this._listenersAttached || !this._dialog || !this._form || !this._input) return
        this._listenersAttached = false

        this._input.removeEventListener('input', this._handleInput)
        this._form.removeEventListener('submit', this._handleSubmit)
        this._dialog.removeEventListener('click', this._handleDialogClick)
        this._dialog.removeEventListener('cancel', this._handleCancel)
        this.removeEventListener('click', this._handleActionClick)
    }

    _handleInput = () => {
        const normalized = normalizeSessionId(this._input?.value || '')
        if (this._input) {
            this._input.value = normalized
        }
    }

    _handleSubmit = (event) => {
        event.preventDefault()
        const sessionId = normalizeSessionId(this._input?.value || '')
        if (!sessionId) return

        this.sessionId = sessionId
        this.dispatchEvent(new CustomEvent('join-session', {
            bubbles: true,
            composed: true,
            detail: {
                sessionId,
            },
        }))
        this.hide()
    }

    _handleActionClick = (event) => {
        const action = event.target.closest('[data-action]')?.dataset?.action
        if (action === 'cancel') {
            this.hide({ emitCancel: true })
        }
    }

    _handleDialogClick = (event) => {
        if (event.target === this._dialog) {
            this.hide({ emitCancel: true })
        }
    }

    _handleCancel = (event) => {
        event.preventDefault()
        this.hide({ emitCancel: true })
    }
}

customElements.define('join-session-dialog', JoinSessionDialog)

export { JoinSessionDialog }
