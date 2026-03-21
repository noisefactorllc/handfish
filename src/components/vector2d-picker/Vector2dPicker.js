/**
 * Vector2D Picker Component
 *
 * A 2D vector picker that shows a button displaying the current X, Y values.
 * Clicking the button opens a modal dialog with:
 * - An interactive 2D pad gizmo for direction picking
 * - Individual X, Y sliders with numeric inputs
 * - A normalize toggle for direction vectors
 *
 * @module components/vector2d-picker/Vector2dPicker
 */

// ============================================================================
// Inject styles once into document head
// ============================================================================
const VECTOR2D_PICKER_STYLES_ID = 'hf-vector2d-picker-styles'
if (!document.getElementById(VECTOR2D_PICKER_STYLES_ID)) {
    const styleEl = document.createElement('style')
    styleEl.id = VECTOR2D_PICKER_STYLES_ID
    styleEl.textContent = `
        vector2d-picker {
            all: unset;
            display: block;
            font-family: inherit;
        }

        vector2d-picker[disabled] {
            opacity: 0.5;
            pointer-events: none;
        }

        vector2d-picker .vector-button {
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
            color: var(--hf-text-normal);
            background: var(--hf-bg-elevated);
            border-radius: var(--hf-radius-sm, 0.25rem);
            border: var(--hf-border-width) solid var(--hf-border-subtle);
        }

        vector2d-picker .vector-button:focus-visible {
            outline: var(--hf-focus-ring-width) solid var(--hf-focus-ring-color);
            outline-offset: var(--hf-focus-ring-offset);
        }

        vector2d-picker .vector-button:hover {
            background: var(--hf-bg-muted);
        }

        vector2d-picker .vector-preview {
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: var(--hf-font-family-mono);
            font-size: 0.6875rem;
            color: var(--hf-text-normal);
        }

        vector2d-picker .vector-preview .axis {
            display: flex;
            align-items: center;
            gap: 1px;
            padding-right: 3px;
        }

        vector2d-picker .vector-preview .axis-label {
            font-weight: 600;
            opacity: 0.7;
        }

        vector2d-picker .vector-preview .axis-label.x { color: var(--hf-red); }
        vector2d-picker .vector-preview .axis-label.y { color: var(--hf-green); }

        vector2d-picker .dropdown-arrow {
            font-size: 0.5rem;
            color: var(--hf-text-dim);
            flex-shrink: 0;
            margin-left: auto;
            transition: transform 0.15s ease;
        }

        vector2d-picker.dialog-open .dropdown-arrow {
            transform: rotate(180deg);
        }

        /* Dialog styles */
        vector2d-picker .vector-dialog {
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
            min-width: 320px;
        }

        vector2d-picker .vector-dialog::backdrop {
            background: var(--hf-backdrop, rgba(0, 0, 0, 0.6));
            backdrop-filter: var(--hf-glass-blur-sm, blur(4px));
        }

        vector2d-picker .dialog-titlebar {
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

        vector2d-picker .dialog-title {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        vector2d-picker .dialog-close {
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

        vector2d-picker .dialog-close:hover {
            opacity: 1;
            color: var(--hf-text-normal, #d9deeb);
        }

        vector2d-picker .dialog-body {
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        /* 2D pad container */
        vector2d-picker .pad-container {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0.5rem;
        }

        vector2d-picker .pad-2d {
            width: 100%;
            aspect-ratio: 1;
            background: var(--hf-bg-elevated);
            position: relative;
            cursor: crosshair;
            border: 1px solid var(--hf-border-subtle);
            border-radius: var(--hf-radius-sm, 0.25rem);
            touch-action: none;
            overflow: hidden;
        }

        /* Grid lines on pad */
        vector2d-picker .pad-grid {
            position: absolute;
            inset: 0;
            overflow: hidden;
            pointer-events: none;
        }

        vector2d-picker .pad-grid::before,
        vector2d-picker .pad-grid::after {
            content: '';
            position: absolute;
            background: var(--hf-text-dim);
            opacity: 0.2;
        }

        vector2d-picker .pad-grid::before {
            left: 0;
            right: 0;
            top: 50%;
            height: 1px;
            transform: translateY(-50%);
        }

        vector2d-picker .pad-grid::after {
            top: 0;
            bottom: 0;
            left: 50%;
            width: 1px;
            transform: translateX(-50%);
        }

        /* Direction indicator dot */
        vector2d-picker .pad-indicator {
            position: absolute;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--hf-accent);
            border: 2px solid var(--hf-text-bright);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
            transform: translate(-50%, -50%);
            transition: transform 0.05s ease-out;
            pointer-events: none;
            z-index: 1;
        }

        vector2d-picker .pad-indicator::after {
            content: '';
            position: absolute;
            inset: 2px;
            border-radius: 50%;
            background: radial-gradient(
                circle at 30% 30%,
                rgba(255, 255, 255, 0.4) 0%,
                transparent 60%
            );
        }

        /* Direction line from center to indicator */
        vector2d-picker .pad-direction-line {
            position: absolute;
            left: 50%;
            top: 50%;
            height: 2px;
            background: linear-gradient(
                to right,
                transparent 0%,
                var(--hf-accent) 20%,
                var(--hf-accent) 100%
            );
            transform-origin: left center;
            pointer-events: none;
            opacity: 0.6;
        }

        /* Circle guide */
        vector2d-picker .pad-circle-guide {
            position: absolute;
            border: 1px dashed var(--hf-accent);
            border-radius: 50%;
            opacity: 0.3;
            pointer-events: none;
            transform: translate(-50%, -50%);
            left: 50%;
            top: 50%;
        }

        /* Axis indicators */
        vector2d-picker .axis-indicators {
            position: absolute;
            inset: 0;
            pointer-events: none;
        }

        vector2d-picker .axis-indicator {
            position: absolute;
            font-size: 0.625rem;
            font-weight: 700;
            font-family: var(--hf-font-family-mono);
        }

        vector2d-picker .axis-indicator.x-pos { right: -2px; top: 50%; transform: translateY(-50%); color: var(--hf-red); }
        vector2d-picker .axis-indicator.x-neg { left: 2px; top: 50%; transform: translateY(-50%); color: var(--hf-red); }
        vector2d-picker .axis-indicator.y-pos { top: 2px; left: 50%; transform: translateX(-50%); color: var(--hf-green); }
        vector2d-picker .axis-indicator.y-neg { bottom: 2px; left: 50%; transform: translateX(-50%); color: var(--hf-green); }

        /* Sliders section */
        vector2d-picker .sliders-section {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        vector2d-picker .slider-row {
            display: grid;
            grid-template-columns: 20px 1fr 60px;
            align-items: center;
            gap: 0.5rem;
        }

        vector2d-picker .slider-label {
            font-size: 0.75rem;
            font-weight: 600;
            font-family: var(--hf-font-family-mono);
        }

        vector2d-picker .slider-label.x { color: var(--hf-red); }
        vector2d-picker .slider-label.y { color: var(--hf-green); }

        vector2d-picker .axis-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 6px;
            background: var(--hf-bg-elevated);
            border-radius: var(--hf-radius-sm, 0.25rem);
            outline: none;
            cursor: pointer;
        }

        vector2d-picker .axis-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid var(--hf-text-bright);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        vector2d-picker .axis-slider.x::-webkit-slider-thumb { background: var(--hf-red); }
        vector2d-picker .axis-slider.y::-webkit-slider-thumb { background: var(--hf-green); }

        vector2d-picker .axis-slider::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid var(--hf-text-bright);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        vector2d-picker .axis-slider.x::-moz-range-thumb { background: var(--hf-red); }
        vector2d-picker .axis-slider.y::-moz-range-thumb { background: var(--hf-green); }

        vector2d-picker .axis-input {
            width: 100%;
            padding: 0.25rem 0.375rem;
            font-size: 0.6875rem;
            font-family: var(--hf-font-family-mono);
            color: var(--hf-text-normal);
            background: var(--hf-bg-elevated);
            border: var(--hf-border-width) solid var(--hf-border-subtle);
            border-radius: var(--hf-radius-sm, 0.25rem);
            text-align: right;
            box-sizing: border-box;
        }

        vector2d-picker .axis-input:focus {
            outline: none;
            border-color: var(--hf-border-focus);
        }

        /* Options row */
        vector2d-picker .options-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding-top: 0.5rem;
            border-top: var(--hf-border-width) solid var(--hf-border-subtle);
        }

        vector2d-picker .normalize-toggle {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
            color: var(--hf-text-dim);
            cursor: pointer;
        }

        vector2d-picker .normalize-toggle input {
            accent-color: var(--hf-accent);
            width: 14px;
            height: 14px;
            cursor: pointer;
        }

        vector2d-picker .magnitude-display {
            font-size: 0.6875rem;
            font-family: var(--hf-font-family-mono);
            color: var(--hf-text-dim);
        }

        vector2d-picker .reset-button {
            padding: 0.25rem 0.75rem;
            font-size: 0.6875rem;
            color: var(--hf-text-dim);
            background: var(--hf-bg-elevated);
            border: var(--hf-border-width) solid var(--hf-border-subtle);
            border-radius: var(--hf-radius-sm, 0.25rem);
            cursor: pointer;
            transition: all 0.15s ease;
        }

        vector2d-picker .reset-button:focus-visible {
            outline: var(--hf-focus-ring-width) solid var(--hf-focus-ring-color);
            outline-offset: var(--hf-focus-ring-offset);
        }

        vector2d-picker .reset-button:hover {
            color: var(--hf-text-normal);
            background: var(--hf-bg-muted);
        }
    `
    document.head.appendChild(styleEl)
}

// ============================================================================
// Vector2D Picker Component
// ============================================================================

class Vector2dPicker extends HTMLElement {
    static formAssociated = true

    static get observedAttributes() {
        return ['value', 'disabled', 'name', 'min', 'max', 'step', 'normalized']
    }

    constructor() {
        super()
        if (this.constructor.formAssociated) {
            this._internals = this.attachInternals?.()
        }
        this._value = { x: 0, y: 0 }
        this._min = -1
        this._max = 1
        this._step = 0.01
        this._normalized = false
        this._isOpen = false
        this._isDragging = false
        this._rendered = false
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
        this._updateDisplay()
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
            case 'min':
                this._min = parseFloat(newValue) || -1
                this._updateSliderRanges()
                break
            case 'max':
                this._max = parseFloat(newValue) || 1
                this._updateSliderRanges()
                break
            case 'step':
                this._step = parseFloat(newValue) || 0.01
                this._updateSliderRanges()
                break
            case 'normalized':
                this._normalized = newValue !== null && newValue !== 'false'
                this._updateNormalizeCheckbox()
                break
        }
    }

    // ========================================================================
    // Public API
    // ========================================================================

    get value() { return this._value }
    set value(val) {
        if (typeof val === 'string') {
            this._setValueFromAttribute(val)
            return
        } else if (Array.isArray(val) && val.length >= 2) {
            this._value = { x: val[0], y: val[1] }
        } else if (val && typeof val === 'object') {
            this._value = {
                x: val.x ?? val[0] ?? 0,
                y: val.y ?? val[1] ?? 0
            }
        }
        this._clampValue()
        if (this._normalized) {
            this._normalizeValue()
        }
        this._updateDisplay()
        this._updateFormValue()
        this._updatePad()
        this._updateSliders()
    }

    get disabled() { return this.hasAttribute('disabled') }
    set disabled(val) {
        if (val) this.setAttribute('disabled', '')
        else this.removeAttribute('disabled')
    }

    get name() { return this.getAttribute('name') }
    set name(val) {
        if (val) this.setAttribute('name', val)
        else this.removeAttribute('name')
    }

    get normalized() { return this._normalized }
    set normalized(val) {
        this._normalized = !!val
        if (this._normalized) this.setAttribute('normalized', '')
        else this.removeAttribute('normalized')
        this._updateNormalizeCheckbox()
    }

    // ========================================================================
    // Render
    // ========================================================================

    _render() {
        this.innerHTML = `
            <button class="vector-button" type="button" aria-haspopup="dialog" aria-expanded="false">
                <span class="vector-preview">
                    <span class="axis"><span class="axis-label x">X</span><span class="x-value">0.00</span></span>
                    <span class="axis"><span class="axis-label y">Y</span><span class="y-value">0.00</span></span>
                </span>
                <span class="dropdown-arrow">\u25BC</span>
            </button>
            <dialog class="vector-dialog" aria-label="2D Vector picker">
                <div class="dialog-titlebar">
                    <span class="dialog-title">vector2d</span>
                    <button class="dialog-close" type="button" aria-label="close">\u2715</button>
                </div>
                <div class="dialog-body">
                    <div class="pad-container">
                        <div class="pad-2d">
                            <div class="pad-grid"></div>
                            <div class="axis-labels">
                                <span class="axis-indicator x-pos">+X</span>
                                <span class="axis-indicator x-neg">-X</span>
                                <span class="axis-indicator y-pos">+Y</span>
                                <span class="axis-indicator y-neg">-Y</span>
                            </div>
                            <div class="pad-circle-guide"></div>
                            <div class="pad-direction-line"></div>
                            <div class="pad-indicator"></div>
                        </div>
                    </div>

                    <div class="sliders-section">
                        <div class="slider-row">
                            <span class="slider-label x">X</span>
                            <input type="range" class="axis-slider x" name="x-range" min="-1" max="1" step="0.01" value="0">
                            <input type="text" class="axis-input x-input" name="x-input" value="0.00">
                        </div>
                        <div class="slider-row">
                            <span class="slider-label y">Y</span>
                            <input type="range" class="axis-slider y" name="y-range" min="-1" max="1" step="0.01" value="0">
                            <input type="text" class="axis-input y-input" name="y-input" value="0.00">
                        </div>
                    </div>

                    <div class="options-row">
                        <label class="normalize-toggle">
                            <input type="checkbox" class="normalize-checkbox" name="normalize">
                            <span>Normalize</span>
                        </label>
                        <span class="magnitude-display">|v| = 0.00</span>
                        <button class="reset-button" type="button">Reset</button>
                    </div>
                </div>
            </dialog>
        `
    }

    // ========================================================================
    // Event Listeners
    // ========================================================================

    _setupEventListeners() {}
    _closeDialog() {}

    // ========================================================================
    // Update / Display
    // ========================================================================

    _updateDisplay() {}
    _updatePad() {}
    _updateSliders() {}
    _updateSliderRanges() {}
    _updateNormalizeCheckbox() {}
    _updateDisabledState() {}
    _updateFormValue() {}

    // ========================================================================
    // Value Parsing
    // ========================================================================

    _setValueFromAttribute() {}
    _normalizeValue() {}

    // ========================================================================
    // Utility
    // ========================================================================

    _clampValue() {
        this._value.x = Math.max(this._min, Math.min(this._max, this._roundToStep(this._value.x)))
        this._value.y = Math.max(this._min, Math.min(this._max, this._roundToStep(this._value.y)))
    }
    _roundToStep(value) { return Math.round(value / this._step) * this._step }
    _formatValue(val) {
        const rounded = this._roundToStep(val)
        if (Math.abs(rounded - Math.round(rounded)) < 0.0001) {
            return Math.round(rounded).toString()
        }
        return rounded.toFixed(2)
    }
    _emitInput() {
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    }
    _emitChange() {
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
}

customElements.define('vector2d-picker', Vector2dPicker)
export { Vector2dPicker }
