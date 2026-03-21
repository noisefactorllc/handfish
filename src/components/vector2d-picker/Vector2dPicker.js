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

    _setupEventListeners() {
        const button = this.querySelector('.vector-button')
        const dialog = this.querySelector('.vector-dialog')
        const closeBtn = this.querySelector('.dialog-close')
        const pad = this.querySelector('.pad-2d')
        const normalizeCheckbox = this.querySelector('.normalize-checkbox')
        const resetButton = this.querySelector('.reset-button')

        button.addEventListener('click', (e) => {
            e.stopPropagation()
            if (this.disabled) return
            this._toggleDialog()
        })

        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                this._toggleDialog()
            }
        })

        closeBtn.addEventListener('click', () => {
            this._closeDialog()
        })

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                this._closeDialog()
            }
        })

        dialog.addEventListener('cancel', (e) => {
            e.preventDefault()
            this._closeDialog()
        })

        dialog.addEventListener('close', () => {
            this._onDialogClosed()
        })

        pad.addEventListener('mousedown', (e) => this._onPadMouseDown(e))
        pad.addEventListener('touchstart', (e) => this._onPadTouchStart(e), { passive: false })

        const sliders = this.querySelectorAll('.axis-slider')
        sliders.forEach((slider) => {
            slider.addEventListener('input', (e) => this._onSliderInput(e))
            slider.addEventListener('change', (e) => this._onSliderChange(e))
        })

        const inputs = this.querySelectorAll('.axis-input')
        inputs.forEach((input) => {
            input.addEventListener('keydown', (e) => this._onInputKeyDown(e))
            input.addEventListener('blur', (e) => this._onInputBlur(e))
        })

        normalizeCheckbox.addEventListener('change', () => {
            this._normalized = normalizeCheckbox.checked
            if (this._normalized) {
                this._normalizeValue()
            }
            this._updateDisplay()
            this._updatePad()
            this._updateSliders()
            this._emitInput()
            this._emitChange()
        })

        resetButton.addEventListener('click', () => {
            if (this._normalized) {
                this._value = { x: 1, y: 0 }
            } else {
                this._value = { x: 0, y: 0 }
            }
            this._updateDisplay()
            this._updatePad()
            this._updateSliders()
            this._updateFormValue()
            this._emitInput()
            this._emitChange()
        })
    }

    // ========================================================================
    // Pad Interaction
    // ========================================================================

    _onPadMouseDown(e) {
        e.preventDefault()
        this._isDragging = true
        this._updateFromPadEvent(e)
        this._boundMouseMove = (e) => this._onPadMouseMove(e)
        this._boundMouseUp = () => this._onPadMouseUp()
        document.addEventListener('mousemove', this._boundMouseMove)
        document.addEventListener('mouseup', this._boundMouseUp)
    }

    _onPadMouseMove(e) {
        if (!this._isDragging) return
        this._updateFromPadEvent(e)
    }

    _onPadMouseUp() {
        if (this._isDragging) {
            this._isDragging = false
            this._emitChange()
        }
        document.removeEventListener('mousemove', this._boundMouseMove)
        document.removeEventListener('mouseup', this._boundMouseUp)
    }

    _onPadTouchStart(e) {
        e.preventDefault()
        this._isDragging = true
        if (e.touches.length > 0) {
            this._updateFromPadEvent(e.touches[0])
        }
        this._boundTouchMove = (e) => this._onPadTouchMove(e)
        this._boundTouchEnd = () => this._onPadTouchEnd()
        document.addEventListener('touchmove', this._boundTouchMove, { passive: false })
        document.addEventListener('touchend', this._boundTouchEnd)
    }

    _onPadTouchMove(e) {
        if (!this._isDragging) return
        e.preventDefault()
        if (e.touches.length > 0) {
            this._updateFromPadEvent(e.touches[0])
        }
    }

    _onPadTouchEnd() {
        if (this._isDragging) {
            this._isDragging = false
            this._emitChange()
        }
        document.removeEventListener('touchmove', this._boundTouchMove)
        document.removeEventListener('touchend', this._boundTouchEnd)
    }

    _updateFromPadEvent(e) {
        const pad = this.querySelector('.pad-2d')
        const rect = pad.getBoundingClientRect()

        let nx = (e.clientX - rect.left) / rect.width
        let ny = (e.clientY - rect.top) / rect.height

        nx = Math.max(0, Math.min(1, nx))
        ny = Math.max(0, Math.min(1, ny))

        const range = this._max - this._min
        let x = this._roundToStep(nx * range + this._min)
        let y = this._roundToStep((1 - ny) * range + this._min)

        this._value = { x, y }

        if (this._normalized) {
            this._normalizeValue()
        }

        this._updateDisplay()
        this._updatePad()
        this._updateSliders()
        this._updateFormValue()
        this._emitInput()
    }

    // ========================================================================
    // Slider and Input Handlers
    // ========================================================================

    _onSliderInput(e) {
        const slider = e.target
        const val = parseFloat(slider.value)

        if (slider.classList.contains('x')) {
            this._value.x = val
        } else if (slider.classList.contains('y')) {
            this._value.y = val
        }

        if (this._normalized) {
            this._normalizeValue()
        }

        this._updateDisplay()
        this._updatePad()
        this._updateSliders()
        this._updateFormValue()
        this._emitInput()
    }

    _onSliderChange() {
        this._emitChange()
    }

    _onInputKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault()
            this._applyInputValue(e.target)
            e.target.blur()
        } else if (e.key === 'Escape') {
            this._updateSliders()
            e.target.blur()
        }
    }

    _onInputBlur(e) {
        this._applyInputValue(e.target)
    }

    _applyInputValue(input) {
        const val = parseFloat(input.value)
        if (isNaN(val)) {
            this._updateSliders()
            return
        }

        const clampedVal = Math.max(this._min, Math.min(this._max, this._roundToStep(val)))

        if (input.classList.contains('x-input')) {
            this._value.x = clampedVal
        } else if (input.classList.contains('y-input')) {
            this._value.y = clampedVal
        }

        if (this._normalized) {
            this._normalizeValue()
        }

        this._updateDisplay()
        this._updatePad()
        this._updateSliders()
        this._updateFormValue()
        this._emitInput()
        this._emitChange()
    }

    // ========================================================================
    // Dialog Methods
    // ========================================================================

    _toggleDialog() {
        if (this._isOpen) {
            this._closeDialog()
        } else {
            this._openDialog()
        }
    }

    _openDialog() {
        const dialog = this.querySelector('.vector-dialog')
        const button = this.querySelector('.vector-button')

        this._updateSliders()
        this._updatePad()
        this._updateNormalizeCheckbox()

        dialog.showModal()
        button.setAttribute('aria-expanded', 'true')
        this.classList.add('dialog-open')
        this._isOpen = true
    }

    _closeDialog() {
        const dialog = this.querySelector('.vector-dialog')
        if (dialog?.open) {
            dialog.close()
        } else {
            this._onDialogClosed()
        }
    }

    _onDialogClosed() {
        const button = this.querySelector('.vector-button')
        if (button) button.setAttribute('aria-expanded', 'false')
        this.classList.remove('dialog-open')
        this._isOpen = false
    }

    // ========================================================================
    // Update / Display
    // ========================================================================

    _updateDisplay() {
        const xVal = this.querySelector('.x-value')
        const yVal = this.querySelector('.y-value')
        const magDisplay = this.querySelector('.magnitude-display')

        if (xVal) xVal.textContent = this._formatValue(this._value.x)
        if (yVal) yVal.textContent = this._formatValue(this._value.y)

        const magnitude = Math.sqrt(this._value.x ** 2 + this._value.y ** 2)
        if (magDisplay) magDisplay.textContent = `|v| = ${magnitude.toFixed(2)}`
    }

    _updatePad() {
        const indicator = this.querySelector('.pad-indicator')
        const line = this.querySelector('.pad-direction-line')
        const pad = this.querySelector('.pad-2d')
        const circleGuide = this.querySelector('.pad-circle-guide')

        if (!indicator || !pad) return

        const padWidth = pad.clientWidth || 280
        const padHeight = pad.clientHeight || 280

        const range = this._max - this._min
        const px = ((this._value.x - this._min) / range) * padWidth
        const py = (1 - (this._value.y - this._min) / range) * padHeight

        indicator.style.left = `${px}px`
        indicator.style.top = `${py}px`

        if (line) {
            const cx = padWidth / 2
            const cy = padHeight / 2
            const dx = px - cx
            const dy = py - cy
            const length = Math.sqrt(dx * dx + dy * dy)
            const angle = Math.atan2(dy, dx) * 180 / Math.PI
            line.style.width = `${length}px`
            line.style.transform = `rotate(${angle}deg)`
        }

        if (circleGuide) {
            if (this._normalized) {
                const unitPixels = padWidth / range
                const diameter = unitPixels * 2
                circleGuide.style.width = `${diameter}px`
                circleGuide.style.height = `${diameter}px`
                circleGuide.style.display = 'block'
            } else {
                circleGuide.style.display = 'none'
            }
        }
    }

    _updateSliders() {
        const sliderX = this.querySelector('.axis-slider.x')
        const sliderY = this.querySelector('.axis-slider.y')
        const inputX = this.querySelector('.x-input')
        const inputY = this.querySelector('.y-input')

        if (sliderX) sliderX.value = this._value.x
        if (sliderY) sliderY.value = this._value.y

        if (inputX) inputX.value = this._formatValue(this._value.x)
        if (inputY) inputY.value = this._formatValue(this._value.y)
    }

    _updateSliderRanges() {
        const sliders = this.querySelectorAll('.axis-slider')
        sliders.forEach((slider) => {
            slider.min = this._min
            slider.max = this._max
            slider.step = this._step
        })
    }

    _updateNormalizeCheckbox() {
        const checkbox = this.querySelector('.normalize-checkbox')
        if (checkbox) {
            checkbox.checked = this._normalized
        }
    }

    _updateDisabledState() {
        const button = this.querySelector('.vector-button')
        if (button) {
            button.disabled = this.disabled
        }
        if (this.disabled) {
            this._closeDialog()
        }
    }

    _updateFormValue() {
        if (this._internals) {
            const valueStr = JSON.stringify([this._value.x, this._value.y])
            this._internals.setFormValue(valueStr)
        }
    }

    // ========================================================================
    // Value Parsing
    // ========================================================================

    _setValueFromAttribute(str) {
        if (!str) return

        try {
            const parsed = JSON.parse(str)
            if (Array.isArray(parsed) && parsed.length >= 2) {
                this._value = { x: parsed[0], y: parsed[1] }
            } else if (parsed && typeof parsed === 'object') {
                this._value = {
                    x: parsed.x ?? 0,
                    y: parsed.y ?? 0
                }
            }
        } catch {
            const parts = str.split(',').map((p) => parseFloat(p.trim()))
            if (parts.length >= 2 && parts.every((p) => !isNaN(p))) {
                this._value = { x: parts[0], y: parts[1] }
            }
        }

        this._clampValue()
        this._updateDisplay()
        this._updateFormValue()
    }

    _normalizeValue() {
        const mag = Math.sqrt(this._value.x ** 2 + this._value.y ** 2)
        if (mag > 0) {
            this._value.x /= mag
            this._value.y /= mag
        } else {
            this._value = { x: 1, y: 0 }
        }
    }

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
