/**
 * About Dialog Component
 * Generic about/version info dialog for Noise Factor applications.
 * All config values are interpolated as HTML. Only pass trusted content.
 * @module components/about-dialog/AboutDialog
 */

const STYLES_ID = 'hf-about-styles'

function injectStyles() {
    if (document.getElementById(STYLES_ID)) return
    const style = document.createElement('style')
    style.id = STYLES_ID
    style.textContent = `
        .hf-about {
            width: min(720px, 100vw);
            max-width: 720px;
            min-width: 320px;
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
            justify-content: center;
            gap: 0.5rem;
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
        }

        .hf-about-tagline {
            font-size: 1rem;
            letter-spacing: 0.02em;
            color: var(--hf-accent-3, var(--hf-accent));
        }

        .hf-about-authors {
            font-size: 1.05rem;
            letter-spacing: 0.01em;
        }

        .hf-about-version {
            font-size: 0.9rem;
            color: var(--hf-color-5, var(--hf-text-dim));
        }

        .hf-about-copyright {
            font-size: 0.9rem;
            color: color-mix(in srgb, var(--hf-color-5, var(--hf-text-dim)) 65%, transparent 35%);
        }

        .hf-about-build {
            font-size: 0.8rem;
            font-family: var(--hf-font-family-mono, monospace);
            letter-spacing: 0.08em;
            color: var(--hf-color-5, var(--hf-text-dim));
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
            authors: config.authors || null,
            copyright: config.copyright || String(new Date().getFullYear()),
            repo: config.repo || null,
            ecosystem: config.ecosystem || null,
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

    setBuild({ hash, deployed }) {
        this._build = { hash, deployed }
        this._updateBuild()
    }

    setNoisemaker(hash) {
        this._noisemaker = hash
        this._updateNoisemaker()
    }

    setEcosystem(html) {
        this._config.ecosystem = html
        this._updateEcosystem()
    }

    _createDialog() {
        const c = this._config
        const els = []

        if (c.tagline) els.push(`<div class="hf-about-tagline">${c.tagline}</div>`)
        if (c.authors) els.push(`<div class="hf-about-authors">${c.authors}</div>`)
        if (c.version) els.push(`<div class="hf-about-version">version ${c.version.replace(/-.*$/, '')}</div>`)

        els.push(`<div class="hf-about-copyright">&copy; ${c.copyright} <a href="https://noisefactor.io/" target="_blank" rel="noopener">Noise Factor LLC.</a></div>`)

        els.push(`<div class="hf-about-build">${this._build ? this._formatBuild() : 'build: local / deployed: n/a'}</div>`)

        this._dialog = document.createElement('dialog')
        this._dialog.className = 'hf-dialog hf-about'

        this._dialog.innerHTML = `
            <div class="hf-about-content">
                ${c.logo ? `<div class="hf-about-graphic" role="presentation">${c.logo}</div>` : ''}
                <div class="hf-about-details" tabindex="-1">
                    <div class="hf-about-name">${c.name}</div>
                    ${els.join('\n                    ')}
                </div>
            </div>
        `

        if (this._noisemaker) this._updateNoisemaker()
        if (c.ecosystem) this._updateEcosystem()

        this._dialog.addEventListener('click', (e) => {
            if (e.target === this._dialog) this.hide()
        })

        document.body.appendChild(this._dialog)
    }

    _formatBuild() {
        const { hash, deployed } = this._build
        const repo = this._config.repo
        const hashDisplay = hash && hash !== 'LOCAL' && repo
            ? `<a href="https://github.com/${repo}/tree/${hash}" target="_blank" rel="noopener">${hash}</a>`
            : (hash || 'local')
        return `build: ${hashDisplay} / deployed: ${deployed || 'n/a'}`
    }

    _updateBuild() {
        if (!this._dialog) return
        const el = this._dialog.querySelector('.hf-about-build:not(.hf-about-noisemaker)')
        if (el) el.innerHTML = this._formatBuild()
    }

    _updateNoisemaker() {
        if (!this._dialog) return
        let el = this._dialog.querySelector('.hf-about-noisemaker')
        if (!el) {
            el = document.createElement('div')
            el.className = 'hf-about-build hf-about-noisemaker'
            const buildEl = this._dialog.querySelector('.hf-about-build')
            if (buildEl) buildEl.after(el)
        }
        if (this._noisemaker) {
            el.innerHTML = `noisemaker: <a href="https://github.com/noisefactorllc/noisemaker/tree/${this._noisemaker}" target="_blank" rel="noopener">${this._noisemaker}</a>`
        }
    }

    _updateEcosystem() {
        if (!this._dialog) return
        let el = this._dialog.querySelector('.hf-about-ecosystem')
        if (!el) {
            el = document.createElement('div')
            el.className = 'hf-about-ecosystem'
            const details = this._dialog.querySelector('.hf-about-details')
            if (details) details.appendChild(el)
        }
        el.innerHTML = this._config.ecosystem || ''
    }
}
