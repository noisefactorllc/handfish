/**
 * About Dialog Component
 * Generic about/version info dialog for Noise Factor applications.
 * All config values are interpolated as HTML. Only pass trusted content.
 * @module components/about-dialog/AboutDialog
 */

const STYLES_ID = 'hf-about-styles'

/**
 * Normalize any date-ish input to "YYYY-MM-DD HH:MM <TZ>" in the viewer's
 * local timezone (24h, short timezone name). Accepts a Date, number (ms since
 * epoch), or parseable string. Returns null for nullish or unparseable input
 * so the caller can fall back to a default.
 */
function formatLocalDateTime(input) {
    if (input == null) return null
    const d = input instanceof Date ? input : new Date(input)
    if (Number.isNaN(d.getTime())) return null
    const pad = (n) => String(n).padStart(2, '0')
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    const tz = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
        .formatToParts(d)
        .find((p) => p.type === 'timeZoneName')?.value
    return tz ? `${date} ${time} ${tz}` : `${date} ${time}`
}

const DEFAULT_LABELS = {
    version: 'Version',
    build: 'Build',
    deployed: 'Deployed',
    noisemakerEngine: 'Noisemaker Engine',
    local: 'local',
    unavailable: 'n/a',
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

function isolatedValue(value) {
    return `<bdi dir="auto">${escapeHtml(value)}</bdi>`
}

function labelSpan(label) {
    return `<span class="hf-about-label">${escapeHtml(label)}</span>`
}

function githubTreeHref(repo, ref) {
    const repoPath = String(repo || '')
    const refText = String(ref || '')
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoPath)) return null
    if (!refText || refText === '@') return null
    if (/[\u0000-\u0020\u007F"'<>`\\]/.test(refText)) return null
    if (/[~^:?*\[]/.test(refText)) return null
    if (refText.startsWith('/') || refText.endsWith('/') || refText.endsWith('.')) return null
    if (refText.includes('//') || refText.includes('..') || refText.includes('@{')) return null

    const segments = refText.split('/')
    if (segments.some(segment => !segment || segment.endsWith('.lock'))) return null

    const encodedRef = segments
        .map(segment => encodeURIComponent(segment))
        .join('/')
    return `https://github.com/${repoPath}/tree/${encodedRef}`
}

function linkedIsolatedValue(value, href) {
    const safeValue = isolatedValue(value)
    return href
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${safeValue}</a>`
        : safeValue
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

        .hf-about-label {
            unicode-bidi: isolate;
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
            color: var(--hf-accent-3, var(--hf-accent));
            text-decoration: none;
        }

        .hf-about a:hover {
            color: var(--hf-accent-4, var(--hf-accent));
            text-decoration: none;
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
            labels: { ...DEFAULT_LABELS, ...(config.labels || {}) },
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
            deployed: formatLocalDateTime(deployed),
        }
        this._renderBuild()
    }

    setNoisemaker({ version, hash, deployed } = {}) {
        this._noisemaker = {
            version: version || null,
            hash: hash || null,
            deployed: formatLocalDateTime(deployed),
        }
        this._renderNoisemaker()
    }

    /**
     * Fetch noisemaker build metadata from a deployment-meta.json URL
     * and populate the noisemaker section. Expected JSON shape:
     *
     *   { "git_hash": "<sha>", "date": <unix-seconds>, "version": "X.Y.Z" }
     *
     * Fails silently on network or parse errors — the noisemaker
     * section is decorative, and the caller's own build info should
     * still render even if this fetch is unavailable.
     *
     * Typical usage from a platform product:
     *
     *   aboutDialog.setNoisemakerFromUrl(
     *       'https://shaders.noisedeck.app/1/deployment-meta.json'
     *   )
     *
     * @param {string} metaUrl - URL to a deployment-meta.json file.
     * @returns {Promise<void>}
     */
    async setNoisemakerFromUrl(metaUrl) {
        try {
            const response = await fetch(metaUrl, { cache: 'no-store' })
            if (!response.ok) return
            const data = await response.json()
            this.setNoisemaker({
                version: data.version || null,
                hash: data.git_hash ? String(data.git_hash).slice(0, 8) : null,
                deployed: data.date ? new Date(data.date * 1000) : null,
            })
        } catch {
            // Fail silently — noisemaker metadata is decorative.
        }
    }

    setEcosystem(html) {
        this._config.ecosystem = html
        this._renderEcosystem()
    }

    _createDialog() {
        const c = this._config
        const labels = c.labels

        this._dialog = document.createElement('dialog')
        this._dialog.className = 'hf-dialog hf-about'

        // Products get a MAJOR.MINOR display only — the dialog never
        // shows a patch segment for the deployed product. Accepts any
        // tool-friendly form (`1.9`, `1.9.0`, `1.9.0-SNAPSHOT`, etc.)
        // and extracts the first two numeric segments. Non-numeric
        // input falls back to the raw string so the display never
        // silently disappears.
        const productVersion = c.version
            ? (c.version.match(/^(\d+\.\d+)/)?.[1] || c.version)
            : null
        const versionHtml = productVersion
            ? `<div class="hf-about-version">${labelSpan(labels.version)} ${isolatedValue(productVersion)}</div>`
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

        const labels = this._config.labels
        const rawHash = this._build?.hash ? String(this._build.hash) : null
        const hash = rawHash || labels.local
        const deployed = this._build?.deployed || labels.unavailable
        const repo = this._config.repo
        const hashHref = rawHash && rawHash.toLowerCase() !== 'local'
            ? githubTreeHref(repo, rawHash)
            : null
        const hashValue = linkedIsolatedValue(hash, hashHref)

        hashEl.innerHTML = `${labelSpan(labels.build)}: ${hashValue}`
        dateEl.innerHTML = `${labelSpan(labels.deployed)}: ${isolatedValue(deployed)}`
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

        const labels = this._config.labels
        const parts = []
        const versionText = nm.version ? nm.version.replace(/-.*$/, '') : labels.unavailable
        parts.push(`<div class="hf-about-noisemaker-heading">${labelSpan(labels.noisemakerEngine)}: ${isolatedValue(versionText)}</div>`)

        if (nm.hash) {
            const hash = String(nm.hash)
            const hashHref = hash.toLowerCase() !== 'local'
                ? githubTreeHref('noisefactorllc/noisemaker', hash)
                : null
            const hashDisplay = linkedIsolatedValue(hash, hashHref)
            parts.push(`<div class="hf-about-noisemaker-hash">${labelSpan(labels.build)}: ${hashDisplay}</div>`)
        }

        if (nm.deployed) {
            parts.push(`<div class="hf-about-noisemaker-date">${labelSpan(labels.deployed)}: ${isolatedValue(nm.deployed)}</div>`)
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
