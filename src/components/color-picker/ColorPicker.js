/**
 * Color Picker Web Component
 *
 * A dropdown color picker that wraps the ColorWheel component.
 * Provides a compact swatch trigger that opens a dialog with the full color wheel.
 *
 * @module components/color-picker/ColorPicker
 */

import { parseHex, rgbToHex } from '../../utils/colorConversions.js'
import '../color-wheel/ColorWheel.js'

// ============================================================================
// Light DOM Style Injection
// ============================================================================

const COLOR_PICKER_STYLES_ID = 'hf-color-picker-styles'

if (!document.getElementById(COLOR_PICKER_STYLES_ID)) {
    const styleEl = document.createElement('style')
    styleEl.id = COLOR_PICKER_STYLES_ID
    styleEl.textContent = `
        color-picker {
            display: inline-block;
            position: relative;
            font-family: var(--hf-font-family, Nunito, system-ui, sans-serif);
            --cp-swatch-size: 32px;
            --cp-border: color-mix(in srgb, var(--hf-accent-3, #a5b8ff) 25%, transparent 75%);
            --cp-bg: var(--hf-color-2, #101522);
            --cp-radius: var(--hf-radius-sm, 4px);
            --cp-accent: var(--hf-accent-3, #a5b8ff);
        }

        color-picker[disabled] {
            opacity: 0.5;
            pointer-events: none;
        }

        color-picker .color-picker-trigger {
            width: var(--cp-swatch-size);
            height: var(--cp-swatch-size);
            border: 1px solid var(--cp-border);
            border-radius: var(--cp-radius);
            cursor: pointer;
            position: relative;
            overflow: hidden;
            padding: 0;
            background: none;
        }

        color-picker .color-picker-trigger:hover {
            border-color: var(--cp-accent);
        }

        color-picker .color-picker-trigger:focus {
            outline: 2px solid var(--cp-accent);
            outline-offset: 2px;
        }

        color-picker .color-picker-trigger::before {
            content: '';
            position: absolute;
            inset: 0;
            background: 
                linear-gradient(45deg, #888 25%, transparent 25%),
                linear-gradient(-45deg, #888 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #888 75%),
                linear-gradient(-45deg, transparent 75%, #888 75%);
            background-size: 8px 8px;
            background-position: 0 0, 0 4px, 4px -4px, -4px 0;
            opacity: 0.3;
        }

        color-picker .swatch-color {
            position: absolute;
            inset: 0;
        }

        /* Dialog styling */
        color-picker dialog {
            border: none;
            padding: 0;
            background: transparent;
            overflow: visible;
        }

        color-picker dialog::backdrop {
            background: rgba(0, 0, 0, 0.5);
        }

        color-picker dialog[open] {
            display: block;
        }

        /* Position dialog near trigger when using show() */
        color-picker dialog.positioned {
            position: absolute;
            margin: 0;
            top: calc(var(--cp-swatch-size) + 4px);
            left: 0;
        }

        color-picker dialog.positioned-above {
            top: auto;
            bottom: calc(var(--cp-swatch-size) + 4px);
        }

        color-picker dialog.positioned-left {
            left: auto;
            right: 0;
        }

        /* Color wheel within dialog */
        color-picker dialog color-wheel {
            display: block;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            border-radius: var(--hf-radius, 8px);
        }

        /* Hidden color input for form submission fallback */
        color-picker input[type="hidden"] {
            display: none;
        }

        /* Inline mode (no dialog, wheel always visible) */
        color-picker[inline] .color-picker-trigger {
            display: none;
        }

        color-picker[inline] dialog {
            display: block !important;
            position: static;
        }

        color-picker[inline] dialog color-wheel {
            box-shadow: none;
        }
    `
    document.head.appendChild(styleEl)
}

// ============================================================================
// Color Picker Component
// ============================================================================

class ColorPicker extends HTMLElement {
    static formAssociated = true

    static get observedAttributes() {
        return ['value', 'alpha', 'mode', 'disabled', 'required', 'name', 'inline']
    }

    constructor() {
        super()

        if (this.constructor.formAssociated) {
            this._internals = this.attachInternals?.()
        }

        this._value = '#000000'
        this._alpha = 1
        this._mode = 'hsv'
        this._isOpen = false
        this._rendered = false
        this._listenersAttached = false

        this._boundOnKeyDown = this._onKeyDown.bind(this)
        this._boundOnClickOutside = this._onClickOutside.bind(this)
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
        document.removeEventListener('keydown', this._boundOnKeyDown)
        document.removeEventListener('pointerdown', this._boundOnClickOutside)
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal) return

        switch (name) {
            case 'value':
                if (parseHex(newVal)) {
                    this._value = newVal
                    this._updateSwatch()
                    this._syncToColorWheel()
                }
                break
            case 'alpha':
                this._alpha = Math.max(0, Math.min(1, parseFloat(newVal) || 1))
                this._syncToColorWheel()
                break
            case 'mode':
                if (['rgb', 'hsv', 'oklch'].includes(newVal)) {
                    this._mode = newVal
                    this._syncToColorWheel()
                }
                break
            case 'disabled':
                this._updateDisabledState()
                break
            case 'inline':
                if (newVal !== null && this._isOpen) {
                    this._closeDialog()
                }
                break
        }
    }

    // Public API
    get value() {
        return this._value
    }

    set value(val) {
        if (parseHex(val)) {
            this._value = val
            this._updateSwatch()
            this._syncToColorWheel()
            this._updateFormValue()
        }
    }

    get alpha() {
        return this._alpha
    }

    set alpha(val) {
        this._alpha = Math.max(0, Math.min(1, val))
        this._syncToColorWheel()
    }

    get mode() {
        return this._mode
    }

    set mode(val) {
        if (['rgb', 'hsv', 'oklch'].includes(val)) {
            this._mode = val
            this._syncToColorWheel()
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
        return this.getAttribute('name') || ''
    }

    set name(val) {
        this.setAttribute('name', val)
    }

    get inline() {
        return this.hasAttribute('inline')
    }

    set inline(val) {
        if (val) {
            this.setAttribute('inline', '')
        } else {
            this.removeAttribute('inline')
        }
    }

    get isOpen() {
        return this._isOpen
    }

    open() {
        if (this.disabled || this.inline) return
        this._openDialog()
    }

    close() {
        this._closeDialog()
    }

    toggle() {
        if (this._isOpen) {
            this.close()
        } else {
            this.open()
        }
    }

    getColor() {
        const wheel = this.querySelector('color-wheel')
        if (wheel) {
            return wheel.getColor()
        }
        return {
            value: this._value,
            alpha: this._alpha,
            rgb: null,
            hsv: null,
            oklch: null
        }
    }

    setColor(opts) {
        if (opts.value && parseHex(opts.value)) {
            this._value = opts.value
        }
        if (typeof opts.alpha === 'number') {
            this._alpha = Math.max(0, Math.min(1, opts.alpha))
        }
        if (opts.mode && ['rgb', 'hsv', 'oklch'].includes(opts.mode)) {
            this._mode = opts.mode
        }
        this._updateSwatch()
        this._syncToColorWheel()
        this._updateFormValue()
    }

    // Private methods
    _updateFormValue() {
        if (this._internals) {
            this._internals.setFormValue(this._value)
        }
    }

    _render() {
        this.innerHTML = `
            <button type="button" class="color-picker-trigger" aria-label="Choose color" aria-haspopup="dialog">
                <div class="swatch-color"></div>
            </button>
            <dialog>
                <color-wheel></color-wheel>
            </dialog>
        `
    }

    _updateSwatch() {
        const swatch = this.querySelector('.swatch-color')
        if (swatch) {
            swatch.style.backgroundColor = this._value
            swatch.style.opacity = this._alpha
        }
    }

    _syncToColorWheel() {
        const wheel = this.querySelector('color-wheel')
        if (wheel) {
            wheel.setColor({
                value: this._value,
                alpha: this._alpha,
                mode: this._mode
            })
        }
    }

    _updateDisabledState() {
        const trigger = this.querySelector('.color-picker-trigger')
        if (trigger) {
            trigger.disabled = this.disabled
        }
        if (this.disabled && this._isOpen) {
            this._closeDialog()
        }
    }

    _setupEventListeners() {
        const trigger = this.querySelector('.color-picker-trigger')
        const dialog = this.querySelector('dialog')
        const wheel = this.querySelector('color-wheel')

        if (trigger) {
            trigger.addEventListener('click', () => this.toggle())
        }

        if (wheel) {
            wheel.addEventListener('colorinput', (e) => {
                this._value = e.detail.value
                this._alpha = e.detail.alpha
                this._updateSwatch()
                this._updateFormValue()
                this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
            })

            wheel.addEventListener('change', () => {
                this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
            })

            // Sync initial value
            this._syncToColorWheel()
        }

        // Handle Escape to close
        if (dialog) {
            dialog.addEventListener('cancel', (e) => {
                e.preventDefault()
                this._closeDialog()
            })
        }
    }

    _openDialog() {
        const dialog = this.querySelector('dialog')
        if (!dialog || this._isOpen) return

        this._isOpen = true

        // Position dialog relative to trigger
        const trigger = this.querySelector('.color-picker-trigger')
        const rect = trigger?.getBoundingClientRect()

        if (rect) {
            const viewportHeight = window.innerHeight
            const viewportWidth = window.innerWidth
            const dialogHeight = 400 // Approximate
            const dialogWidth = 220 // Approximate

            dialog.classList.add('positioned')
            dialog.classList.remove('positioned-above', 'positioned-left')

            // Check if dialog would go off bottom of screen
            if (rect.bottom + dialogHeight > viewportHeight && rect.top > dialogHeight) {
                dialog.classList.add('positioned-above')
            }

            // Check if dialog would go off right of screen
            if (rect.left + dialogWidth > viewportWidth && rect.right > dialogWidth) {
                dialog.classList.add('positioned-left')
            }
        }

        dialog.show()
        this._syncToColorWheel()

        // Focus the wheel
        const wheel = this.querySelector('color-wheel')
        const wheelCanvas = wheel?.querySelector('.wheel-canvas')
        if (wheelCanvas) {
            requestAnimationFrame(() => wheelCanvas.focus())
        }

        // Add global listeners
        document.addEventListener('keydown', this._boundOnKeyDown)
        document.addEventListener('pointerdown', this._boundOnClickOutside)

        this.dispatchEvent(new CustomEvent('open', { bubbles: true }))
    }

    _closeDialog() {
        const dialog = this.querySelector('dialog')
        if (!dialog || !this._isOpen) return

        this._isOpen = false
        dialog.close()
        dialog.classList.remove('positioned', 'positioned-above', 'positioned-left')

        // Remove global listeners
        document.removeEventListener('keydown', this._boundOnKeyDown)
        document.removeEventListener('pointerdown', this._boundOnClickOutside)

        // Focus trigger
        const trigger = this.querySelector('.color-picker-trigger')
        if (trigger) {
            trigger.focus()
        }

        this.dispatchEvent(new CustomEvent('close', { bubbles: true }))
    }

    _onKeyDown(e) {
        if (e.key === 'Escape' && this._isOpen) {
            e.preventDefault()
            this._closeDialog()
        }
    }

    _onClickOutside(e) {
        if (!this._isOpen) return

        const dialog = this.querySelector('dialog')
        const trigger = this.querySelector('.color-picker-trigger')

        if (dialog && !dialog.contains(e.target) && e.target !== trigger && !trigger?.contains(e.target)) {
            this._closeDialog()
        }
    }
}

// Register the custom element
customElements.define('color-picker', ColorPicker)

export { ColorPicker }
