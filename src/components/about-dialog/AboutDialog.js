/**
 * About Dialog Component
 * Generic about/version info dialog for Noise Factor applications.
 * All config values are interpolated as HTML. Only pass trusted content.
 * @module components/about-dialog/AboutDialog
 */

const STYLES_ID = 'hf-about-styles'

/**
 * Normalize any date-ish input to YYYY-MM-DD in the viewer's local timezone.
 * Accepts a Date, number (ms since epoch), or parseable string. Returns null
 * for nullish or unparseable input so the caller can fall back to a default.
 */
function formatLocalDate(input) {
    if (input == null) return null
    const d = input instanceof Date ? input : new Date(input)
    if (Number.isNaN(d.getTime())) return null
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function injectStyles() {
    if (document.getElementById(STYLES_ID)) return
    const style = document.createElement('style')
    style.id = STYLES_ID
    style.textContent = `
        .hf-about {
            width: min(720px, 100vw);
            max-width: 720px;
            min-width: 320px;
            font-family: var(--hf-font-family);
        }

        .hf-about-content {
            display: grid;
            grid-template-columns: min(80%, 320px) 1fr;
            align-items: stretch;
        }

        .hf-about-graphic {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2.75rem 2.5rem;
            background: linear-gradient(
                180deg,
                color-mix(in srgb, var(--hf-accent-3, var(--hf-accent)) 12%, transparent 88%) 0%,
                transparent 100%
            );
        }

        .hf-about-graphic svg,
        .hf-about-graphic img {
            width: min(80%, 200px);
            max-width: 200px;
            height: auto;
            color: var(--hf-color-6, var(--hf-text-bright));
            filter: drop-shadow(0 0 20px color-mix(in srgb, var(--hf-accent-3, var(--hf-accent)) 40%, transparent 60%));
        }

        .hf-about-details {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            padding: 2.75rem 2rem;
            color: var(--hf-color-6, var(--hf-text-normal));
        }

        .hf-about-details:focus,
        .hf-about-details:focus-visible {
            outline: none;
        }

        .hf-about-name {
            font-family: var(--hf-font-family);
            font-weight: 900;
            font-size: clamp(2rem, 4vw, 2.75rem);
            line-height: 1.1;
            color: var(--hf-text-bright, var(--hf-color-7));
            margin-bottom: 1.25rem;
        }

        .hf-about-version {
            font-size: 0.9rem;
            color: var(--hf-color-5, var(--hf-text-dim));
        }

        .hf-about-copyright {
            font-size: 0.9rem;
            color: color-mix(in srgb, var(--hf-color-5, var(--hf-text-dim)) 65%, transparent 35%);
            margin-bottom: 1rem;
        }

        .hf-about-build-hash,
        .hf-about-build-date {
            font-size: 0.8rem;
            font-family: var(--hf-font-family-mono);
            letter-spacing: 0.06em;
            color: var(--hf-color-5, var(--hf-text-dim));
        }

        .hf-about-noisemaker-section {
            display: flex;
            flex-direction: column;
            gap: 0.15rem;
            margin-top: 1rem;
            font-size: 0.7rem;
            color: var(--hf-color-5, var(--hf-text-dim));
        }

        .hf-about-noisemaker-heading {
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        .hf-about-noisemaker-hash,
        .hf-about-noisemaker-date {
            font-family: var(--hf-font-family-mono);
            letter-spacing: 0.06em;
        }

        .hf-about-divider {
            border: 0;
            border-top: 1px solid color-mix(in srgb, var(--hf-color-5, var(--hf-text-dim)) 30%, transparent 70%);
            margin: 1.25rem 0 1rem;
            width: 100%;
        }

        .hf-about-divider:last-child {
            display: none;
        }

        .hf-about-tagline {
            font-size: 1rem;
            letter-spacing: 0.02em;
            color: var(--hf-accent-3, var(--hf-accent));
        }

        .hf-about-ecosystem {
            font-size: 0.8rem;
            color: color-mix(in srgb, var(--hf-color-5, var(--hf-text-dim)) 55%, transparent 45%);
            margin-top: 0.75rem;
            line-height: 1.4;
        }

        .hf-about a {
            color: var(--hf-color-5, var(--hf-accent));
            text-decoration: none;
        }

        .hf-about a:hover {
            color: var(--hf-accent-3, var(--hf-accent));
            text-decoration: underline;
        }

        @media (max-width: 720px) {
            .hf-about {
                width: min(540px, 94vw);
                max-width: 540px;
            }

            .hf-about-content {
                grid-template-columns: 1fr;
                text-align: center;
            }

            .hf-about-graphic {
                padding: 2.25rem 2rem 1.5rem;
            }

            .hf-about-graphic svg,
            .hf-about-graphic img {
                width: min(60%, 180px);
            }

            .hf-about-details {
                align-items: center;
                padding: 1.75rem 2rem 2.25rem;
            }
        }
    `
    document.head.appendChild(style)
}

export class AboutDialog {
    constructor(config = {}) {
        if (!config.name) throw new Error('AboutDialog: name is required')

        this._config = {
            name: config.name,
            version: config.version || null,
            logo: config.logo || null,
            tagline: config.tagline || null,
            copyright: config.copyright || String(new Date().getFullYear()),
            repo: config.repo || null,
            ecosystem: config.ecosystem || null,
            titleFont: config.titleFont || null,
        }

        this._dialog = null
        this._build = null
        this._noisemaker = null

        injectStyles()
    }

    show() {
        if (!this._dialog) this._createDialog()
        this._dialog.showModal()
    }

    hide() {
        if (this._dialog) this._dialog.close()
    }

    destroy() {
        if (this._dialog) {
            this._dialog.close()
            this._dialog.remove()
            this._dialog = null
        }
    }

    setBuild({ hash, deployed } = {}) {
        this._build = {
            hash: hash || null,
            deployed: formatLocalDate(deployed),
        }
        this._renderBuild()
    }

    setNoisemaker({ version, hash, deployed } = {}) {
        this._noisemaker = {
            version: version || null,
            hash: hash || null,
            deployed: formatLocalDate(deployed),
        }
        this._renderNoisemaker()
    }

    setEcosystem(html) {
        this._config.ecosystem = html
        this._renderEcosystem()
    }

    _createDialog() {
        const c = this._config

        this._dialog = document.createElement('dialog')
        this._dialog.className = 'hf-dialog hf-about'

        const versionHtml = c.version
            ? `<div class="hf-about-version">Version ${c.version.replace(/-.*$/, '')}</div>`
            : ''

        this._dialog.innerHTML = `
            <div class="hf-about-content">
                ${c.logo ? `<div class="hf-about-graphic" role="presentation">${c.logo}</div>` : ''}
                <div class="hf-about-details" tabindex="-1">
                    <div class="hf-about-name"${c.titleFont ? ` style="font-family: ${c.titleFont}"` : ''}>${c.name}</div>
                    <div class="hf-about-copyright">&copy; ${c.copyright} <a href="https://noisefactor.io/" target="_blank" rel="noopener">Noise Factor LLC.</a></div>
                    ${versionHtml}
                    <div class="hf-about-build-hash"></div>
                    <div class="hf-about-build-date"></div>
                    <hr class="hf-about-divider">
                    ${c.tagline ? `<div class="hf-about-tagline">${c.tagline}</div>` : ''}
                </div>
            </div>
        `

        this._renderBuild()
        this._renderNoisemaker()
        this._renderEcosystem()

        this._dialog.addEventListener('click', (e) => {
            if (e.target === this._dialog) this.hide()
        })

        document.body.appendChild(this._dialog)
    }

    _renderBuild() {
        if (!this._dialog) return
        const hashEl = this._dialog.querySelector('.hf-about-build-hash')
        const dateEl = this._dialog.querySelector('.hf-about-build-date')
        if (!hashEl || !dateEl) return

        const hash = this._build?.hash || 'local'
        const deployed = this._build?.deployed || 'n/a'
        const repo = this._config.repo
        const hashDisplay = hash !== 'local' && hash !== 'LOCAL' && repo
            ? `<a href="https://github.com/${repo}/tree/${hash}" target="_blank" rel="noopener">${hash}</a>`
            : hash

        hashEl.innerHTML = `Build: ${hashDisplay}`
        dateEl.textContent = `Deployed: ${deployed}`
    }

    _renderNoisemaker() {
        if (!this._dialog) return
        const existing = this._dialog.querySelector('.hf-about-noisemaker-section')
        const nm = this._noisemaker
        const hasContent = nm && (nm.version || nm.hash || nm.deployed)

        if (!hasContent) {
            if (existing) existing.remove()
            return
        }

        const parts = []
        const versionText = nm.version ? nm.version.replace(/-.*$/, '') : '—'
        parts.push(`<div class="hf-about-noisemaker-heading">Noisemaker Engine: ${versionText}</div>`)

        if (nm.hash) {
            const hashDisplay = nm.hash !== 'local' && nm.hash !== 'LOCAL'
                ? `<a href="https://github.com/noisefactorllc/noisemaker/tree/${nm.hash}" target="_blank" rel="noopener">${nm.hash}</a>`
                : nm.hash
            parts.push(`<div class="hf-about-noisemaker-hash">Build: ${hashDisplay}</div>`)
        }

        if (nm.deployed) {
            parts.push(`<div class="hf-about-noisemaker-date">Deployed: ${nm.deployed}</div>`)
        }

        let section = existing
        if (!section) {
            section = document.createElement('div')
            section.className = 'hf-about-noisemaker-section'
            // Insert right before the divider so noisemaker info lives with the build info
            const divider = this._dialog.querySelector('.hf-about-divider')
            if (divider) divider.before(section)
        }
        section.innerHTML = parts.join('')
    }

    _renderEcosystem() {
        if (!this._dialog) return
        const existing = this._dialog.querySelector('.hf-about-ecosystem')
        const html = this._config.ecosystem

        if (!html) {
            if (existing) existing.remove()
            return
        }

        let el = existing
        if (!el) {
            el = document.createElement('div')
            el.className = 'hf-about-ecosystem'
            const details = this._dialog.querySelector('.hf-about-details')
            if (details) details.appendChild(el)
        }
        el.innerHTML = html
    }
}
