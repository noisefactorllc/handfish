/**
 * Color Swatch Component
 * Single color display with selection and edit capabilities
 * @module components/color-swatch/ColorSwatch
 */

import { rgbToHex, parseHex } from '../../utils/colorConversions.js'

// Inject styles once
const STYLES_ID = 'hf-color-swatch-styles'
if (!document.getElementById(STYLES_ID)) {
    const style = document.createElement('style')
    style.id = STYLES_ID
    style.textContent = `
        color-swatch {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: var(--hf-radius-sm, 6px);
            cursor: pointer;
            position: relative;
            overflow: hidden;
            transition: transform 0.1s ease, box-shadow 0.15s ease;
        }

        color-swatch[disabled] {
            cursor: not-allowed;
            opacity: 0.5;
        }

        /* Checkerboard background for transparency */
        color-swatch::before {
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

        color-swatch .swatch-color {
            position: absolute;
            inset: 0;
            transition: background-color 0.1s ease;
        }

        color-swatch:not([disabled]):hover {
            transform: scale(1.1);
        }

        color-swatch[selected] {
            box-shadow:
                0 0 0 2px var(--hf-bg-base),
                0 0 0 4px var(--hf-accent);
        }

        /* Hex tooltip */
        color-swatch .swatch-tooltip {
            position: absolute;
            bottom: calc(100% + 6px);
            left: 50%;
            transform: translateX(-50%);
            padding: 4px 8px;
            background: var(--hf-bg-base);
            border: 1px solid var(--hf-bg-elevated);
            border-radius: 4px;
            color: var(--hf-text-normal);
            font-family: var(--hf-font-family-mono, monospace);
            font-size: var(--hf-size-xs, 0.625rem);
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s ease;
            z-index: 10;
        }

        color-swatch .swatch-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 4px solid transparent;
            border-top-color: var(--hf-bg-elevated);
        }

        color-swatch:hover .swatch-tooltip {
            opacity: 1;
        }

        /* Size variants */
        color-swatch.small {
            width: 24px;
            height: 24px;
        }

        color-swatch.large {
            width: 48px;
            height: 48px;
        }

        /* Editable indicator */
        color-swatch[editable]::after {
            content: '';
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 8px;
            height: 8px;
            background: var(--hf-bg-base);
            border-radius: 50%;
            border: 1px solid var(--hf-border-subtle);
            opacity: 0;
            transition: opacity 0.15s ease;
        }

        color-swatch[editable]:hover::after {
            opacity: 0.8;
        }
    `
    document.head.appendChild(style)
}

/**
 * <color-swatch> custom element
 *
 * Attributes:
 * - color: hex color string (e.g., "#ff0000") or RGB array as JSON (0-1 range)
 * - selected: if present, shows selection ring
 * - editable: if present, shows edit indicator on hover
 * - disabled: if present, disables interaction
 * - size: 'small' | 'medium' | 'large' (default: 'medium')
 * - show-tooltip: if present, shows hex on hover
 *
 * Events:
 * - select: fires when swatch is clicked
 * - edit: fires when swatch is double-clicked (if editable)
 */
class ColorSwatch extends HTMLElement {
    constructor() {
        super()
        this._color = '#000000'
        this._rgb = [0, 0, 0]
        this._rendered = false
    }

    static get observedAttributes() {
        return ['color', 'selected', 'disabled', 'editable', 'size', 'show-tooltip']
    }

    connectedCallback() {
        if (!this._rendered) {
            this._render()
            this._rendered = true
        }
        this._updateFromAttributes()
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue || !this._rendered) return

        switch (name) {
            case 'color':
                this._parseAndSetColor(newValue)
                break
            case 'selected':
            case 'disabled':
            case 'editable':
                // Handled by CSS via attribute selectors
                break
            case 'size':
                this._updateSize()
                break
            case 'show-tooltip':
                this._updateTooltip()
                break
        }
    }

    // ========================================================================
    // Public API
    // ========================================================================

    /**
     * Get the current color as hex string
     */
    get color() {
        return this._color
    }

    /**
     * Set color from hex string or RGB array (0-1 range)
     */
    set color(val) {
        if (typeof val === 'string') {
            this._parseAndSetColor(val)
        } else if (Array.isArray(val)) {
            this._setColorFromRgb(val)
        }
    }

    /**
     * Get the current color as RGB array [0-1]
     */
    get rgb() {
        return [...this._rgb]
    }

    /**
     * Set color from RGB array [0-1]
     */
    set rgb(val) {
        this._setColorFromRgb(val)
    }

    get selected() {
        return this.hasAttribute('selected')
    }

    set selected(val) {
        if (val) {
            this.setAttribute('selected', '')
        } else {
            this.removeAttribute('selected')
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

    // ========================================================================
    // Private Methods
    // ========================================================================

    _render() {
        this.innerHTML = `
            <div class="swatch-color"></div>
            <span class="swatch-tooltip"></span>
        `

        // Event listeners
        this.addEventListener('click', (e) => {
            if (this.disabled) return
            e.stopPropagation()
            this.dispatchEvent(new CustomEvent('select', {
                bubbles: true,
                detail: { color: this._color, rgb: this._rgb }
            }))
        })

        this.addEventListener('dblclick', (e) => {
            if (this.disabled || !this.hasAttribute('editable')) return
            e.stopPropagation()
            this.dispatchEvent(new CustomEvent('edit', {
                bubbles: true,
                detail: { color: this._color, rgb: this._rgb }
            }))
        })

        // Keyboard support
        this.setAttribute('tabindex', '0')
        this.setAttribute('role', 'button')

        this.addEventListener('keydown', (e) => {
            if (this.disabled) return
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                this.dispatchEvent(new CustomEvent('select', {
                    bubbles: true,
                    detail: { color: this._color, rgb: this._rgb }
                }))
            }
        })
    }

    _updateFromAttributes() {
        const colorAttr = this.getAttribute('color')
        if (colorAttr) {
            this._parseAndSetColor(colorAttr)
        }
        this._updateSize()
        this._updateTooltip()
    }

    _parseAndSetColor(value) {
        if (!value) return

        // Try parsing as JSON (RGB array, 0-1 range)
        if (value.startsWith('[')) {
            try {
                const arr = JSON.parse(value)
                this._setColorFromRgb(arr)
                return
            } catch (_e) {
                // Fall through to hex parsing
            }
        }

        // Parse as hex using handfish's parseHex (returns {r,g,b} 0-255)
        const rgb = parseHex(value)
        if (rgb) {
            this._color = value.startsWith('#') ? value : `#${value}`
            this._rgb = [rgb.r / 255, rgb.g / 255, rgb.b / 255]
            this._updateDisplay()
        }
    }

    _setColorFromRgb(arr) {
        if (!Array.isArray(arr) || arr.length < 3) return

        this._rgb = [arr[0], arr[1], arr[2]]
        // rgbToHex expects {r,g,b} 0-255
        this._color = rgbToHex({
            r: Math.round(arr[0] * 255),
            g: Math.round(arr[1] * 255),
            b: Math.round(arr[2] * 255)
        })
        this._updateDisplay()
    }

    _updateDisplay() {
        const colorEl = this.querySelector('.swatch-color')
        if (colorEl) {
            colorEl.style.backgroundColor = this._color
        }

        const tooltipEl = this.querySelector('.swatch-tooltip')
        if (tooltipEl) {
            tooltipEl.textContent = this._color.toUpperCase()
        }

        this.setAttribute('aria-label', `Color ${this._color}`)
    }

    _updateSize() {
        const size = this.getAttribute('size') || 'medium'
        this.classList.remove('small', 'medium', 'large')
        if (size !== 'medium') {
            this.classList.add(size)
        }
    }

    _updateTooltip() {
        const tooltipEl = this.querySelector('.swatch-tooltip')
        if (tooltipEl) {
            tooltipEl.style.display = this.hasAttribute('show-tooltip') ? '' : 'none'
        }
    }
}

customElements.define('color-swatch', ColorSwatch)

export { ColorSwatch }
