/**
 * Code Editor Web Component
 *
 * A generic code editor component with:
 * - Line numbers
 * - Pluggable syntax highlighting via setTokenizer()
 * - Improved cursor visibility
 * - Better text selection highlighting
 * - Configurable font, text size, background color and opacity
 * - Additive collaboration APIs for remote cursors, programmatic edits, and line flashing
 *
 * @module components/code-editor/CodeEditor
 */

import { defaultTokenizer } from './tokenizers/default.js'

function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
}

function computeTextEdit(previousValue, nextValue) {
    let start = 0
    const maxPrefix = Math.min(previousValue.length, nextValue.length)
    while (start < maxPrefix && previousValue[start] === nextValue[start]) {
        start += 1
    }

    let previousEnd = previousValue.length
    let nextEnd = nextValue.length
    while (
        previousEnd > start &&
        nextEnd > start &&
        previousValue[previousEnd - 1] === nextValue[nextEnd - 1]
    ) {
        previousEnd -= 1
        nextEnd -= 1
    }

    return {
        start,
        end: previousEnd,
        text: nextValue.slice(start, nextEnd),
    }
}

function parseCssColor(color) {
    const value = String(color || '').trim()
    if (!value) return null

    if (value.startsWith('#')) {
        const hex = value.slice(1)
        const normalized = hex.length === 3
            ? hex.split('').map((char) => char + char).join('')
            : hex
        if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
        const number = Number.parseInt(normalized, 16)
        return {
            r: (number >> 16) & 255,
            g: (number >> 8) & 255,
            b: number & 255,
        }
    }

    const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i)
    if (!rgbMatch) return null

    const parts = rgbMatch[1]
        .split(',')
        .map((part) => Number.parseFloat(part.trim()))
        .slice(0, 3)

    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null

    return {
        r: clamp(Math.round(parts[0]), 0, 255),
        g: clamp(Math.round(parts[1]), 0, 255),
        b: clamp(Math.round(parts[2]), 0, 255),
    }
}

function rgba(rgb, alpha) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

function relativeLuminance(rgb) {
    const normalize = (channel) => {
        const value = channel / 255
        return value <= 0.03928
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4
    }
    const r = normalize(rgb.r)
    const g = normalize(rgb.g)
    const b = normalize(rgb.b)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function mixRgb(base, other, weight) {
    const ratio = clamp(weight, 0, 1)
    return {
        r: Math.round(base.r * (1 - ratio) + other.r * ratio),
        g: Math.round(base.g * (1 - ratio) + other.g * ratio),
        b: Math.round(base.b * (1 - ratio) + other.b * ratio),
    }
}

function computeRemotePalette(color) {
    const rgb = parseCssColor(color) || { r: 90, g: 127, b: 221 }
    const isLight = relativeLuminance(rgb) > 0.62
    const labelBackground = isLight
        ? mixRgb(rgb, { r: 12, g: 16, b: 24 }, 0.18)
        : mixRgb(rgb, { r: 255, g: 255, b: 255 }, 0.08)
    const labelText = relativeLuminance(labelBackground) > 0.5 ? '#11161d' : '#ffffff'

    return {
        selectionFill: rgba(rgb, isLight ? 0.22 : 0.28),
        selectionBorder: rgba(rgb, isLight ? 0.72 : 0.9),
        cursorColor: rgba(rgb, 1),
        labelBackground: rgba(labelBackground, 0.98),
        labelText,
    }
}

function splitTokensAtOffsets(tokens, offsets) {
    const parts = []
    let cursor = 0

    for (const token of tokens) {
        const type = token?.type || 'text'
        const text = token?.text ?? ''
        const start = cursor
        const end = start + text.length
        cursor = end

        if (!text.length) continue

        let segmentStart = start
        for (const offset of offsets) {
            if (offset <= start || offset >= end) continue
            parts.push({
                type,
                text: text.slice(segmentStart - start, offset - start),
                start: segmentStart,
                end: offset,
            })
            segmentStart = offset
        }

        parts.push({
            type,
            text: text.slice(segmentStart - start),
            start: segmentStart,
            end,
        })
    }

    return parts
}

const CODE_EDITOR_STYLES_ID = 'hf-code-editor-styles'
if (!document.getElementById(CODE_EDITOR_STYLES_ID)) {
    const styleEl = document.createElement('style')
    styleEl.id = CODE_EDITOR_STYLES_ID
    styleEl.textContent = `
        code-editor {
            display: block;
            position: relative;
            font-family: var(--code-editor-font, var(--hf-font-family-mono));
            font-size: var(--code-editor-font-size, 0.95rem);
            line-height: var(--code-editor-line-height, 1.6);
            overflow: hidden;
        }

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

        code-editor .code-editor-textarea::selection {
            background: var(--code-editor-selection-bg, var(--hf-accent, #5a7fdd));
            color: var(--code-editor-selection-fg, #fff);
        }

        code-editor .code-editor-textarea::-moz-selection {
            background: var(--code-editor-selection-bg, var(--hf-accent, #5a7fdd));
            color: var(--code-editor-selection-fg, #fff);
        }

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

        code-editor .code-editor-display .code-line.flash-eval {
            background-image: linear-gradient(
                90deg,
                color-mix(in srgb, var(--hf-accent, #5a7fdd) 26%, transparent) 0%,
                transparent 100%
            );
            box-shadow: inset 2px 0 0 color-mix(in srgb, var(--hf-accent, #5a7fdd) 88%, transparent);
            animation: code-editor-line-flash 0.7s ease-out;
        }

        code-editor .code-editor-display .code-line.flash-error {
            background-image: linear-gradient(
                90deg,
                color-mix(in srgb, var(--hf-red, #ff7b72) 30%, transparent) 0%,
                transparent 100%
            );
            box-shadow: inset 2px 0 0 color-mix(in srgb, var(--hf-red, #ff7b72) 92%, transparent);
            animation: code-editor-line-flash 0.7s ease-out;
        }

        code-editor .code-editor-display .code-line.flash-remote {
            background-image: linear-gradient(
                90deg,
                color-mix(in srgb, var(--hf-blue, #74c0fc) 26%, transparent) 0%,
                transparent 100%
            );
            box-shadow: inset 2px 0 0 color-mix(in srgb, var(--hf-blue, #74c0fc) 90%, transparent);
            animation: code-editor-line-flash 0.7s ease-out;
        }

        code-editor .code-editor-display .code-segment {
            background: var(--text-bg-color, #000);
            padding: 0.125em 0;
        }

        code-editor .code-editor-remote-selection {
            pointer-events: none;
            background: var(--remote-selection-fill, rgba(116, 192, 252, 0.28));
            box-shadow: inset 0 0 0 1px var(--remote-selection-border, rgba(116, 192, 252, 0.9));
            border-radius: 0.15em;
        }

        code-editor .code-editor-remote-cursor {
            position: relative;
            display: inline-block;
            width: 0;
            height: 1.15em;
            margin-left: -1px;
            margin-right: -1px;
            vertical-align: text-bottom;
            border-left: 2px solid var(--remote-cursor-color, #74c0fc);
            pointer-events: none;
        }

        code-editor .code-editor-remote-cursor::after {
            content: attr(data-remote-label);
            position: absolute;
            left: 2px;
            top: -1.55em;
            max-width: 10rem;
            padding: 0.1rem 0.35rem;
            border-radius: 999px;
            background: var(--remote-cursor-label-bg, rgba(116, 192, 252, 0.98));
            color: var(--remote-cursor-label-color, #ffffff);
            font: 600 0.65rem/1.2 var(--hf-font-family, sans-serif);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        code-editor:focus-within {
            outline: var(--hf-focus-ring-width) solid var(--code-editor-focus-outline, var(--hf-focus-ring-color));
            outline-offset: var(--hf-focus-ring-offset);
        }

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

        code-editor .code-editor-selection-highlight {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
        }

        @keyframes code-editor-line-flash {
            0% { filter: brightness(1.15); }
            100% { filter: brightness(1); }
        }
    `
    document.head.appendChild(styleEl)
}

class CodeEditor extends HTMLElement {
    static collabApiVersion = 1

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
            'line-numbers',
        ]
    }

    constructor() {
        super()

        this._textarea = null
        this._display = null
        this._gutter = null
        this._rendered = false
        this._value = ''
        this._showLineNumbers = true
        this._resizeObserver = null
        this._tokenizer = defaultTokenizer
        this._remoteSelections = []
        this._flashMarks = []
        this._flashTimers = new Map()
        this._selectionState = null
        this._selectionFrame = 0
        this._boundScrollHandler = null
        this._boundInputHandler = null
        this._boundKeydownHandler = null
        this._boundSelectionHandler = null
        this._origDescriptor = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype,
            'value',
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
        this._selectionState = this.getSelectionRange()

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

        if (this._selectionFrame) {
            cancelAnimationFrame(this._selectionFrame)
            this._selectionFrame = 0
        }

        for (const timer of this._flashTimers.values()) {
            clearTimeout(timer)
        }
        this._flashTimers.clear()
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
            case 'text-bg-color':
            case 'caret-color':
            case 'selection-color':
                this._applyStyles()
                break
        }
    }

    get collabApiVersion() {
        return CodeEditor.collabApiVersion
    }

    get value() {
        if (this._textarea) {
            return this._origDescriptor.get.call(this._textarea)
        }
        return this._value
    }

    set value(value) {
        this._value = value ?? ''
        if (this._textarea) {
            this._origDescriptor.set.call(this._textarea, this._value)
            this.syncDisplay()
            requestAnimationFrame(() => this.syncScroll())
        }
    }

    get tokenizer() {
        return this._tokenizer
    }

    set tokenizer(fn) {
        this.setTokenizer(fn)
    }

    setTokenizer(fn) {
        if (typeof fn !== 'function') {
            throw new TypeError('Tokenizer must be a function')
        }
        this._tokenizer = fn
        if (this._rendered) {
            this.syncDisplay()
        }
    }

    getTextarea() {
        return this._textarea
    }

    getDisplay() {
        return this._display
    }

    focus() {
        this._textarea?.focus()
    }

    blur() {
        this._textarea?.blur()
    }

    selectAll() {
        this.setSelectionRange(0, this.value.length, 'none')
    }

    get selectionStart() {
        return this._textarea?.selectionStart ?? 0
    }

    set selectionStart(value) {
        if (this._textarea) {
            this._textarea.selectionStart = value
            this._emitSelectionChangeIfNeeded()
        }
    }

    get selectionEnd() {
        return this._textarea?.selectionEnd ?? 0
    }

    set selectionEnd(value) {
        if (this._textarea) {
            this._textarea.selectionEnd = value
            this._emitSelectionChangeIfNeeded()
        }
    }

    getSelectionRange() {
        return {
            start: this._textarea?.selectionStart ?? 0,
            end: this._textarea?.selectionEnd ?? 0,
            direction: this._textarea?.selectionDirection || 'none',
        }
    }

    setSelectionRange(start, end, direction = 'none') {
        if (!this._textarea) return
        this._textarea.setSelectionRange(start, end, direction)
        this._emitSelectionChangeIfNeeded()
    }

    replaceRange(start, end, text, options = {}) {
        const previousValue = this.value
        const safeStart = clamp(Number.isFinite(start) ? start : 0, 0, previousValue.length)
        const safeEnd = clamp(Number.isFinite(end) ? end : safeStart, safeStart, previousValue.length)
        const replacement = text ?? ''
        const nextValue = `${previousValue.slice(0, safeStart)}${replacement}${previousValue.slice(safeEnd)}`
        const previousSelection = this.getSelectionRange()

        this.value = nextValue

        const selectMode = options.select || 'preserve'
        const nextSelection = this._selectionAfterEdit(previousSelection, safeStart, safeEnd, replacement, selectMode)
        this.setSelectionRange(nextSelection.start, nextSelection.end, nextSelection.direction)

        if (options.emitInput) {
            this._dispatchInputEvent({
                value: nextValue,
                previousValue,
                edit: {
                    start: safeStart,
                    end: safeEnd,
                    text: replacement,
                },
                source: options.source || 'api',
            })
        }

        return {
            value: nextValue,
            selection: nextSelection,
        }
    }

    applyTextEdit(edit, options = {}) {
        return this.replaceRange(edit?.start ?? 0, edit?.end ?? 0, edit?.text ?? '', options)
    }

    setRemoteSelections(selections) {
        this._remoteSelections = Array.isArray(selections)
            ? selections
                .map((selection) => this._normalizeRemoteSelection(selection))
                .filter(Boolean)
                .sort((a, b) => {
                    if (a.start !== b.start) return a.start - b.start
                    if (a.end !== b.end) return a.end - b.end
                    return String(a.id).localeCompare(String(b.id))
                })
            : []
        this.syncDisplay()
    }

    setRemoteSelection(selection) {
        const normalized = this._normalizeRemoteSelection(selection)
        if (!normalized) return

        const nextSelections = [...this._remoteSelections]
        const index = nextSelections.findIndex((entry) => entry.id === normalized.id)
        if (index === -1) {
            nextSelections.push(normalized)
        } else {
            nextSelections[index] = normalized
        }
        this.setRemoteSelections(nextSelections)
    }

    clearRemoteSelection(id) {
        this.setRemoteSelections(this._remoteSelections.filter((selection) => selection.id !== id))
    }

    clearRemoteSelections() {
        this.setRemoteSelections([])
    }

    flashLines(startLine, endLine, options = {}) {
        const tone = options.tone || (options.error ? 'error' : 'eval')
        const rangeStart = Math.max(1, Number.isFinite(startLine) ? Math.floor(startLine) : 1)
        const rangeEnd = Math.max(rangeStart, Number.isFinite(endLine) ? Math.floor(endLine) : rangeStart)
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        this._flashMarks.push({ id, startLine: rangeStart, endLine: rangeEnd, tone })
        this.syncDisplay()

        const timer = window.setTimeout(() => {
            this._flashMarks = this._flashMarks.filter((mark) => mark.id !== id)
            this._flashTimers.delete(id)
            this.syncDisplay()
        }, 700)

        this._flashTimers.set(id, timer)
    }

    syncDisplay() {
        if (!this._display || !this._textarea) return

        const lines = this.value.split('\n')
        let lineStart = 0

        this._display.innerHTML = lines.map((line, index) => {
            const lineNumber = index + 1
            const lineHtml = this._renderLineHtml(line, lineStart)
            const flashClass = this._flashClassForLine(lineNumber)
            const className = flashClass ? `code-line ${flashClass}` : 'code-line'

            lineStart += line.length
            if (index < lines.length - 1) {
                lineStart += 1
            }

            return `<span class="${className}" data-line-number="${lineNumber}"><span class="code-segment">${lineHtml}</span>\n</span>`
        }).join('')

        if (this._gutter && this._showLineNumbers) {
            this._gutter.innerHTML = lines.map((_, index) => `<span class="line-number">${index + 1}</span>`).join('')
        }

        requestAnimationFrame(() => {
            this._syncLineHeights()
            this.syncScroll()
        })
    }

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

    _render() {
        this._showLineNumbers = this.getAttribute('line-numbers') !== 'false'

        this._gutter = document.createElement('div')
        this._gutter.className = 'code-editor-gutter'
        this._gutter.setAttribute('aria-hidden', 'true')

        this._textarea = document.createElement('textarea')
        this._textarea.className = 'code-editor-textarea'
        this._textarea.name = 'code-editor-textarea'
        this._textarea.spellcheck = this.getAttribute('spellcheck') === 'true'
        this._textarea.placeholder = this.getAttribute('placeholder') || ''
        this._textarea.readOnly = this.hasAttribute('readonly')
        this._textarea.disabled = this.hasAttribute('disabled')

        this._display = document.createElement('div')
        this._display.className = 'code-editor-display'
        this._display.setAttribute('aria-hidden', 'true')

        this.appendChild(this._gutter)
        this.appendChild(this._display)
        this.appendChild(this._textarea)

        this._updateGutterVisibility()

        if (this._value) {
            this._origDescriptor.set.call(this._textarea, this._value)
        }

        const self = this
        Object.defineProperty(this._textarea, 'value', {
            get() {
                return self._origDescriptor.get.call(this)
            },
            set(value) {
                self._origDescriptor.set.call(this, value)
                self._value = value ?? ''
                self.syncDisplay()
                requestAnimationFrame(() => self.syncScroll())
            },
        })
    }

    _applyStyles() {
        const fontFamily = this.getAttribute('font-family')
        const fontSize = this.getAttribute('font-size')
        const backgroundColor = this.getAttribute('background-color')
        const backgroundOpacity = this.getAttribute('background-opacity')
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
        if (backgroundColor) {
            const opacity = backgroundOpacity ? Number.parseFloat(backgroundOpacity) : 0.85
            this.style.setProperty('--code-editor-bg', this._colorWithOpacity(backgroundColor, opacity))
        } else if (backgroundOpacity) {
            const opacity = Number.parseFloat(backgroundOpacity)
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

    _colorWithOpacity(color, opacity) {
        if (color.startsWith('rgba') || color.startsWith('hsla')) {
            return color
        }
        if (color.startsWith('#')) {
            const hex = color.slice(1)
            const normalized = hex.length === 3
                ? hex.split('').map((char) => char + char).join('')
                : hex
            const number = Number.parseInt(normalized, 16)
            const r = (number >> 16) & 255
            const g = (number >> 8) & 255
            const b = number & 255
            return `rgba(${r}, ${g}, ${b}, ${opacity})`
        }
        if (color.startsWith('rgb(')) {
            return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`)
        }
        return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent ${(1 - opacity) * 100}%)`
    }

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

    _syncLineHeights() {
        if (!this._gutter || !this._display || !this._showLineNumbers) return

        const codeLines = this._display.querySelectorAll('.code-line')
        const lineNumbers = this._gutter.querySelectorAll('.line-number')

        if (codeLines.length !== lineNumbers.length) return

        for (let index = 0; index < codeLines.length; index += 1) {
            const codeLineHeight = codeLines[index].getBoundingClientRect().height
            lineNumbers[index].style.height = `${codeLineHeight}px`
        }
    }

    _attachEventListeners() {
        if (!this._textarea) return

        this._boundScrollHandler = () => this.syncScroll()
        this._boundInputHandler = (event) => this._handleInput(event)
        this._boundKeydownHandler = (event) => this._handleKeydown(event)
        this._boundSelectionHandler = () => this._emitSelectionChangeIfNeeded()

        this._textarea.addEventListener('scroll', this._boundScrollHandler, { passive: true })
        this._textarea.addEventListener('input', this._boundInputHandler)
        this._textarea.addEventListener('keydown', this._boundKeydownHandler)
        this._textarea.addEventListener('select', this._boundSelectionHandler)
        this._textarea.addEventListener('keyup', this._boundSelectionHandler)
        this._textarea.addEventListener('mouseup', this._boundSelectionHandler)
    }

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
        if (this._boundSelectionHandler) {
            this._textarea.removeEventListener('select', this._boundSelectionHandler)
            this._textarea.removeEventListener('keyup', this._boundSelectionHandler)
            this._textarea.removeEventListener('mouseup', this._boundSelectionHandler)
        }
    }

    _handleInput(event) {
        event.stopPropagation()

        const previousValue = this._value
        const nextValue = this.value
        const edit = computeTextEdit(previousValue, nextValue)

        this._value = nextValue
        this.syncDisplay()
        requestAnimationFrame(() => this.syncScroll())

        this._dispatchInputEvent({
            value: nextValue,
            previousValue,
            edit,
            source: 'user',
        })

        this._emitSelectionChangeIfNeeded()
    }

    _handleKeydown(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault()
            this.dispatchEvent(new CustomEvent('forcerecompile', {
                bubbles: true,
                composed: true,
            }))
        }
    }

    _queueSelectionChange() {
        if (this._selectionFrame) return

        this._selectionFrame = requestAnimationFrame(() => {
            this._selectionFrame = 0
            this._emitSelectionChangeIfNeeded()
        })
    }

    _emitSelectionChangeIfNeeded() {
        const nextSelection = this.getSelectionRange()
        const previousSelection = this._selectionState

        if (
            previousSelection &&
            previousSelection.start === nextSelection.start &&
            previousSelection.end === nextSelection.end &&
            previousSelection.direction === nextSelection.direction
        ) {
            return
        }

        this._selectionState = nextSelection
        this.dispatchEvent(new CustomEvent('selectionchange', {
            bubbles: true,
            composed: true,
            detail: {
                start: nextSelection.start,
                end: nextSelection.end,
                direction: nextSelection.direction,
                value: this.value,
            },
        }))
    }

    _dispatchInputEvent(detail) {
        this.dispatchEvent(new CustomEvent('input', {
            bubbles: true,
            composed: true,
            detail: {
                value: detail.value,
                previousValue: detail.previousValue,
                edit: detail.edit,
                source: detail.source,
            },
        }))
    }

    _selectionAfterEdit(selection, start, end, text, mode) {
        const insertedEnd = start + text.length
        const delta = text.length - (end - start)

        if (mode === 'inserted') {
            return { start, end: insertedEnd, direction: 'forward' }
        }

        if (mode === 'end') {
            return { start: insertedEnd, end: insertedEnd, direction: 'none' }
        }

        const adjust = (position, bias) => {
            if (position <= start) return position
            if (position >= end) return position + delta
            return bias === 'start' ? start : insertedEnd
        }

        const nextStart = adjust(selection.start, 'start')
        const nextEnd = adjust(selection.end, 'end')

        return {
            start: nextStart,
            end: nextEnd,
            direction: nextStart === nextEnd ? 'none' : selection.direction || 'forward',
        }
    }

    _normalizeRemoteSelection(selection) {
        if (!selection || selection.id == null) return null

        const length = this.value.length
        const rawStart = Number.isFinite(selection.start) ? Math.floor(selection.start) : 0
        const rawEnd = Number.isFinite(selection.end) ? Math.floor(selection.end) : rawStart
        const start = clamp(Math.min(rawStart, rawEnd), 0, length)
        const end = clamp(Math.max(rawStart, rawEnd), 0, length)

        return {
            id: String(selection.id),
            label: selection.label ? String(selection.label) : '',
            color: selection.color ? String(selection.color) : '#5a7fdd',
            start,
            end,
            updatedAt: selection.updatedAt ?? null,
        }
    }

    _flashClassForLine(lineNumber) {
        const flash = this._flashMarks.find((mark) => lineNumber >= mark.startLine && lineNumber <= mark.endLine)
        return flash ? `flash-${flash.tone}` : ''
    }

    _renderLineHtml(line, lineStart) {
        const tokens = this._tokenizeLine(line)
        const lineLength = line.length
        const lineEnd = lineStart + lineLength

        const localSelections = this._remoteSelections
            .filter((selection) => selection.end > selection.start && selection.start < lineEnd && selection.end > lineStart)
            .map((selection) => ({
                ...selection,
                localStart: Math.max(0, selection.start - lineStart),
                localEnd: Math.min(lineLength, selection.end - lineStart),
                palette: computeRemotePalette(selection.color),
            }))

        const localCursors = this._remoteSelections
            .filter((selection) => selection.start === selection.end && selection.start >= lineStart && selection.start <= lineEnd)
            .map((selection) => ({
                ...selection,
                localOffset: clamp(selection.start - lineStart, 0, lineLength),
                palette: computeRemotePalette(selection.color),
            }))

        const boundaries = new Set([0, lineLength])
        for (const selection of localSelections) {
            boundaries.add(selection.localStart)
            boundaries.add(selection.localEnd)
        }
        for (const cursor of localCursors) {
            boundaries.add(cursor.localOffset)
        }

        const offsets = [...boundaries].sort((a, b) => a - b)
        const tokenParts = splitTokensAtOffsets(tokens, offsets)
        const cursorsByOffset = new Map()
        const renderedCursorOffsets = new Set()

        for (const cursor of localCursors) {
            const list = cursorsByOffset.get(cursor.localOffset) || []
            list.push(cursor)
            cursorsByOffset.set(cursor.localOffset, list)
        }

        const emitCursorsAt = (offset) => {
            if (renderedCursorOffsets.has(offset)) return ''
            renderedCursorOffsets.add(offset)
            const cursors = cursorsByOffset.get(offset) || []
            return cursors.map((cursor) => this._renderCursorHtml(cursor)).join('')
        }

        if (!tokenParts.length) {
            return emitCursorsAt(0)
        }

        let html = ''
        for (const part of tokenParts) {
            html += emitCursorsAt(part.start)

            if (!part.text.length) continue

            let partHtml = part.type === 'text'
                ? escapeHtml(part.text)
                : `<span class="hl-${escapeHtml(part.type)}">${escapeHtml(part.text)}</span>`

            const overlappingSelections = localSelections.filter((selection) => selection.localStart < part.end && selection.localEnd > part.start)
            for (const selection of overlappingSelections.reverse()) {
                partHtml = this._wrapRemoteSelectionHtml(partHtml, selection)
            }

            html += partHtml
        }

        html += emitCursorsAt(lineLength)
        return html
    }

    _tokenizeLine(line) {
        const tokens = this._tokenizer(line)
        if (!Array.isArray(tokens)) {
            return [{ type: 'text', text: line }]
        }

        const normalized = tokens.map((token) => ({
            type: token?.type || 'text',
            text: token?.text ?? '',
        }))

        const combinedText = normalized.map((token) => token.text).join('')
        if (combinedText !== line) {
            return [{ type: 'text', text: line }]
        }

        return normalized
    }

    _wrapRemoteSelectionHtml(content, selection) {
        const style = [
            `--remote-selection-fill:${selection.palette.selectionFill}`,
            `--remote-selection-border:${selection.palette.selectionBorder}`,
        ].join(';')

        return `<span class="code-editor-remote-selection" data-remote-id="${escapeHtml(selection.id)}" data-remote-label="${escapeHtml(selection.label)}" style="${style}">${content}</span>`
    }

    _renderCursorHtml(cursor) {
        const style = [
            `--remote-cursor-color:${cursor.palette.cursorColor}`,
            `--remote-cursor-label-bg:${cursor.palette.labelBackground}`,
            `--remote-cursor-label-color:${cursor.palette.labelText}`,
        ].join(';')

        return `<span class="code-editor-remote-cursor" data-remote-id="${escapeHtml(cursor.id)}" data-remote-label="${escapeHtml(cursor.label)}" style="${style}"></span>`
    }
}

customElements.define('code-editor', CodeEditor)

export { CodeEditor }
