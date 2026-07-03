/**
 * Session Status Component
 *
 * Compact collaboration status row that reflects app-owned session state and
 * emits user intent events for copying the session URL or going offline.
 *
 * @module components/session-status/SessionStatus
 */

const SESSION_STATUS_STYLES_ID = 'hf-session-status-styles'

if (!document.getElementById(SESSION_STATUS_STYLES_ID)) {
    const style = document.createElement('style')
    style.id = SESSION_STATUS_STYLES_ID
    style.textContent = `
        session-status {
            display: block;
        }

        session-status .hf-session-status {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.5rem;
            font: 600 0.8rem/1.3 var(--hf-font-family, sans-serif);
            color: var(--hf-text-normal, #d7dde7);
        }

        session-status .hf-session-status-pill,
        session-status .hf-session-status-url {
            border: 1px solid color-mix(in srgb, var(--hf-border, rgba(255, 255, 255, 0.16)) 85%, transparent);
            border-radius: var(--hf-radius-sm, 6px);
            background: color-mix(in srgb, var(--hf-bg-elevated, rgba(8, 10, 14, 0.92)) 92%, transparent);
        }

        session-status .hf-session-status-pill {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.35rem 0.55rem;
        }

        session-status .hf-session-status-state {
            text-transform: capitalize;
            color: var(--hf-text-bright, #f5f7fb);
        }

        session-status .hf-session-status-id {
            font-family: var(--hf-font-family-mono, monospace);
            letter-spacing: 0.04em;
            color: var(--hf-accent-3, var(--hf-accent, #8cb4ff));
        }

        session-status .hf-session-status-url {
            flex: 1 1 16rem;
            min-width: 12rem;
            padding: 0.35rem 0.55rem;
            font: 500 0.75rem/1.35 var(--hf-font-family-mono, monospace);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--hf-text-dim, #b6bdc9);
        }

        session-status .hf-session-status-action {
            appearance: none;
            border: 1px solid color-mix(in srgb, var(--hf-border, rgba(255, 255, 255, 0.16)) 90%, transparent);
            border-radius: var(--hf-radius-sm, 6px);
            background: color-mix(in srgb, var(--hf-bg-surface, rgba(14, 18, 24, 0.9)) 94%, transparent);
            color: var(--hf-text-normal, #d7dde7);
            padding: 0.35rem 0.65rem;
            font: inherit;
            cursor: pointer;
        }

        session-status .hf-session-status-action:hover {
            border-color: color-mix(in srgb, var(--hf-border-hover, rgba(255, 255, 255, 0.26)) 95%, transparent);
            color: var(--hf-text-bright, #f5f7fb);
        }
    `
    document.head.appendChild(style)
}

class SessionStatus extends HTMLElement {
    static get observedAttributes() {
        return ['state', 'session-id', 'session-url', 'copy-label', 'offline-label']
    }

    constructor() {
        super()
        this._rendered = false
    }

    connectedCallback() {
        if (!this._rendered) {
            this._render()
            this._rendered = true
        }
        this._sync()
        this.addEventListener('click', this._handleClick)
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._handleClick)
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
        this.setAttribute('session-id', value || '')
    }

    get sessionUrl() {
        return this.getAttribute('session-url') || ''
    }

    set sessionUrl(value) {
        this.setAttribute('session-url', value || '')
    }

    _render() {
        this.innerHTML = `
            <div class="hf-session-status" role="status" aria-live="polite">
                <span class="hf-session-status-pill">
                    <span class="hf-session-status-state"></span>
                    <span class="hf-session-status-id"></span>
                </span>
                <code class="hf-session-status-url"></code>
                <button class="hf-session-status-action" type="button" data-action="copy-url">Copy URL</button>
                <button class="hf-session-status-action" type="button" data-action="go-offline">Go Offline</button>
            </div>
        `
    }

    _sync() {
        if (!this._rendered) return

        const stateEl = this.querySelector('.hf-session-status-state')
        const idEl = this.querySelector('.hf-session-status-id')
        const urlEl = this.querySelector('.hf-session-status-url')
        const copyButton = this.querySelector('[data-action="copy-url"]')
        const offlineButton = this.querySelector('[data-action="go-offline"]')

        if (!stateEl || !idEl || !urlEl || !copyButton || !offlineButton) return

        stateEl.textContent = this.state === 'online' ? 'Online' : 'Offline'
        idEl.textContent = this.sessionId || 'No Session'
        urlEl.textContent = this.sessionUrl || 'Offline'
        copyButton.textContent = this.getAttribute('copy-label') || 'Copy URL'
        offlineButton.textContent = this.getAttribute('offline-label') || 'Go Offline'
        copyButton.disabled = !this.sessionUrl
        offlineButton.disabled = this.state !== 'online'
    }

    _handleClick = (event) => {
        const action = event.target.closest('[data-action]')?.dataset?.action
        if (!action) return

        if (action === 'copy-url') {
            this.dispatchEvent(new CustomEvent('copy-url', {
                bubbles: true,
                composed: true,
                detail: {
                    sessionId: this.sessionId,
                    sessionUrl: this.sessionUrl,
                },
            }))
        }

        if (action === 'go-offline') {
            this.dispatchEvent(new CustomEvent('go-offline', {
                bubbles: true,
                composed: true,
                detail: {
                    sessionId: this.sessionId,
                },
            }))
        }
    }
}

customElements.define('session-status', SessionStatus)

export { SessionStatus }
