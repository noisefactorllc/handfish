/**
 * Slider Value Web Component
 *
 * A composite control that pairs a range slider with a value display.
 * Uses `display: contents` to participate in parent grid layouts,
 * allowing the slider and value to occupy separate grid cells.
 *
 * @module components/slider-value/SliderValue
 */

// Inject styles once into document head
const SLIDER_VALUE_STYLES_ID = 'hf-slider-value-styles'
if (!document.getElementById(SLIDER_VALUE_STYLES_ID)) {
    const styleEl = document.createElement('style')
    styleEl.id = SLIDER_VALUE_STYLES_ID
    styleEl.textContent = `
        slider-value {
            display: contents;
        }

        slider-value[disabled] {
            opacity: 0.5;
            pointer-events: none;
        }

        slider-value .slider {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 0.5rem;
            background: color-mix(in srgb, var(--hf-accent, #5a7fdd) 15%, transparent 85%);
            border-radius: var(--hf-radius-sm, 0.25rem);
            outline: none;
            cursor: pointer;
            transition: background 0.15s ease;
        }

        slider-value .slider:focus-visible {
            outline: var(--hf-focus-ring-width) solid var(--hf-focus-ring-color);
            outline-offset: var(--hf-focus-ring-offset);
        }

        slider-value .slider:hover {
            background: color-mix(in srgb, var(--hf-accent, #5a7fdd) 22%, transparent 78%);
        }

        slider-value .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 0.875rem;
            height: 0.875rem;
            border-radius: 50%;
            background: var(--hf-accent, #5a7fdd);
            cursor: pointer;
            border: 2px solid color-mix(in srgb, var(--hf-accent, #5a7fdd) 100%, var(--hf-text-bright, #fff) 0%);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            transition: all 0.15s ease;
        }

        slider-value .slider:hover::-webkit-slider-thumb {
            background: color-mix(in srgb, var(--hf-accent, #5a7fdd) 85%, var(--hf-text-bright, #fff) 15%);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
        }

        slider-value .slider::-moz-range-thumb {
            width: 0.875rem;
            height: 0.875rem;
            border-radius: 50%;
            background: var(--hf-accent, #5a7fdd);
            cursor: pointer;
            border: 2px solid color-mix(in srgb, var(--hf-accent, #5a7fdd) 100%, var(--hf-text-bright, #fff) 0%);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            transition: all 0.15s ease;
        }

        slider-value .slider:hover::-moz-range-thumb {
            background: color-mix(in srgb, var(--hf-accent, #5a7fdd) 85%, var(--hf-text-bright, #fff) 15%);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
        }

        slider-value .value-display {
            font-size: var(--hf-size-sm, 0.75rem);
            font-family: var(--hf-font-family-mono);
            color: var(--hf-text-dim, #8fa8ff);
            text-align: right;
            min-width: 2.5em;
            user-select: none;
            cursor: text;
            outline: none;
            padding: 0.125rem 0.25rem;
            border-radius: var(--hf-radius-sm, 0.25rem);
            transition: background-color 0.15s ease;
            white-space: nowrap;
            overflow: hidden;
            line-height: 1;
        }

        slider-value .value-display:hover {
            background-color: color-mix(in srgb, var(--hf-accent, #5a7fdd) 10%, transparent 90%);
        }

        slider-value .value-display:focus {
            background-color: color-mix(in srgb, var(--hf-accent, #5a7fdd) 20%, transparent 80%);
            outline: var(--hf-focus-ring-width) solid var(--hf-focus-ring-color);
            outline-offset: var(--hf-focus-ring-offset);
        }
    `
    document.head.appendChild(styleEl)
}

/**
 * SliderValue - Web component combining slider and value display
 * @extends HTMLElement
 */
class SliderValue extends HTMLElement {
    static formAssociated = true

    static get observedAttributes() {
        return ['value', 'min', 'max', 'step', 'disabled', 'name', 'type', 'format']
    }

    constructor() {
        super()

        // Form association
        if (this.constructor.formAssociated) {
            this._internals = this.attachInternals?.()
        }

        /** @type {number} */
        this._value = 0

        /** @type {number} */
        this._min = 0

        /** @type {number} */
        this._max = 100

        /** @type {number} */
        this._step = 0.01

        /** @type {'int'|'float'} */
        this._type = 'float'

        /** @type {string|null} Display format ('percent' or null) */
        this._format = null

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
        this._updateSlider()
        this._updateValueDisplay()
        this._updateFormValue()
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return

        switch (name) {
            case 'value':
                this._value = parseFloat(newValue) || 0
                this._updateSlider()
                this._updateValueDisplay()
                this._updateFormValue()
                break
            case 'min':
                this._min = parseFloat(newValue) || 0
                this._updateSlider()
                break
            case 'max':
                this._max = parseFloat(newValue) || 100
                this._updateSlider()
                break
            case 'step':
                this._step = parseFloat(newValue) || 0.01
                this._updateSlider()
                break
            case 'type':
                this._type = newValue === 'int' ? 'int' : 'float'
                this._updateValueDisplay()
                break
            case 'format':
                this._format = newValue || null
                this._updateValueDisplay()
                break
            case 'disabled':
                this._updateDisabledState()
                break
        }
    }

    // ========================================================================
    // Public API
    // ========================================================================

    /** @returns {number} Current value */
    get value() {
        return this._value
    }

    /** @param {number} val - New value */
    set value(val) {
        const numVal = parseFloat(val) || 0
        if (this._value === numVal) return

        this._value = numVal
        this._updateSlider()
        this._updateValueDisplay()
        this._updateFormValue()
    }

    /** @returns {number} Minimum value */
    get min() {
        return this._min
    }

    /** @param {number} val */
    set min(val) {
        this._min = parseFloat(val) || 0
        this._updateSlider()
    }

    /** @returns {number} Maximum value */
    get max() {
        return this._max
    }

    /** @param {number} val */
    set max(val) {
        this._max = parseFloat(val) || 100
        this._updateSlider()
    }

    /** @returns {number} Step value */
    get step() {
        return this._step
    }

    /** @param {number} val */
    set step(val) {
        this._step = parseFloat(val) || 0.01
        this._updateSlider()
    }

    /** @returns {'int'|'float'} Value type */
    get type() {
        return this._type
    }

    /** @param {'int'|'float'} val */
    set type(val) {
        this._type = val === 'int' ? 'int' : 'float'
        this._updateValueDisplay()
    }

    /** @returns {string|null} Display format */
    get format() {
        return this._format
    }

    /** @param {string|null} val - Display format ('percent' or null) */
    set format(val) {
        this._format = val || null
        this._updateValueDisplay()
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

    // ========================================================================
    // Private Methods
    // ========================================================================

    _render() {
        this.innerHTML = `
            <input type="range" class="slider">
            <span class="value-display" contenteditable="true" spellcheck="false"></span>
        `
    }

    _setupEventListeners() {
        const slider = this.querySelector('.slider')
        const valueDisplay = this.querySelector('.value-display')

        slider.addEventListener('input', () => {
            const rawValue = parseFloat(slider.value)
            this._value = this._type === 'int' ? Math.round(rawValue) : rawValue
            this._updateValueDisplay()
            this._updateFormValue()
            this._dispatchChange()
        })

        // Handle Enter key on value display
        valueDisplay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                valueDisplay.blur()
            }
        })

        // Handle blur/focus loss on value display
        valueDisplay.addEventListener('blur', () => {
            this._processValueDisplayInput()
        })

        // Select all text when focused
        valueDisplay.addEventListener('focus', () => {
            const selection = window.getSelection()
            const range = document.createRange()
            range.selectNodeContents(valueDisplay)
            selection.removeAllRanges()
            selection.addRange(range)
        })
    }

    _updateSlider() {
        const slider = this.querySelector('.slider')
        if (!slider) return

        slider.min = this._min
        slider.max = this._max
        slider.step = this._step
        slider.value = this._value
    }

    _updateValueDisplay() {
        const valueDisplay = this.querySelector('.value-display')
        if (!valueDisplay) return

        if (this._format === 'percent') {
            valueDisplay.textContent = Math.round(this._value * 100) + '%'
            return
        }

        if (this._type === 'int' || this._value === Math.round(this._value)) {
            valueDisplay.textContent = String(Math.round(this._value))
        } else {
            // Adaptive precision: drop decimals to fit the value column
            let text = this._value.toFixed(2)
            if (text.length > 5) text = this._value.toFixed(1)
            if (text.length > 5) text = this._value.toFixed(0)
            valueDisplay.textContent = text
        }
    }

    _processValueDisplayInput() {
        const valueDisplay = this.querySelector('.value-display')
        if (!valueDisplay) return

        let inputText = valueDisplay.textContent.trim()

        // If percent format, strip trailing '%' and convert from percentage
        let inputValue
        if (this._format === 'percent') {
            inputText = inputText.replace(/%$/, '')
            inputValue = parseFloat(inputText) / 100
        } else {
            inputValue = parseFloat(inputText)
        }

        // Validate: check if it's a valid number
        if (isNaN(inputValue)) {
            // Invalid input - reset to current value
            this._updateValueDisplay()
            return
        }

        // Clamp to min/max range
        let clampedValue = Math.max(this._min, Math.min(this._max, inputValue))

        // Round to nearest step value
        const steppedValue = Math.round(clampedValue / this._step) * this._step

        // Apply integer rounding if needed
        const finalValue = this._type === 'int' ? Math.round(steppedValue) : steppedValue

        // Update if value changed
        if (this._value !== finalValue) {
            this._value = finalValue
            this._updateSlider()
            this._updateValueDisplay()
            this._updateFormValue()
            this._dispatchChange()
        } else {
            // No change - just ensure display is formatted correctly
            this._updateValueDisplay()
        }
    }

    _updateDisabledState() {
        const slider = this.querySelector('.slider')
        if (slider) {
            slider.disabled = this.disabled
        }
    }

    _updateFormValue() {
        if (this._internals) {
            this._internals.setFormValue(String(this._value))
        }
    }

    _dispatchChange() {
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
}

customElements.define('slider-value', SliderValue)

export { SliderValue }
