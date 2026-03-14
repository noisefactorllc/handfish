/**
 * Color Picker Dropdown Component
 *
 * A compact color picker that shows a swatch button which opens a modal dialog
 * containing the full ColorWheel component. Uses <dialog> element for proper
 * z-index stacking.
 *
 * @module components/color-picker/ColorPicker
 */

import {
    parseHex, rgbToHex, rgbToHsv, rgbToOklab, rgbToOklch
} from '../../utils/colorConversions.js'

// Import ColorWheel (self-registers)
import '../color-wheel/ColorWheel.js'

// ============================================================================
// Inject styles once into document head
// ============================================================================
const COLOR_PICKER_STYLES_ID = 'hf-color-picker-styles'
if (!document.getElementById(COLOR_PICKER_STYLES_ID)) {
    const styleEl = document.createElement('style')
    styleEl.id = COLOR_PICKER_STYLES_ID
    styleEl.textContent = `
        color-picker {
            all: unset;
            display: block;
            font-family: inherit;
        }

        color-picker[disabled] {
            opacity: 0.5;
            pointer-events: none;
        }

        color-picker .swatch-button {
            all: unset;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: var(--hf-control-padding, 0.25rem 0.5rem);
            cursor: pointer;
            width: 100%;
            height: var(--hf-control-height, 1.875rem);
            box-sizing: border-box;
            font-size: var(--hf-size-sm, 0.75rem);
            color: var(--hf-text-normal, #d9deeb);
            background: var(--hf-bg-elevated, #1b2538);
            border-radius: var(--hf-radius-sm, 0.25rem);
            border: var(--hf-border-width) solid var(--hf-border-subtle);
        }

        color-picker .swatch-button:focus-visible {
            outline: var(--hf-focus-ring-width) solid var(--hf-focus-ring-color);
            outline-offset: var(--hf-focus-ring-offset);
        }

        color-picker .swatch {
            width: 18px;
            height: 18px;
            flex-shrink: 0;
        }

        color-picker .hex-display {
            font-size: 0.62rem;
            color: var(--hf-text-normal, #d9deeb);
            font-family: var(--hf-font-family-mono);
        }

        color-picker .dropdown-arrow {
            font-size: 0.6rem;
            color: var(--hf-text-dim, #98a7c8);
            flex-shrink: 0;
            margin-left: auto;
            transition: transform 0.15s ease;
        }

        color-picker.dialog-open .dropdown-arrow {
            transform: rotate(180deg);
        }

        /* Dialog styles */
        color-picker .color-dialog {
            background: color-mix(
                in srgb,
                var(--hf-bg-surface, #1a1e2e) var(--hf-surface-opacity, 85%),
                transparent var(--hf-surface-transparency, 15%)
            );
            backdrop-filter: var(--hf-glass-blur, blur(12px));
            border: none;
            border-radius: var(--hf-radius, 8px);
            padding: 0;
            color: var(--hf-text-normal, #d9deeb);
            box-shadow: var(--hf-shadow-xl, 0 16px 32px rgba(0, 0, 0, 0.3));
            overflow: hidden;
        }

        color-picker .color-dialog::backdrop {
            background: var(--hf-backdrop, rgba(0, 0, 0, 0.6));
            backdrop-filter: var(--hf-glass-blur-sm, blur(4px));
        }

        color-picker .dialog-titlebar {
            background-color: var(--hf-titlebar-bg, var(--hf-bg-elevated, #262e3f));
            border-bottom: none;
            padding: 0 0.5em;
            min-height: 1.75rem;
            height: 1.75rem;
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--hf-text-normal, #d9deeb);
            text-transform: lowercase;
            letter-spacing: 0.05em;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 0.5em;
            border-radius: var(--hf-radius, 8px) var(--hf-radius, 8px) 0 0;
        }

        color-picker .dialog-title {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        color-picker .dialog-close {
            background: transparent;
            border: none;
            color: var(--hf-text-dim, #98a7c8);
            cursor: pointer;
            font-size: 0.875rem;
            padding: 0.25em 0.5em;
            line-height: 1;
            opacity: 0.7;
            transition: opacity 0.15s ease;
            margin-left: auto;
        }

        color-picker .dialog-close:hover {
            opacity: 1;
            color: var(--hf-text-normal, #d9deeb);
        }

        color-picker .dialog-body {
            padding: 0;
        }

        color-picker color-wheel {
            display: block;
        }
    `
    document.head.appendChild(styleEl)
}

// ============================================================================
// Color Picker Dropdown Component
// ============================================================================

class ColorPicker extends HTMLElement {
    static formAssociated = true

    static get observedAttributes() {
        return ['value', 'disabled', 'name', 'color-mode']
    }

    constructor() {
        super()

        // Form association
        if (this.constructor.formAssociated) {
            this._internals = this.attachInternals?.()
        }

        this._value = '#000000'
        this._colorMode = 'rgb'
        this._isOpen = false

        /** @type {boolean} */
        this._rendered = false

        /** @type {boolean} */
        this._listenersAttached = false
    }

    connectedCallback() {
        if (!this._rendered) {
            this._render()
            this._rendered = true
        }
        if (!this._listenersAttached) {
            this._setupEventListeners()
            this._listenersAttached = true
        }
        this._updateSwatch()
        this._updateFormValue()
    }

    disconnectedCallback() {
        this._closeDialog()
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return

        switch (name) {
            case 'value':
                this._setValueFromAttribute(newValue)
                break
            case 'disabled':
                this._updateDisabledState()
                break
            case 'color-mode':
                this._colorMode = newValue || 'rgb'
                this._updateSwatch()
                break
        }
    }

    // ========================================================================
    // Public API
    // ========================================================================

    get value() {
        return this._value
    }

    set value(val) {
        let rgb
        if (typeof val === 'string') {
            rgb = parseHex(val)
        } else if (Array.isArray(val) && val.length >= 3) {
            rgb = { r: val[0] * 255, g: val[1] * 255, b: val[2] * 255 }
        }

        if (rgb) {
            this._value = rgbToHex(rgb)
            this._updateSwatch()
            this._updateFormValue()
            // Update color wheel if open
            const colorWheel = this.querySelector('color-wheel')
            if (colorWheel) {
                colorWheel.value = this._value
            }
        }
    }

    get disabled() {
        return this.hasAttribute('disabled')
    }

    set disabled(val) {
        if (val) {
            this.setAttribute('disabled', '')
        } else {
            this.removeAttribute('disabled')
        }
    }

    get name() {
        return this.getAttribute('name')
    }

    set name(val) {
        if (val) {
            this.setAttribute('name', val)
        } else {
            this.removeAttribute('name')
        }
    }

    get colorMode() {
        return this._colorMode
    }

    set colorMode(val) {
        const mode = val || 'rgb'
        if (mode === this._colorMode) return
        this._colorMode = mode
        this.setAttribute('color-mode', mode)
        this._updateSwatch()
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    _render() {
        this.innerHTML = `
            <button class="swatch-button" type="button" aria-haspopup="dialog" aria-expanded="false">
                <span class="swatch"></span>
                <span class="hex-display"></span>
                <span class="dropdown-arrow">▼</span>
            </button>
            <dialog class="color-dialog" aria-label="Color picker">
                <div class="dialog-titlebar">
                    <span class="dialog-title">color</span>
                    <button class="dialog-close" type="button" aria-label="close">✕</button>
                </div>
                <div class="dialog-body">
                    <color-wheel mode="hsv"></color-wheel>
                </div>
            </dialog>
        `
    }

    _setupEventListeners() {
        const button = this.querySelector('.swatch-button')
        const dialog = this.querySelector('.color-dialog')
        const closeBtn = this.querySelector('.dialog-close')
        const colorWheel = this.querySelector('color-wheel')

        // Toggle dialog on button click
        button.addEventListener('click', (e) => {
            e.stopPropagation()
            if (this.disabled) return
            this._toggleDialog()
        })

        // Handle keyboard on button
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                this._toggleDialog()
            }
        })

        // Close button
        closeBtn.addEventListener('click', () => {
            this._closeDialog()
        })

        // Click on backdrop closes
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                this._closeDialog()
            }
        })

        // ESC triggers 'cancel' event; normalize to close
        dialog.addEventListener('cancel', (e) => {
            e.preventDefault()
            this._closeDialog()
        })

        dialog.addEventListener('close', () => {
            this._onDialogClosed()
        })

        // Color wheel events
        colorWheel.addEventListener('input', () => {
            this._value = colorWheel.value
            this._updateSwatch()
            this._updateFormValue()
            this._emitInput()
        })

        colorWheel.addEventListener('change', () => {
            this._value = colorWheel.value
            this._updateSwatch()
            this._updateFormValue()
            this._emitChange()
        })
    }

    _toggleDialog() {
        if (this._isOpen) {
            this._closeDialog()
        } else {
            this._openDialog()
        }
    }

    _openDialog() {
        const dialog = this.querySelector('.color-dialog')
        const button = this.querySelector('.swatch-button')
        const colorWheel = this.querySelector('color-wheel')

        // Sync color wheel value and mode
        colorWheel.value = this._value
        colorWheel.mode = this._colorMode === 'rgb' ? 'hsv' : this._colorMode

        // Show modal dialog
        dialog.showModal()
        button.setAttribute('aria-expanded', 'true')
        this.classList.add('dialog-open')
        this._isOpen = true
    }

    _closeDialog() {
        const dialog = this.querySelector('.color-dialog')
        if (dialog?.open) {
            dialog.close()
        } else {
            this._onDialogClosed()
        }
    }

    _onDialogClosed() {
        const button = this.querySelector('.swatch-button')
        if (button) button.setAttribute('aria-expanded', 'false')
        this.classList.remove('dialog-open')
        this._isOpen = false
    }

    _updateSwatch() {
        const swatch = this.querySelector('.swatch')
        const hexDisplay = this.querySelector('.hex-display')

        if (swatch) {
            swatch.style.backgroundColor = this._value
        }
        if (hexDisplay) {
            hexDisplay.textContent = this._formatDisplay()
        }
    }

    _formatDisplay() {
        if (this._colorMode === 'rgb') return this._value

        const rgb = parseHex(this._value)
        if (!rgb) return this._value

        if (this._colorMode === 'hsv') {
            const { h, s, v } = rgbToHsv(rgb)
            return `${Math.round(h)}° ${Math.round(s)}% ${Math.round(v)}%`
        }
        if (this._colorMode === 'oklab') {
            const { l, a, b } = rgbToOklab(rgb)
            return `${l.toFixed(2)} ${a.toFixed(2)} ${b.toFixed(2)}`
        }
        if (this._colorMode === 'oklch') {
            const { l, c, h } = rgbToOklch(rgb)
            return `${l.toFixed(2)} ${c.toFixed(2)} ${Math.round(h)}°`
        }
        return this._value
    }

    _updateDisabledState() {
        const button = this.querySelector('.swatch-button')
        if (button) {
            button.disabled = this.disabled
        }
        if (this.disabled) {
            this._closeDialog()
        }
    }

    _setValueFromAttribute(hex) {
        const rgb = parseHex(hex)
        if (rgb) {
            this._value = rgbToHex(rgb)
            this._updateSwatch()
            this._updateFormValue()
        }
    }

    _updateFormValue() {
        if (this._internals) {
            this._internals.setFormValue(this._value)
        }
    }

    _emitInput() {
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    }

    _emitChange() {
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
}

// Register the custom element
customElements.define('color-picker', ColorPicker)

export { ColorPicker }
