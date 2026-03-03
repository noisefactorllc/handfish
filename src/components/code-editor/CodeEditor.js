/**
 * Code Editor Web Component
 *
 * A generic code editor component with:
 * - Line numbers
 * - Pluggable syntax highlighting via setTokenizer()
 * - Improved cursor visibility
 * - Better text selection highlighting
 * - Configurable font, text size, background color and opacity
 *
 * @module components/code-editor/CodeEditor
 */

import { defaultTokenizer } from './tokenizers/default.js'

// =====================================================================
// Syntax Highlighting Helpers
// =====================================================================

/**
 * Convert tokens to highlighted HTML
 * @param {Array<{type: string, text: string}>} tokens
 * @returns {string}
 */
function tokensToHtml(tokens) {
    return tokens.map(token => {
        const escaped = token.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        if (token.type === 'text') {
            return escaped
        }
        return `<span class="hl-${token.type}">${escaped}</span>`
    }).join('')
}

// Inject styles once into document head
const CODE_EDITOR_STYLES_ID = 'hf-code-editor-styles'
if (!document.getElementById(CODE_EDITOR_STYLES_ID)) {
    const styleEl = document.createElement('style')
    styleEl.id = CODE_EDITOR_STYLES_ID
    styleEl.textContent = `
        code-editor {
            display: block;
            position: relative;
            font-family: var(--code-editor-font, var(--hf-font-family-mono, ui-monospace, 'Cascadia Mono', 'Consolas', monospace));
            font-size: var(--code-editor-font-size, 0.95rem);
            line-height: var(--code-editor-line-height, 1.6);
            overflow: hidden;
        }

        /* Line numbers gutter */
        code-editor .code-editor-gutter {
            position: absolute;
            top: 0;
            left: 0;
            width: var(--code-editor-gutter-width, 3em);
            pointer-events: none;
            user-select: none;
            text-align: right;
            padding-right: 0.5em;
            box-sizing: border-box;
            color: var(--code-editor-line-number-color, var(--hf-text-dim, #666));
            background: var(--code-editor-gutter-bg, rgba(7, 9, 13, 0.75));
            font: inherit;
            line-height: inherit;
            will-change: transform;
            z-index: 1;
        }

        code-editor .code-editor-gutter .line-number {
            display: block;
            opacity: 0.5;
            box-sizing: border-box;
        }

        code-editor .code-editor-textarea {
            position: absolute;
            top: 0;
            bottom: 0;
            left: var(--code-editor-gutter-width, 3em);
            right: 0;
            margin: 0;
            padding: 0;
            background: transparent;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            resize: none;
            font: inherit;
            line-height: inherit;
            letter-spacing: inherit;
            word-spacing: inherit;
            color: transparent;
            caret-color: var(--code-editor-caret-color, var(--hf-accent, #5a7fdd));
            white-space: pre-wrap;
            overflow-wrap: break-word;
            word-break: break-word;
            box-sizing: border-box;
            -webkit-appearance: none;
            appearance: none;
            overflow-y: auto;
            overflow-x: hidden;
            scrollbar-width: none;
            -ms-overflow-style: none;
            z-index: 3;
        }

        code-editor .code-editor-textarea::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
        }

        /* Selection styling */
        code-editor .code-editor-textarea::selection {
            background: var(--code-editor-selection-bg, var(--hf-accent, #5a7fdd));
            color: var(--code-editor-selection-fg, #fff);
        }

        code-editor .code-editor-textarea::-moz-selection {
            background: var(--code-editor-selection-bg, var(--hf-accent, #5a7fdd));
            color: var(--code-editor-selection-fg, #fff);
        }

        /* Display layer - positioned behind textarea for syntax highlighting */
        code-editor .code-editor-display {
            position: absolute;
            top: 0;
            left: var(--code-editor-gutter-width, 3em);
            right: 0;
            pointer-events: none;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            word-break: break-word;
            font: inherit;
            line-height: inherit;
            letter-spacing: inherit;
            word-spacing: inherit;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            will-change: transform;
            z-index: 2;
        }

        code-editor .code-editor-display .code-line {
            display: block;
            background: var(--code-editor-bg, transparent);
            -webkit-box-decoration-break: clone;
            box-decoration-break: clone;
        }

        code-editor .code-editor-display .code-segment {
            background: var(--text-bg-color, #000);
            padding: 0.125em 0;
        }

        /* Focus state */
        code-editor:focus-within {
            outline: 1px solid var(--code-editor-focus-outline, transparent);
        }

        /* Syntax highlighting colors */
        code-editor .hl-comment {
            color: var(--hl-comment, #6a737d);
            font-style: italic;
        }

        code-editor .hl-string {
            color: var(--hl-string, #9ecbff);
        }

        code-editor .hl-number {
            color: var(--hl-number, #79b8ff);
        }

        code-editor .hl-color {
            color: var(--hl-color, #ffab70);
        }

        code-editor .hl-boolean {
            color: var(--hl-boolean, #ff7b72);
        }

        code-editor .hl-null {
            color: var(--hl-null, #ff7b72);
        }

        code-editor .hl-function {
            color: var(--hl-function, #d2a8ff);
        }

        code-editor .hl-parameter {
            color: var(--hl-parameter, #ffa657);
        }

        code-editor .hl-output {
            color: var(--hl-output, #7ee787);
            font-weight: 600;
        }

        code-editor .hl-punctuation {
            color: var(--hl-punctuation, var(--hf-text-normal, #e0e0e0));
        }

        code-editor .hl-operator {
            color: var(--hl-operator, #ff7b72);
        }

        code-editor .hl-identifier {
            color: var(--hl-identifier, var(--hf-text-normal, #e0e0e0));
        }

        /* Selection highlight overlay */
        code-editor .code-editor-selection-highlight {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
        }
    `
    document.head.appendChild(styleEl)
}

/**
 * CodeEditor - Web component for code editing with pluggable syntax highlighting
 * @extends HTMLElement
 */
class CodeEditor extends HTMLElement {
    static get observedAttributes() {
        return [
            'value',
            'spellcheck',
            'placeholder',
            'readonly',
            'disabled',
            'font-family',
            'font-size',
            'background-color',
            'background-opacity',
            'text-color',
            'text-bg-color',
            'caret-color',
            'selection-color',
            'line-numbers'
        ]
    }

    constructor() {
        super()

        /** @type {HTMLTextAreaElement|null} */
        this._textarea = null

        /** @type {HTMLElement|null} */
        this._display = null

        /** @type {HTMLElement|null} */
        this._gutter = null

        /** @type {boolean} */
        this._rendered = false

        /** @type {string} */
        this._value = ''

        /** @type {boolean} */
        this._showLineNumbers = true

        /** @type {ResizeObserver|null} */
        this._resizeObserver = null

        /** @type {Function} Tokenizer function: (line: string) => Array<{type, text}> */
        this._tokenizer = defaultTokenizer

        // Store original value descriptor for programmatic value changes
        this._origDescriptor = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype, 'value'
        )
    }

    connectedCallback() {
        if (!this._rendered) {
            this._render()
            this._rendered = true
        }
        this._attachEventListeners()
        this._applyStyles()
        this.syncDisplay()

        // Set up ResizeObserver to handle width changes that affect line wrapping
        this._resizeObserver = new ResizeObserver(() => {
            this._syncLineHeights()
        })
        this._resizeObserver.observe(this)
    }

    disconnectedCallback() {
        this._detachEventListeners()
        if (this._resizeObserver) {
            this._resizeObserver.disconnect()
            this._resizeObserver = null
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return

        switch (name) {
            case 'value':
                this.value = newValue || ''
                break
            case 'spellcheck':
                if (this._textarea) {
                    this._textarea.spellcheck = newValue === 'true'
                }
                break
            case 'placeholder':
                if (this._textarea) {
                    this._textarea.placeholder = newValue || ''
                }
                break
            case 'readonly':
                if (this._textarea) {
                    this._textarea.readOnly = newValue !== null
                }
                break
            case 'disabled':
                if (this._textarea) {
                    this._textarea.disabled = newValue !== null
                }
                break
            case 'line-numbers':
                this._showLineNumbers = newValue !== 'false'
                this._updateGutterVisibility()
                this.syncDisplay()
                break
            case 'font-family':
            case 'font-size':
            case 'background-color':
            case 'background-opacity':
            case 'text-color':
            case 'caret-color':
            case 'selection-color':
                this._applyStyles()
                break
        }
    }

    // =====================================================================
    // Public API
    // =====================================================================

    /**
     * Get the current value
     * @returns {string}
     */
    get value() {
        if (this._textarea) {
            return this._origDescriptor.get.call(this._textarea)
        }
        return this._value
    }

    /**
     * Set the value
     * @param {string} v
     */
    set value(v) {
        this._value = v ?? ''
        if (this._textarea) {
            this._origDescriptor.set.call(this._textarea, this._value)
            this.syncDisplay()
            requestAnimationFrame(() => this.syncScroll())
        }
    }

    /**
     * Get the current tokenizer function
     * @returns {Function}
     */
    get tokenizer() {
        return this._tokenizer
    }

    /**
     * Set a custom tokenizer function
     * @param {Function} fn - A function (line: string) => Array<{type: string, text: string}>
     */
    set tokenizer(fn) {
        this.setTokenizer(fn)
    }

    /**
     * Set a custom tokenizer function and re-render
     * @param {Function} fn - A function (line: string) => Array<{type: string, text: string}>
     */
    setTokenizer(fn) {
        if (typeof fn !== 'function') {
            throw new TypeError('Tokenizer must be a function')
        }
        this._tokenizer = fn
        if (this._rendered) {
            this.syncDisplay()
        }
    }

    /**
     * Get the textarea element for direct access if needed
     * @returns {HTMLTextAreaElement|null}
     */
    getTextarea() {
        return this._textarea
    }

    /**
     * Get the display element for direct access if needed
     * @returns {HTMLElement|null}
     */
    getDisplay() {
        return this._display
    }

    /**
     * Focus the editor
     */
    focus() {
        this._textarea?.focus()
    }

    /**
     * Blur the editor
     */
    blur() {
        this._textarea?.blur()
    }

    /**
     * Select all text
     */
    selectAll() {
        if (this._textarea) {
            this._textarea.select()
        }
    }

    /**
     * Get selection start
     * @returns {number}
     */
    get selectionStart() {
        return this._textarea?.selectionStart ?? 0
    }

    /**
     * Set selection start
     * @param {number} v
     */
    set selectionStart(v) {
        if (this._textarea) {
            this._textarea.selectionStart = v
        }
    }

    /**
     * Get selection end
     * @returns {number}
     */
    get selectionEnd() {
        return this._textarea?.selectionEnd ?? 0
    }

    /**
     * Set selection end
     * @param {number} v
     */
    set selectionEnd(v) {
        if (this._textarea) {
            this._textarea.selectionEnd = v
        }
    }

    /**
     * Set selection range
     * @param {number} start
     * @param {number} end
     * @param {string} [direction]
     */
    setSelectionRange(start, end, direction) {
        this._textarea?.setSelectionRange(start, end, direction)
    }

    /**
     * Sync the display element with the textarea content.
     * Converts plain text to syntax-highlighted HTML spans using the current tokenizer.
     */
    syncDisplay() {
        if (!this._display || !this._textarea) return

        const lines = this.value.split('\n')

        // Update syntax-highlighted display
        this._display.innerHTML = lines.map(line => {
            const tokens = this._tokenizer(line)
            const highlighted = tokensToHtml(tokens)
            return `<span class="code-line"><span class="code-segment">${highlighted}</span>\n</span>`
        }).join('')

        // Update line numbers gutter
        if (this._gutter && this._showLineNumbers) {
            this._gutter.innerHTML = lines.map((_, i) =>
                `<span class="line-number">${i + 1}</span>`
            ).join('')
        }

        // Sync line heights after DOM update
        requestAnimationFrame(() => this._syncLineHeights())
    }

    /**
     * Sync the display scroll position with the textarea
     */
    syncScroll() {
        if (!this._textarea) return
        const scrollTop = this._textarea.scrollTop
        if (this._display) {
            this._display.style.transform = `translateY(${-scrollTop}px)`
        }
        if (this._gutter) {
            this._gutter.style.transform = `translateY(${-scrollTop}px)`
        }
    }

    // =====================================================================
    // Private Methods
    // =====================================================================

    /**
     * Render the component structure
     * @private
     */
    _render() {
        // Check line-numbers attribute (default to true)
        this._showLineNumbers = this.getAttribute('line-numbers') !== 'false'

        // Create line numbers gutter
        this._gutter = document.createElement('div')
        this._gutter.className = 'code-editor-gutter'
        this._gutter.setAttribute('aria-hidden', 'true')

        // Create textarea
        this._textarea = document.createElement('textarea')
        this._textarea.className = 'code-editor-textarea'
        this._textarea.name = 'code-editor-textarea'
        this._textarea.spellcheck = this.getAttribute('spellcheck') === 'true'
        this._textarea.placeholder = this.getAttribute('placeholder') || ''
        this._textarea.readOnly = this.hasAttribute('readonly')
        this._textarea.disabled = this.hasAttribute('disabled')

        // Create display overlay
        this._display = document.createElement('div')
        this._display.className = 'code-editor-display'
        this._display.setAttribute('aria-hidden', 'true')

        // Add elements to component
        this.appendChild(this._gutter)
        this.appendChild(this._display)
        this.appendChild(this._textarea)

        // Apply initial gutter visibility
        this._updateGutterVisibility()

        // Set initial value if provided
        if (this._value) {
            this._origDescriptor.set.call(this._textarea, this._value)
        }

        // Override the value setter on textarea to auto-sync display
        const self = this
        Object.defineProperty(this._textarea, 'value', {
            get() { return self._origDescriptor.get.call(this) },
            set(v) {
                self._origDescriptor.set.call(this, v)
                self.syncDisplay()
                requestAnimationFrame(() => self.syncScroll())
            }
        })
    }

    /**
     * Apply custom styles from attributes
     * @private
     */
    _applyStyles() {
        const fontFamily = this.getAttribute('font-family')
        const fontSize = this.getAttribute('font-size')
        const bgColor = this.getAttribute('background-color')
        const bgOpacity = this.getAttribute('background-opacity')
        const textColor = this.getAttribute('text-color')
        const textBgColor = this.getAttribute('text-bg-color')
        const caretColor = this.getAttribute('caret-color')
        const selectionColor = this.getAttribute('selection-color')

        if (fontFamily) {
            this.style.setProperty('--code-editor-font', fontFamily)
        }
        if (fontSize) {
            this.style.setProperty('--code-editor-font-size', fontSize)
        }
        if (bgColor) {
            const opacity = bgOpacity ? parseFloat(bgOpacity) : 0.85
            this.style.setProperty('--code-editor-bg', this._colorWithOpacity(bgColor, opacity))
        } else if (bgOpacity) {
            const opacity = parseFloat(bgOpacity)
            this.style.setProperty('--code-editor-bg', `rgba(7, 9, 13, ${opacity})`)
        }
        if (textColor) {
            this.style.setProperty('--code-editor-text-color', textColor)
        }
        if (textBgColor) {
            this.style.setProperty('--text-bg-color', textBgColor)
        }
        if (caretColor) {
            this.style.setProperty('--code-editor-caret-color', caretColor)
        }
        if (selectionColor) {
            this.style.setProperty('--code-editor-selection-bg', selectionColor)
        }
    }

    /**
     * Convert a color to rgba with specified opacity
     * @param {string} color - CSS color value
     * @param {number} opacity - Opacity value 0-1
     * @returns {string} RGBA color string
     * @private
     */
    _colorWithOpacity(color, opacity) {
        if (color.startsWith('rgba') || color.startsWith('hsla')) {
            return color
        }
        if (color.startsWith('#')) {
            const hex = color.slice(1)
            const bigint = parseInt(hex.length === 3
                ? hex.split('').map(c => c + c).join('')
                : hex, 16)
            const r = (bigint >> 16) & 255
            const g = (bigint >> 8) & 255
            const b = bigint & 255
            return `rgba(${r}, ${g}, ${b}, ${opacity})`
        }
        if (color.startsWith('rgb(')) {
            return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`)
        }
        return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent ${(1 - opacity) * 100}%)`
    }

    /**
     * Update gutter visibility based on line-numbers setting
     * @private
     */
    _updateGutterVisibility() {
        if (!this._gutter) return

        if (this._showLineNumbers) {
            this._gutter.style.display = ''
            this.style.setProperty('--code-editor-gutter-width', '3em')
        } else {
            this._gutter.style.display = 'none'
            this.style.setProperty('--code-editor-gutter-width', '0')
        }
    }

    /**
     * Sync line number heights with code line heights to handle wrapping
     * @private
     */
    _syncLineHeights() {
        if (!this._gutter || !this._display || !this._showLineNumbers) return

        const codeLines = this._display.querySelectorAll('.code-line')
        const lineNumbers = this._gutter.querySelectorAll('.line-number')

        if (codeLines.length !== lineNumbers.length) return

        for (let i = 0; i < codeLines.length; i++) {
            const codeLineHeight = codeLines[i].getBoundingClientRect().height
            lineNumbers[i].style.height = `${codeLineHeight}px`
        }
    }

    /**
     * Attach event listeners
     * @private
     */
    _attachEventListeners() {
        if (!this._textarea) return

        this._boundScrollHandler = () => this.syncScroll()
        this._boundInputHandler = (e) => this._handleInput(e)
        this._boundKeydownHandler = (e) => this._handleKeydown(e)

        this._textarea.addEventListener('scroll', this._boundScrollHandler, { passive: true })
        this._textarea.addEventListener('input', this._boundInputHandler)
        this._textarea.addEventListener('keydown', this._boundKeydownHandler)
    }

    /**
     * Detach event listeners
     * @private
     */
    _detachEventListeners() {
        if (!this._textarea) return

        if (this._boundScrollHandler) {
            this._textarea.removeEventListener('scroll', this._boundScrollHandler)
        }
        if (this._boundInputHandler) {
            this._textarea.removeEventListener('input', this._boundInputHandler)
        }
        if (this._boundKeydownHandler) {
            this._textarea.removeEventListener('keydown', this._boundKeydownHandler)
        }
    }

    /**
     * Handle input events
     * @private
     */
    _handleInput() {
        this.syncDisplay()
        requestAnimationFrame(() => this.syncScroll())

        // Dispatch custom event for external listeners
        this.dispatchEvent(new CustomEvent('input', {
            bubbles: true,
            composed: true,
            detail: { value: this.value }
        }))
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} e
     * @private
     */
    _handleKeydown(e) {
        // Dispatch custom event for force recompile (Ctrl/Cmd+Enter)
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            this.dispatchEvent(new CustomEvent('forcerecompile', {
                bubbles: true,
                composed: true
            }))
        }
    }
}

// Register the custom element
customElements.define('code-editor', CodeEditor)

export { CodeEditor }
