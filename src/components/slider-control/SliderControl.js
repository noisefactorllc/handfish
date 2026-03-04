/**
 * Slider Control Component
 * Styled range input with label and value display
 * @module components/slider-control/SliderControl
 */

// Inject styles once
const STYLES_ID = 'hf-slider-control-styles'
if (!document.getElementById(STYLES_ID)) {
    const style = document.createElement('style')
    style.id = STYLES_ID
    style.textContent = `
        slider-control {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: var(--hf-size-base, 0.875rem);
        }

        slider-control[disabled] {
            opacity: 0.5;
            pointer-events: none;
        }

        slider-control .slider-label {
            min-width: 2em;
            color: var(--hf-text-dim);
            font-size: var(--hf-size-sm, 0.75rem);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            flex-shrink: 0;
        }

        slider-control .slider-input {
            flex: 1;
            -webkit-appearance: none;
            appearance: none;
            height: 6px;
            background: var(--hf-bg-elevated);
            border-radius: var(--hf-radius-sm, 0.25rem);
            outline: none;
            cursor: pointer;
        }

        slider-control .slider-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            background: var(--hf-accent);
            border-radius: 50%;
            cursor: pointer;
            transition: transform 0.1s ease, background-color 0.1s ease;
        }

        slider-control .slider-input::-moz-range-thumb {
            width: 14px;
            height: 14px;
            background: var(--hf-accent);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            transition: transform 0.1s ease, background-color 0.1s ease;
        }

        slider-control .slider-input::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            background: var(--hf-accent-hover);
        }

        slider-control .slider-input::-moz-range-thumb:hover {
            transform: scale(1.2);
            background: var(--hf-accent-hover);
        }

        slider-control .slider-input:focus::-webkit-slider-thumb {
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--hf-accent) 30%, transparent);
        }

        slider-control .slider-input:focus::-moz-range-thumb {
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--hf-accent) 30%, transparent);
        }

        slider-control .slider-value {
            min-width: 3.5em;
            text-align: right;
            color: var(--hf-text-normal);
            font-family: var(--hf-font-family-mono, monospace);
            font-size: var(--hf-size-sm, 0.75rem);
            flex-shrink: 0;
        }

        /* Compact variant */
        slider-control.compact {
            gap: 4px;
        }

        slider-control.compact .slider-label {
            min-width: 1.5em;
        }

        slider-control.compact .slider-value {
            min-width: 2.5em;
        }

        /* Vertical variant */
        slider-control.vertical {
            flex-direction: column;
            align-items: stretch;
            height: 120px;
        }

        slider-control.vertical .slider-input {
            writing-mode: vertical-lr;
            direction: rtl;
            height: 100%;
            width: 6px;
        }
    `
    document.head.appendChild(style)
}

/**
 * <slider-control> custom element
 *
 * Attributes:
 * - min: minimum value (default: 0)
 * - max: maximum value (default: 1)
 * - step: step increment (default: 0.01)
 * - value: current value (default: 0.5)
 * - label: optional label text
 * - precision: decimal places to display (default: 2)
 * - disabled: if present, slider is disabled
 * - compact: if present, uses compact styling
 * - vertical: if present, renders vertically
 *
 * Events:
 * - input: fires during dragging
 * - change: fires when interaction ends
 */
class SliderControl extends HTMLElement {
    constructor() {
        super()
        this._value = 0.5
        this._rendered = false
    }

    static get observedAttributes() {
        return ['min', 'max', 'step', 'value', 'label', 'precision', 'disabled', 'compact', 'vertical']
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
            case 'value':
                this._setValue(parseFloat(newValue))
                break
            case 'min':
            case 'max':
            case 'step':
                this._updateSliderAttributes()
                break
            case 'label':
                this._updateLabel()
                break
            case 'precision':
                this._updateValueDisplay()
                break
            case 'disabled':
                this._updateDisabledState()
                break
            case 'compact':
            case 'vertical':
                this._updateVariant()
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
        this._setValue(parseFloat(val))
    }

    get min() {
        return parseFloat(this.getAttribute('min') ?? '0')
    }

    set min(val) {
        this.setAttribute('min', String(val))
    }

    get max() {
        return parseFloat(this.getAttribute('max') ?? '1')
    }

    set max(val) {
        this.setAttribute('max', String(val))
    }

    get step() {
        return parseFloat(this.getAttribute('step') ?? '0.01')
    }

    set step(val) {
        this.setAttribute('step', String(val))
    }

    get precision() {
        return parseInt(this.getAttribute('precision') ?? '2', 10)
    }

    set precision(val) {
        this.setAttribute('precision', String(val))
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
        const label = this.getAttribute('label') || ''
        const min = this.min
        const max = this.max
        const step = this.step
        const value = parseFloat(this.getAttribute('value') ?? '0.5')

        this.innerHTML = `
            ${label ? `<span class="slider-label">${label}</span>` : ''}
            <input
                type="range"
                class="slider-input"
                min="${min}"
                max="${max}"
                step="${step}"
                value="${value}"
            >
            <span class="slider-value">${this._formatValue(value)}</span>
        `

        this._value = value

        // Set up event listeners
        const input = this.querySelector('.slider-input')
        input.addEventListener('input', () => {
            this._value = parseFloat(input.value)
            this._updateValueDisplay()
            this.dispatchEvent(new CustomEvent('input', {
                bubbles: true,
                detail: { value: this._value }
            }))
        })

        input.addEventListener('change', () => {
            this.dispatchEvent(new CustomEvent('change', {
                bubbles: true,
                detail: { value: this._value }
            }))
        })

        this._updateVariant()
        this._updateDisabledState()
    }

    _updateFromAttributes() {
        this._updateSliderAttributes()
        this._updateLabel()
        const val = parseFloat(this.getAttribute('value') ?? '0.5')
        this._setValue(val)
    }

    _setValue(val) {
        if (isNaN(val)) return
        val = Math.max(this.min, Math.min(this.max, val))
        this._value = val

        const input = this.querySelector('.slider-input')
        if (input && parseFloat(input.value) !== val) {
            input.value = String(val)
        }
        this._updateValueDisplay()
    }

    _updateSliderAttributes() {
        const input = this.querySelector('.slider-input')
        if (input) {
            input.min = String(this.min)
            input.max = String(this.max)
            input.step = String(this.step)
        }
    }

    _updateLabel() {
        const label = this.getAttribute('label') || ''
        let labelEl = this.querySelector('.slider-label')

        if (label) {
            if (!labelEl) {
                labelEl = document.createElement('span')
                labelEl.className = 'slider-label'
                this.insertBefore(labelEl, this.firstChild)
            }
            labelEl.textContent = label
        } else if (labelEl) {
            labelEl.remove()
        }
    }

    _updateValueDisplay() {
        const valueEl = this.querySelector('.slider-value')
        if (valueEl) {
            valueEl.textContent = this._formatValue(this._value)
        }
    }

    _updateDisabledState() {
        const input = this.querySelector('.slider-input')
        if (input) {
            input.disabled = this.disabled
        }
    }

    _updateVariant() {
        this.classList.toggle('compact', this.hasAttribute('compact'))
        this.classList.toggle('vertical', this.hasAttribute('vertical'))
    }

    _formatValue(val) {
        const precision = this.precision
        return val.toFixed(precision)
    }
}

customElements.define('slider-control', SliderControl)

export { SliderControl }
