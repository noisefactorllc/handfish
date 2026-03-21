/**
 * Vector3D Picker Component
 *
 * A 3D vector picker that shows a button displaying the current X, Y, Z values.
 * Clicking the button opens a modal dialog with:
 * - An interactive 3D sphere gizmo for direction picking (inspired by Blender/Unity)
 * - Individual X, Y, Z sliders with numeric inputs
 * - A normalize toggle for direction vectors
 *
 * @module components/vector3d-picker/Vector3dPicker
 */

// ============================================================================
// Inject styles once into document head
// ============================================================================
const VECTOR3D_PICKER_STYLES_ID = 'hf-vector3d-picker-styles'
if (!document.getElementById(VECTOR3D_PICKER_STYLES_ID)) {
    const styleEl = document.createElement('style')
    styleEl.id = VECTOR3D_PICKER_STYLES_ID
    styleEl.textContent = `
        vector3d-picker {
            all: unset;
            display: block;
            font-family: inherit;
        }

        vector3d-picker[disabled] {
            opacity: 0.5;
            pointer-events: none;
        }

        vector3d-picker .vector-button {
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

        vector3d-picker .vector-button:focus-visible {
            outline: var(--hf-focus-ring-width) solid var(--hf-focus-ring-color);
            outline-offset: var(--hf-focus-ring-offset);
        }

        vector3d-picker .vector-button:hover {
            background: var(--hf-bg-muted);
        }

        vector3d-picker .vector-preview {
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: var(--hf-font-family-mono);
            font-size: 0.6875rem;
            color: var(--hf-text-normal);
        }

        vector3d-picker .vector-preview .axis {
            display: flex;
            align-items: center;
            gap: 1px;
            padding-right: 3px;
        }

        vector3d-picker .vector-preview .axis-label {
            font-weight: 600;
            opacity: 0.7;
        }

        vector3d-picker .vector-preview .axis-label.x { color: var(--hf-red); }
        vector3d-picker .vector-preview .axis-label.y { color: var(--hf-green); }
        vector3d-picker .vector-preview .axis-label.z { color: var(--hf-blue); }

        vector3d-picker .dropdown-arrow {
            font-size: 0.5rem;
            color: var(--hf-text-dim);
            flex-shrink: 0;
            margin-left: auto;
            transition: transform 0.15s ease;
        }

        vector3d-picker.dialog-open .dropdown-arrow {
            transform: rotate(180deg);
        }

        /* Dialog styles */
        vector3d-picker .vector-dialog {
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

        vector3d-picker .vector-dialog::backdrop {
            background: var(--hf-backdrop, rgba(0, 0, 0, 0.6));
            backdrop-filter: var(--hf-glass-blur-sm, blur(4px));
        }

        vector3d-picker .dialog-titlebar {
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

        vector3d-picker .dialog-title {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        vector3d-picker .dialog-close {
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

        vector3d-picker .dialog-close:hover {
            opacity: 1;
            color: var(--hf-text-normal, #d9deeb);
        }

        vector3d-picker .dialog-body {
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        /* Sphere gizmo container */
        vector3d-picker .gizmo-container {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0.5rem;
        }

        vector3d-picker .sphere-gizmo {
            width: 180px;
            height: 180px;
            border-radius: 50%;
            background: radial-gradient(
                circle at 30% 30%,
                var(--hf-bg-muted) 0%,
                var(--hf-bg-elevated) 50%,
                var(--hf-bg-surface) 100%
            );
            position: relative;
            cursor: crosshair;
            box-shadow:
                inset 0 0 30px rgba(0, 0, 0, 0.3),
                0 4px 12px rgba(0, 0, 0, 0.3);
            border: 2px solid var(--hf-border-subtle);
        }

        vector3d-picker .sphere-gizmo::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: radial-gradient(
                circle at 25% 25%,
                rgba(255, 255, 255, 0.1) 0%,
                transparent 50%
            );
            pointer-events: none;
        }

        /* Grid lines on sphere */
        vector3d-picker .sphere-grid {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            overflow: hidden;
            pointer-events: none;
        }

        vector3d-picker .sphere-grid::before,
        vector3d-picker .sphere-grid::after {
            content: '';
            position: absolute;
            background: var(--hf-text-dim);
            opacity: 0.2;
        }

        vector3d-picker .sphere-grid::before {
            /* Horizontal line */
            left: 10%;
            right: 10%;
            top: 50%;
            height: 1px;
            transform: translateY(-50%);
        }

        vector3d-picker .sphere-grid::after {
            /* Vertical line */
            top: 10%;
            bottom: 10%;
            left: 50%;
            width: 1px;
            transform: translateX(-50%);
        }

        /* Direction indicator dot */
        vector3d-picker .direction-indicator {
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

        vector3d-picker .direction-indicator::after {
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
        vector3d-picker .direction-line {
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

        /* Axis indicators */
        vector3d-picker .axis-indicators {
            position: absolute;
            inset: 0;
            pointer-events: none;
        }

        vector3d-picker .axis-indicator {
            position: absolute;
            font-size: 0.625rem;
            font-weight: 700;
            font-family: var(--hf-font-family-mono);
        }

        vector3d-picker .axis-indicator.x-pos { right: -2px; top: 50%; transform: translateY(-50%); color: var(--hf-red); }
        vector3d-picker .axis-indicator.x-neg { left: 2px; top: 50%; transform: translateY(-50%); color: var(--hf-red); }
        vector3d-picker .axis-indicator.y-pos { top: 2px; left: 50%; transform: translateX(-50%); color: var(--hf-green); }
        vector3d-picker .axis-indicator.y-neg { bottom: 2px; left: 50%; transform: translateX(-50%); color: var(--hf-green); }

        /* Z depth indicator */
        vector3d-picker .z-indicator {
            position: absolute;
            bottom: -24px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.625rem;
            font-family: var(--hf-font-family-mono);
            color: var(--hf-blue);
            display: flex;
            align-items: center;
            gap: 4px;
        }

        /* Sliders section */
        vector3d-picker .sliders-section {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        vector3d-picker .slider-row {
            display: grid;
            grid-template-columns: 20px 1fr 60px;
            align-items: center;
            gap: 0.5rem;
        }

        vector3d-picker .slider-label {
            font-size: 0.75rem;
            font-weight: 600;
            font-family: var(--hf-font-family-mono);
        }

        vector3d-picker .slider-label.x { color: var(--hf-red); }
        vector3d-picker .slider-label.y { color: var(--hf-green); }
        vector3d-picker .slider-label.z { color: var(--hf-blue); }

        vector3d-picker .axis-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 6px;
            background: var(--hf-bg-elevated);
            border-radius: var(--hf-radius-sm, 0.25rem);
            outline: none;
            cursor: pointer;
        }

        vector3d-picker .axis-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid var(--hf-text-bright);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        vector3d-picker .axis-slider.x::-webkit-slider-thumb { background: var(--hf-red); }
        vector3d-picker .axis-slider.y::-webkit-slider-thumb { background: var(--hf-green); }
        vector3d-picker .axis-slider.z::-webkit-slider-thumb { background: var(--hf-blue); }

        vector3d-picker .axis-slider::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid var(--hf-text-bright);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        vector3d-picker .axis-slider.x::-moz-range-thumb { background: var(--hf-red); }
        vector3d-picker .axis-slider.y::-moz-range-thumb { background: var(--hf-green); }
        vector3d-picker .axis-slider.z::-moz-range-thumb { background: var(--hf-blue); }

        vector3d-picker .axis-input {
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

        vector3d-picker .axis-input:focus {
            outline: none;
            border-color: var(--hf-border-focus);
        }

        /* Options row */
        vector3d-picker .options-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding-top: 0.5rem;
            border-top: var(--hf-border-width) solid var(--hf-border-subtle);
        }

        vector3d-picker .normalize-toggle {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
            color: var(--hf-text-dim);
            cursor: pointer;
        }

        vector3d-picker .normalize-toggle input {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border: var(--hf-border-width) solid var(--hf-border-subtle);
            border-radius: var(--hf-radius-sm);
            background: transparent;
            cursor: pointer;
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: border-color 0.15s ease;
        }

        vector3d-picker .normalize-toggle input::after {
            content: "";
            width: 6px;
            height: 6px;
            border-radius: 1px;
            background-color: var(--hf-accent);
            transform: scale(0);
            transition: transform 0.15s ease;
        }

        vector3d-picker .normalize-toggle input:checked {
            border-color: var(--hf-accent);
        }

        vector3d-picker .normalize-toggle input:checked::after {
            transform: scale(1);
        }

        vector3d-picker .normalize-toggle input:hover {
            border-color: var(--hf-text-normal);
        }

        vector3d-picker .magnitude-display {
            font-size: 0.6875rem;
            font-family: var(--hf-font-family-mono);
            color: var(--hf-text-dim);
        }

        vector3d-picker .reset-button {
            padding: 0.25rem 0.75rem;
            font-size: 0.6875rem;
            color: var(--hf-text-dim);
            background: var(--hf-bg-elevated);
            border: var(--hf-border-width) solid var(--hf-border-subtle);
            border-radius: var(--hf-radius-sm, 0.25rem);
            cursor: pointer;
            transition: all 0.15s ease;
        }

        vector3d-picker .reset-button:focus-visible {
            outline: var(--hf-focus-ring-width) solid var(--hf-focus-ring-color);
            outline-offset: var(--hf-focus-ring-offset);
        }

        vector3d-picker .reset-button:hover {
            color: var(--hf-text-normal);
            background: var(--hf-bg-muted);
        }
    `
    document.head.appendChild(styleEl)
}

// ============================================================================
// Vector3D Picker Component
// ============================================================================

class Vector3dPicker extends HTMLElement {
    static formAssociated = true

    static get observedAttributes() {
        return ['value', 'disabled', 'name', 'min', 'max', 'step', 'normalized']
    }

    constructor() {
        super()

        // Form association
        if (this.constructor.formAssociated) {
            this._internals = this.attachInternals?.()
        }

        // Default vector value
        this._value = { x: 0, y: 1, z: 0 }
        this._min = -1
        this._max = 1
        this._step = 0.01
        this._normalized = false
        this._isOpen = false
        this._isDragging = false

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

    get value() {
        return this._value
    }

    set value(val) {
        if (typeof val === 'string') {
            this._setValueFromAttribute(val)
        } else if (Array.isArray(val) && val.length >= 3) {
            this._value = { x: val[0], y: val[1], z: val[2] }
        } else if (val && typeof val === 'object') {
            this._value = {
                x: val.x ?? val[0] ?? 0,
                y: val.y ?? val[1] ?? 0,
                z: val.z ?? val[2] ?? 0
            }
        }
        this._updateDisplay()
        this._updateFormValue()
        this._updateGizmo()
        this._updateSliders()
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

    get normalized() {
        return this._normalized
    }

    set normalized(val) {
        this._normalized = !!val
        if (this._normalized) {
            this.setAttribute('normalized', '')
        } else {
            this.removeAttribute('normalized')
        }
        this._updateNormalizeCheckbox()
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    _render() {
        this.innerHTML = `
            <button class="vector-button" type="button" aria-haspopup="dialog" aria-expanded="false">
                <span class="vector-preview">
                    <span class="axis"><span class="axis-label x">X</span><span class="x-value">0.00</span></span>
                    <span class="axis"><span class="axis-label y">Y</span><span class="y-value">0.00</span></span>
                    <span class="axis"><span class="axis-label z">Z</span><span class="z-value">0.00</span></span>
                </span>
                <span class="dropdown-arrow">\u25BC</span>
            </button>
            <dialog class="vector-dialog" aria-label="3D Vector picker">
                <div class="dialog-titlebar">
                    <span class="dialog-title">vector</span>
                    <button class="dialog-close" type="button" aria-label="close">\u2715</button>
                </div>
                <div class="dialog-body">
                    <div class="gizmo-container">
                        <div class="sphere-gizmo">
                            <div class="sphere-grid"></div>
                            <div class="axis-indicators">
                                <span class="axis-indicator x-pos">+X</span>
                                <span class="axis-indicator x-neg">-X</span>
                                <span class="axis-indicator y-pos">+Y</span>
                                <span class="axis-indicator y-neg">-Y</span>
                            </div>
                            <div class="direction-line"></div>
                            <div class="direction-indicator"></div>
                            <div class="z-indicator">
                                <span>Z:</span>
                                <span class="z-depth-value">0.00</span>
                            </div>
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
                        <div class="slider-row">
                            <span class="slider-label z">Z</span>
                            <input type="range" class="axis-slider z" name="z-range" min="-1" max="1" step="0.01" value="0">
                            <input type="text" class="axis-input z-input" name="z-input" value="0.00">
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

    _setupEventListeners() {
        const button = this.querySelector('.vector-button')
        const dialog = this.querySelector('.vector-dialog')
        const closeBtn = this.querySelector('.dialog-close')
        const sphereGizmo = this.querySelector('.sphere-gizmo')
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

        sphereGizmo.addEventListener('mousedown', (e) => this._onGizmoMouseDown(e))
        sphereGizmo.addEventListener('touchstart', (e) => this._onGizmoTouchStart(e), { passive: false })

        document.addEventListener('mousemove', (e) => this._onGizmoMouseMove(e))
        document.addEventListener('mouseup', () => this._onGizmoMouseUp())
        document.addEventListener('touchmove', (e) => this._onGizmoTouchMove(e), { passive: false })
        document.addEventListener('touchend', () => this._onGizmoTouchEnd())

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
            this._updateGizmo()
            this._updateSliders()
            this._emitInput()
            this._emitChange()
        })

        resetButton.addEventListener('click', () => {
            this._value = { x: 0, y: 1, z: 0 }
            this._updateDisplay()
            this._updateGizmo()
            this._updateSliders()
            this._updateFormValue()
            this._emitInput()
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
        const dialog = this.querySelector('.vector-dialog')
        const button = this.querySelector('.vector-button')

        this._updateSliders()
        this._updateGizmo()
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
    // Gizmo Interaction
    // ========================================================================

    _onGizmoMouseDown(e) {
        e.preventDefault()
        this._isDragging = true
        this._updateFromGizmoEvent(e)
    }

    _onGizmoMouseMove(e) {
        if (!this._isDragging) return
        this._updateFromGizmoEvent(e)
    }

    _onGizmoMouseUp() {
        if (this._isDragging) {
            this._isDragging = false
            this._emitChange()
        }
    }

    _onGizmoTouchStart(e) {
        e.preventDefault()
        this._isDragging = true
        if (e.touches.length > 0) {
            this._updateFromGizmoEvent(e.touches[0])
        }
    }

    _onGizmoTouchMove(e) {
        if (!this._isDragging) return
        e.preventDefault()
        if (e.touches.length > 0) {
            this._updateFromGizmoEvent(e.touches[0])
        }
    }

    _onGizmoTouchEnd() {
        if (this._isDragging) {
            this._isDragging = false
            this._emitChange()
        }
    }

    _updateFromGizmoEvent(e) {
        const gizmo = this.querySelector('.sphere-gizmo')
        const rect = gizmo.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const radius = rect.width / 2

        let nx = (e.clientX - centerX) / radius
        let ny = -(e.clientY - centerY) / radius

        const distSq = nx * nx + ny * ny
        if (distSq > 1) {
            const dist = Math.sqrt(distSq)
            nx /= dist
            ny /= dist
        }

        const zSq = 1 - nx * nx - ny * ny
        let nz = zSq > 0 ? Math.sqrt(zSq) : 0

        if (e.shiftKey) {
            nz = -nz
        }

        if (this._normalized) {
            this._value = { x: nx, y: ny, z: nz }
        } else {
            const range = this._max - this._min
            this._value = {
                x: this._roundToStep(nx * range / 2 + (this._max + this._min) / 2),
                y: this._roundToStep(ny * range / 2 + (this._max + this._min) / 2),
                z: this._roundToStep(nz * range / 2 + (this._max + this._min) / 2)
            }
        }

        this._updateDisplay()
        this._updateGizmo()
        this._updateSliders()
        this._updateFormValue()
        this._emitInput()
    }

    // ========================================================================
    // Slider Interaction
    // ========================================================================

    _onSliderInput(e) {
        const slider = e.target
        const val = parseFloat(slider.value)

        if (slider.classList.contains('x')) {
            this._value.x = val
        } else if (slider.classList.contains('y')) {
            this._value.y = val
        } else if (slider.classList.contains('z')) {
            this._value.z = val
        }

        if (this._normalized) {
            this._normalizeValue()
        }

        this._updateDisplay()
        this._updateGizmo()
        this._updateSliders()
        this._updateFormValue()
        this._emitInput()
    }

    _onSliderChange() {
        this._emitChange()
    }

    // ========================================================================
    // Input Field Interaction
    // ========================================================================

    _onInputKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault()
            this._applyInputValue(e.target)
            e.target.blur()
        } else if (e.key === 'Escape') {
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
        } else if (input.classList.contains('z-input')) {
            this._value.z = clampedVal
        }

        if (this._normalized) {
            this._normalizeValue()
        }

        this._updateDisplay()
        this._updateGizmo()
        this._updateSliders()
        this._updateFormValue()
        this._emitInput()
        this._emitChange()
    }

    // ========================================================================
    // Update Methods
    // ========================================================================

    _updateDisplay() {
        const xVal = this.querySelector('.x-value')
        const yVal = this.querySelector('.y-value')
        const zVal = this.querySelector('.z-value')
        const magDisplay = this.querySelector('.magnitude-display')

        if (xVal) xVal.textContent = this._formatValue(this._value.x)
        if (yVal) yVal.textContent = this._formatValue(this._value.y)
        if (zVal) zVal.textContent = this._formatValue(this._value.z)

        const magnitude = Math.sqrt(
            this._value.x ** 2 + this._value.y ** 2 + this._value.z ** 2
        )
        if (magDisplay) magDisplay.textContent = `|v| = ${magnitude.toFixed(2)}`
    }

    _updateGizmo() {
        const indicator = this.querySelector('.direction-indicator')
        const line = this.querySelector('.direction-line')
        const zDepthValue = this.querySelector('.z-depth-value')
        const gizmo = this.querySelector('.sphere-gizmo')

        if (!indicator || !gizmo) return

        const gizmoRect = { width: 180, height: 180 }
        const radius = gizmoRect.width / 2

        const mag = Math.sqrt(this._value.x ** 2 + this._value.y ** 2 + this._value.z ** 2)
        let nx = 0, ny = 0, nz = 0
        if (mag > 0) {
            nx = this._value.x / mag
            ny = this._value.y / mag
            nz = this._value.z / mag
        }

        const projX = nx * radius * 0.85 + radius
        const projY = -ny * radius * 0.85 + radius

        indicator.style.left = `${projX}px`
        indicator.style.top = `${projY}px`

        if (line) {
            const dx = projX - radius
            const dy = projY - radius
            const length = Math.sqrt(dx * dx + dy * dy)
            const angle = Math.atan2(dy, dx) * 180 / Math.PI
            line.style.width = `${length}px`
            line.style.transform = `rotate(${angle}deg)`
        }

        if (zDepthValue) {
            zDepthValue.textContent = this._formatValue(this._value.z)
        }

        const zFactor = (nz + 1) / 2
        const scale = 0.7 + zFactor * 0.6
        const opacity = 0.5 + zFactor * 0.5
        indicator.style.transform = `translate(-50%, -50%) scale(${scale})`
        indicator.style.opacity = opacity.toString()
    }

    _updateSliders() {
        const sliderX = this.querySelector('.axis-slider.x')
        const sliderY = this.querySelector('.axis-slider.y')
        const sliderZ = this.querySelector('.axis-slider.z')
        const inputX = this.querySelector('.x-input')
        const inputY = this.querySelector('.y-input')
        const inputZ = this.querySelector('.z-input')

        if (sliderX) sliderX.value = this._value.x
        if (sliderY) sliderY.value = this._value.y
        if (sliderZ) sliderZ.value = this._value.z

        if (inputX) inputX.value = this._formatValue(this._value.x)
        if (inputY) inputY.value = this._formatValue(this._value.y)
        if (inputZ) inputZ.value = this._formatValue(this._value.z)
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

    // ========================================================================
    // Utility Methods
    // ========================================================================

    _normalizeValue() {
        const mag = Math.sqrt(
            this._value.x ** 2 + this._value.y ** 2 + this._value.z ** 2
        )
        if (mag > 0) {
            this._value.x /= mag
            this._value.y /= mag
            this._value.z /= mag
        }
    }

    _roundToStep(value) {
        return Math.round(value / this._step) * this._step
    }

    _formatValue(val) {
        const rounded = this._roundToStep(val)
        if (Math.abs(rounded - Math.round(rounded)) < 0.0001) {
            return Math.round(rounded).toString()
        }
        return rounded.toFixed(2)
    }

    _setValueFromAttribute(str) {
        if (!str) return

        try {
            const parsed = JSON.parse(str)
            if (Array.isArray(parsed) && parsed.length >= 3) {
                this._value = { x: parsed[0], y: parsed[1], z: parsed[2] }
            } else if (parsed && typeof parsed === 'object') {
                this._value = {
                    x: parsed.x ?? 0,
                    y: parsed.y ?? 0,
                    z: parsed.z ?? 0
                }
            }
        } catch {
            const parts = str.split(',').map((p) => parseFloat(p.trim()))
            if (parts.length >= 3 && parts.every((p) => !isNaN(p))) {
                this._value = { x: parts[0], y: parts[1], z: parts[2] }
            }
        }

        this._updateDisplay()
        this._updateFormValue()
    }

    _updateFormValue() {
        if (this._internals) {
            const valueStr = JSON.stringify([this._value.x, this._value.y, this._value.z])
            this._internals.setFormValue(valueStr)
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
customElements.define('vector3d-picker', Vector3dPicker)

export { Vector3dPicker }
