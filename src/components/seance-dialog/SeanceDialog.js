/**
 * Seance Dialog Component
 *
 * Unified modal surface for Seance online collaboration: take a document
 * online, join a session by id, and manage the live session (indicator,
 * share URL, copy, go offline) from one dialog.
 *
 * Layout mirrors the AboutDialog "version dialog": branding graphic on the
 * left (the Seance logo, tinted by the host app's theme via currentColor),
 * logotype and online controls on the right.
 *
 * Stateless with respect to networking: apps own the session lifecycle and
 * reflect it back through the `state` / `session-id` / `session-url`
 * attributes; the component only emits intent events (`take-online`,
 * `join-session`, `go-offline`, `copy-url`, `cancel`).
 *
 * @module components/seance-dialog/SeanceDialog
 */

import { registerEscapeable, unregisterEscapeable } from '../../utils/escapeHandler.js'

const SEANCE_DIALOG_STYLES_ID = 'hf-seance-dialog-styles'

/**
 * The Seance logo as an inline SVG string. Fills with `currentColor` so it
 * inherits the surrounding theme color. Exported for host apps that need a
 * matching trigger graphic (e.g. a toolbar button that opens this dialog).
 */
export const SEANCE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" fill="currentColor" aria-hidden="true" focusable="false"><g transform="translate(0,600) scale(0.1,-0.1)" fill="currentColor" stroke="none"><path d="M1765 4732 c-56 -26 -92 -72 -101 -127 -6 -42 10 -92 186 -594 106 -302 191 -554 189 -560 -2 -6 -218 -155 -479 -331 -261 -177 -487 -332 -501 -346 -83 -79 -42 -234 69 -263 20 -6 174 -18 342 -26 168 -9 420 -23 560 -30 140 -8 277 -15 303 -15 l48 0 30 -67 c64 -142 216 -489 331 -758 66 -154 130 -291 142 -303 63 -70 169 -70 232 0 12 12 61 114 108 226 48 111 145 336 217 500 72 163 140 318 151 345 14 31 28 49 42 52 12 2 158 11 326 20 987 49 950 45 995 114 35 54 41 101 17 152 -10 24 -30 53 -43 65 -13 11 -175 122 -359 246 -543 365 -605 408 -609 419 -2 6 8 43 23 82 155 433 356 1023 356 1045 -1 36 -32 102 -61 128 -33 29 -92 47 -132 39 -17 -4 -59 -23 -92 -43 -61 -37 -617 -386 -896 -563 l-156 -100 -84 52 c-46 29 -277 174 -514 324 -236 149 -450 283 -475 298 -62 36 -115 42 -165 19z m863 -1638 c55 -61 0 -204 -98 -254 -58 -30 -110 -34 -173 -16 -111 32 -187 162 -158 268 24 83 24 82 -1 93 -29 12 -34 44 -14 83 l16 30 202 -89 c120 -53 212 -100 226 -115z m1216 139 c1 -31 -3 -40 -22 -48 -20 -8 -22 -15 -17 -40 20 -86 22 -109 14 -152 -15 -79 -85 -151 -169 -173 -137 -37 -280 74 -280 218 0 52 34 76 245 170 220 99 226 99 229 25z m-984 -477 c78 -70 212 -70 290 0 43 39 62 42 90 14 28 -28 25 -53 -12 -90 -57 -56 -131 -84 -223 -85 -94 0 -158 24 -217 83 -43 41 -47 63 -18 92 28 28 47 25 90 -14z"/></g></svg>`

if (typeof document !== 'undefined' && !document.getElementById(SEANCE_DIALOG_STYLES_ID)) {
    const style = document.createElement('style')
    style.id = SEANCE_DIALOG_STYLES_ID
    style.textContent = `
        seance-dialog dialog.hf-seance-dialog {
            width: min(640px, calc(100vw - 2rem));
            max-width: 640px;
            padding: 0;
            font-family: var(--hf-font-family, sans-serif);
        }

        seance-dialog .hf-seance-content {
            display: grid;
            grid-template-columns: minmax(170px, 230px) 1fr;
            align-items: stretch;
            background: var(--hf-bg-elevated, rgba(11, 14, 19, 0.96));
            color: var(--hf-text-normal, #d7dde7);
        }

        seance-dialog .hf-seance-graphic {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem 1.75rem;
            background: linear-gradient(
                180deg,
                color-mix(in srgb, var(--hf-accent-3, var(--hf-accent, #5a7fdd)) 12%, transparent 88%) 0%,
                transparent 100%
            );
        }

        seance-dialog .hf-seance-graphic svg {
            width: min(80%, 150px);
            max-width: 150px;
            height: auto;
            color: var(--hf-color-6, var(--hf-text-bright, #f5f7fb));
            filter: drop-shadow(0 0 20px color-mix(in srgb, var(--hf-accent-3, var(--hf-accent, #5a7fdd)) 40%, transparent 60%));
        }

        seance-dialog .hf-seance-details {
            display: flex;
            flex-direction: column;
            gap: 0.65rem;
            padding: 2rem 1.75rem;
            min-width: 0;
        }

        seance-dialog .hf-seance-name {
            font-weight: 900;
            font-size: clamp(1.5rem, 3.2vw, 2rem);
            line-height: 1.1;
            color: var(--hf-text-bright, var(--hf-color-7, #f5f7fb));
            margin-bottom: 0.35rem;
        }

        seance-dialog .hf-seance-copy {
            font-size: 0.82rem;
            line-height: 1.4;
            color: var(--hf-text-dim, #b6bdc9);
        }

        seance-dialog .hf-seance-status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--hf-text-bright, #f5f7fb);
        }

        seance-dialog .hf-seance-status-dot {
            width: 0.55rem;
            height: 0.55rem;
            border-radius: 50%;
            background: var(--hf-text-dim, #8f98a7);
            flex: none;
        }

        seance-dialog[state="online"] .hf-seance-status-dot,
        seance-dialog[state="readonly"] .hf-seance-status-dot {
            background: var(--hf-success, #59d499);
            box-shadow: 0 0 8px color-mix(in srgb, var(--hf-success, #59d499) 70%, transparent 30%);
        }

        seance-dialog[state="connecting"] .hf-seance-status-dot {
            background: var(--hf-accent, #5a7fdd);
            animation: hf-seance-pulse 1.1s ease-in-out infinite;
        }

        @keyframes hf-seance-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.35; }
        }

        seance-dialog .hf-seance-session-id {
            font-family: var(--hf-font-family-mono, monospace);
            letter-spacing: 0.14em;
            font-weight: 700;
            color: var(--hf-accent-3, var(--hf-accent, #5a7fdd));
        }

        seance-dialog .hf-seance-url-row {
            display: flex;
            gap: 0.5rem;
            min-width: 0;
        }

        seance-dialog .hf-seance-url {
            flex: 1 1 auto;
            min-width: 0;
            border: 1px solid var(--hf-border, rgba(255, 255, 255, 0.16));
            border-radius: var(--hf-radius-sm, 6px);
            background: color-mix(in srgb, var(--hf-bg-surface, rgba(16, 20, 27, 0.96)) 94%, transparent);
            color: var(--hf-text-normal, #d7dde7);
            padding: 0.5rem 0.65rem;
            font: 500 0.78rem/1.2 var(--hf-font-family-mono, monospace);
            text-overflow: ellipsis;
        }

        seance-dialog .hf-seance-field {
            display: grid;
            gap: 0.4rem;
        }

        seance-dialog .hf-seance-label {
            font: 600 0.75rem/1.2 var(--hf-font-family, sans-serif);
            color: var(--hf-text-dim, #b6bdc9);
        }

        seance-dialog .hf-seance-join-row {
            display: flex;
            gap: 0.5rem;
        }

        seance-dialog .hf-seance-join-input {
            flex: 1 1 auto;
            min-width: 0;
            border: 1px solid var(--hf-border, rgba(255, 255, 255, 0.16));
            border-radius: var(--hf-radius-sm, 6px);
            background: color-mix(in srgb, var(--hf-bg-surface, rgba(16, 20, 27, 0.96)) 94%, transparent);
            color: var(--hf-text-bright, #f5f7fb);
            padding: 0.5rem 0.65rem;
            font: 700 0.95rem/1.2 var(--hf-font-family-mono, monospace);
            letter-spacing: 0.18em;
        }

        seance-dialog .hf-seance-join-input::placeholder {
            letter-spacing: 0.12em;
            color: var(--hf-text-dim, #8f98a7);
        }

        seance-dialog .hf-seance-button {
            appearance: none;
            border: 1px solid var(--hf-border, rgba(255, 255, 255, 0.16));
            border-radius: var(--hf-radius-sm, 6px);
            background: color-mix(in srgb, var(--hf-bg-surface, rgba(16, 20, 27, 0.96)) 94%, transparent);
            color: var(--hf-text-normal, #d7dde7);
            padding: 0.5rem 0.8rem;
            font: 600 0.82rem/1.2 var(--hf-font-family, sans-serif);
            cursor: pointer;
            white-space: nowrap;
        }

        seance-dialog .hf-seance-button.primary {
            background: color-mix(in srgb, var(--hf-accent, #5a7fdd) 84%, transparent);
            border-color: color-mix(in srgb, var(--hf-accent, #5a7fdd) 92%, transparent);
            color: #ffffff;
        }

        seance-dialog .hf-seance-button:disabled {
            opacity: 0.55;
            cursor: default;
        }

        seance-dialog .hf-seance-divider {
            border: 0;
            border-top: 1px solid color-mix(in srgb, var(--hf-color-5, var(--hf-text-dim, #b6bdc9)) 30%, transparent 70%);
            margin: 0.35rem 0;
            width: 100%;
        }

        seance-dialog [hidden] {
            display: none !important;
        }

        @media (max-width: 560px) {
            seance-dialog .hf-seance-content {
                grid-template-columns: 1fr;
            }

            seance-dialog .hf-seance-graphic {
                padding: 1.5rem 1.5rem 0.75rem;
            }

            seance-dialog .hf-seance-graphic svg {
                width: min(40%, 110px);
            }
        }
    `
    document.head.appendChild(style)
}

function normalizeSessionId(value) {
    return String(value || '')
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 6)
}

class SeanceDialog extends HTMLElement {
    static get observedAttributes() {
        return [
            'heading', 'state', 'session-id', 'session-url', 'copy',
            'take-label', 'join-label', 'join-label-text', 'join-placeholder',
            'copy-label', 'offline-label', 'offline-status-label',
            'connecting-label', 'online-label', 'url-label',
        ]
    }

    constructor() {
        super()
        this._rendered = false
        this._dialog = null
        this._joinForm = null
        this._joinInput = null
        this._listenersAttached = false
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

    get state() {
        return this.getAttribute('state') || 'offline'
    }

    set state(value) {
        this.setAttribute('state', value || 'offline')
    }

    get sessionId() {
        return this.getAttribute('session-id') || ''
    }

    set sessionId(value) {
        this.setAttribute('session-id', value ?? '')
    }

    get sessionUrl() {
        return this.getAttribute('session-url') || ''
    }

    set sessionUrl(value) {
        this.setAttribute('session-url', value ?? '')
    }

    show() {
        if (!this._dialog) return

        const openAncestorDialog = this.closest('dialog[open]')
        if (!this._dialog.open) {
            if (openAncestorDialog) {
                this._dialog.show()
            } else {
                this._dialog.showModal()
            }
        }

        registerEscapeable(this, () => this.hide({ emitCancel: true }))
        this._sync()
        if (this.state === 'offline') {
            this.querySelector('[data-action="take-online"]')?.focus()
        }
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
            <dialog class="hf-dialog hf-seance-dialog" aria-labelledby="hf-seance-heading">
                <div class="hf-seance-content">
                    <div class="hf-seance-graphic" role="presentation">${SEANCE_LOGO_SVG}</div>
                    <div class="hf-seance-details">
                        <div class="hf-seance-name" id="hf-seance-heading"></div>
                        <div class="hf-seance-status">
                            <span class="hf-seance-status-dot"></span>
                            <span class="hf-seance-status-text"></span>
                            <span class="hf-seance-session-id" data-role="session-id"></span>
                        </div>
                        <div class="hf-seance-copy" data-view="offline"></div>
                        <div data-view="offline">
                            <button class="hf-seance-button primary" type="button" data-action="take-online"></button>
                        </div>
                        <hr class="hf-seance-divider" data-view="offline">
                        <form class="hf-seance-field" data-view="offline" method="dialog">
                            <label class="hf-seance-label" for="hf-seance-join-input"></label>
                            <div class="hf-seance-join-row">
                                <input class="hf-seance-join-input" id="hf-seance-join-input" name="sessionId" type="text" inputmode="text" autocomplete="off" autocapitalize="off">

                                <button class="hf-seance-button" type="submit" data-action="join"></button>
                            </div>
                        </form>
                        <div class="hf-seance-field" data-view="online">
                            <label class="hf-seance-label" data-role="url-label"></label>
                            <div class="hf-seance-url-row">
                                <input class="hf-seance-url" type="text" readonly>
                                <button class="hf-seance-button" type="button" data-action="copy-url"></button>
                            </div>
                        </div>
                        <div data-view="online">
                            <button class="hf-seance-button" type="button" data-action="go-offline"></button>
                        </div>
                    </div>
                </div>
            </dialog>
        `

        this._dialog = this.querySelector('dialog')
        this._joinForm = this.querySelector('form')
        this._joinInput = this.querySelector('.hf-seance-join-input')
    }

    _sync() {
        if (!this._rendered) return

        const state = this.state
        const onlineish = state === 'online' || state === 'readonly'
        const connecting = state === 'connecting'

        const headingEl = this.querySelector('.hf-seance-name')
        if (headingEl) headingEl.textContent = this.getAttribute('heading') || 'Seance'

        const statusText = this.querySelector('.hf-seance-status-text')
        if (statusText) {
            statusText.textContent = onlineish
                ? (this.getAttribute('online-label') || 'Online')
                : connecting
                    ? (this.getAttribute('connecting-label') || 'Connecting…')
                    : (this.getAttribute('offline-status-label') || 'Offline')
        }

        const sessionIdEl = this.querySelector('[data-role="session-id"]')
        if (sessionIdEl) sessionIdEl.textContent = onlineish ? this.sessionId : ''

        const copyEl = this.querySelector('.hf-seance-copy')
        if (copyEl) {
            copyEl.textContent = this.getAttribute('copy')
                || 'Share this document live. Taking it online creates a session anyone with the link can join.'
        }

        const takeButton = this.querySelector('[data-action="take-online"]')
        if (takeButton) {
            takeButton.textContent = this.getAttribute('take-label') || 'Take Online'
            takeButton.disabled = connecting
        }

        const joinLabel = this.querySelector('.hf-seance-label[for="hf-seance-join-input"]')
        if (joinLabel) joinLabel.textContent = this.getAttribute('join-label-text') || 'Join session by ID'

        if (this._joinInput) {
            this._joinInput.placeholder = this.getAttribute('join-placeholder') || 'aB12cD'
            this._joinInput.disabled = connecting
        }

        const joinButton = this.querySelector('[data-action="join"]')
        if (joinButton) {
            joinButton.textContent = this.getAttribute('join-label') || 'Join'
            joinButton.disabled = connecting
        }

        const urlLabel = this.querySelector('[data-role="url-label"]')
        if (urlLabel) urlLabel.textContent = this.getAttribute('url-label') || 'Session URL'

        const urlInput = this.querySelector('.hf-seance-url')
        if (urlInput) urlInput.value = this.sessionUrl

        const copyButton = this.querySelector('[data-action="copy-url"]')
        if (copyButton) copyButton.textContent = this.getAttribute('copy-label') || 'Copy URL'

        const offlineButton = this.querySelector('[data-action="go-offline"]')
        if (offlineButton) offlineButton.textContent = this.getAttribute('offline-label') || 'Go Offline'

        for (const el of this.querySelectorAll('[data-view="offline"]')) {
            el.hidden = onlineish
        }
        for (const el of this.querySelectorAll('[data-view="online"]')) {
            el.hidden = !onlineish
        }
    }

    _attachEventListeners() {
        if (!this._dialog || !this._joinForm || !this._joinInput) return
        if (this._listenersAttached) return
        this._listenersAttached = true

        this._joinInput.addEventListener('input', this._handleJoinInput)
        this._joinForm.addEventListener('submit', this._handleJoinSubmit)
        this._dialog.addEventListener('click', this._handleDialogClick)
        this._dialog.addEventListener('cancel', this._handleCancel)
        this.addEventListener('click', this._handleActionClick)
        this.addEventListener('focusin', this._handleFocusIn)
    }

    _detachEventListeners() {
        if (!this._listenersAttached || !this._dialog || !this._joinForm || !this._joinInput) return
        this._listenersAttached = false

        this._joinInput.removeEventListener('input', this._handleJoinInput)
        this._joinForm.removeEventListener('submit', this._handleJoinSubmit)
        this._dialog.removeEventListener('click', this._handleDialogClick)
        this._dialog.removeEventListener('cancel', this._handleCancel)
        this.removeEventListener('click', this._handleActionClick)
        this.removeEventListener('focusin', this._handleFocusIn)
    }

    _handleJoinInput = () => {
        if (!this._joinInput) return
        this._joinInput.value = normalizeSessionId(this._joinInput.value)
    }

    _handleJoinSubmit = (event) => {
        event.preventDefault()
        const sessionId = normalizeSessionId(this._joinInput?.value || '')
        if (sessionId.length !== 6) return

        this.dispatchEvent(new CustomEvent('join-session', {
            bubbles: true,
            composed: true,
            detail: { sessionId },
        }))
    }

    _handleActionClick = (event) => {
        const action = event.target.closest('[data-action]')?.dataset?.action
        if (!action || action === 'join') return

        if (action === 'take-online') {
            this.dispatchEvent(new CustomEvent('take-online', {
                bubbles: true,
                composed: true,
            }))
        } else if (action === 'copy-url') {
            this.dispatchEvent(new CustomEvent('copy-url', {
                bubbles: true,
                composed: true,
                detail: { sessionUrl: this.sessionUrl },
            }))
        } else if (action === 'go-offline') {
            this.dispatchEvent(new CustomEvent('go-offline', {
                bubbles: true,
                composed: true,
            }))
        }
    }

    _handleFocusIn = (event) => {
        if (event.target?.classList?.contains('hf-seance-url')) {
            event.target.select()
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

if (typeof customElements !== 'undefined' && !customElements.get('seance-dialog')) {
    customElements.define('seance-dialog', SeanceDialog)
}

export { SeanceDialog }
