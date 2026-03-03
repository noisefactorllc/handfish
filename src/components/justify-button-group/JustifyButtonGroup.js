/**
 * Justify Button Group Web Component
 *
 * A connected button group for text justification (left, center, right).
 * Uses Material Symbols icons and supports single-selection behavior.
 *
 * @module components/justify-button-group/JustifyButtonGroup
 */

// Inject styles once into document head
const JUSTIFY_BUTTON_GROUP_STYLES_ID = 'hf-justify-button-group-styles'
if (!document.getElementById(JUSTIFY_BUTTON_GROUP_STYLES_ID)) {
    const styleEl = document.createElement('style')
    styleEl.id = JUSTIFY_BUTTON_GROUP_STYLES_ID
    styleEl.textContent = `
        justify-button-group {
            display: inline-block;
        }

        justify-button-group .button-group {
            display: inline-flex;
            border-radius: var(--hf-radius-sm, 0.375rem);
            overflow: hidden;
            background: var(--hf-bg-surface, #333);
            border: 1px solid var(--hf-bg-elevated, #444);
        }

        justify-button-group .justify-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 1.25rem;
            height: 1.25rem;
            padding: 0;
            border: none;
            background: transparent;
            color: var(--hf-text-dim, #888);
            cursor: pointer;
            transition: background 0.15s, color 0.15s;
        }

        justify-button-group .justify-btn:hover:not(:disabled):not(.selected) {
            background: var(--hf-bg-elevated, #444);
            color: var(--hf-text-normal, #ccc);
        }

        justify-button-group .justify-btn.selected {
            background: var(--hf-accent, #0066cc);
            color: var(--hf-text-normal, #fff);
        }

        justify-button-group .justify-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        /* Remove internal borders, only outer group has border-radius */
        justify-button-group .justify-btn:not(:last-child) {
            border-right: 1px solid var(--hf-bg-elevated, #444);
        }

        justify-button-group .material-symbols {
            font-family: 'Material Symbols Outlined';
            font-weight: normal;
            font-style: normal;
            font-size: 0.875rem;
            line-height: 1;
            letter-spacing: normal;
            text-transform: none;
            display: inline-block;
            white-space: nowrap;
            word-wrap: normal;
            direction: ltr;
            -webkit-font-feature-settings: 'liga';
            font-feature-settings: 'liga';
            -webkit-font-smoothing: antialiased;
        }
    `
    document.head.appendChild(styleEl)
}

/**
 * JustifyButtonGroup - Web component for text alignment selection
 * @extends HTMLElement
 */
class JustifyButtonGroup extends HTMLElement {
    static formAssociated = true

    static get observedAttributes() {
        return ['value', 'disabled', 'name']
    }

    constructor() {
        super()

        // Form association
        if (this.constructor.formAssociated) {
            this._internals = this.attachInternals?.()
        }

        /** @type {'left'|'center'|'right'} */
        this._value = 'center'

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
        this._updateSelection()
        this._updateFormValue()
    }

    disconnectedCallback() {
        // Cleanup if needed
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return

        switch (name) {
            case 'value':
                this._value = newValue || 'center'
                this._updateSelection()
                this._updateFormValue()
                break
            case 'disabled':
                this._updateDisabledState()
                break
        }
    }

    // ========================================================================
    // Public API
    // ========================================================================

    /** @returns {'left'|'center'|'right'} Current value */
    get value() {
        return this._value
    }

    /** @param {'left'|'center'|'right'} val */
    set value(val) {
        if (val === this._value) return
        if (!['left', 'center', 'right'].includes(val)) return
        this._value = val
        this._updateSelection()
        this._updateFormValue()
    }

    /** @returns {string} */
    get name() {
        return this.getAttribute('name') || ''
    }

    /** @param {string} val */
    set name(val) {
        this.setAttribute('name', val)
    }

    /** @returns {boolean} */
    get disabled() {
        return this.hasAttribute('disabled')
    }

    /** @param {boolean} val */
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
            <div class="button-group">
                <button type="button" class="justify-btn" data-value="left" title="Align left">
                    <span class="material-symbols">format_align_left</span>
                </button>
                <button type="button" class="justify-btn" data-value="center" title="Align center">
                    <span class="material-symbols">format_align_center</span>
                </button>
                <button type="button" class="justify-btn" data-value="right" title="Align right">
                    <span class="material-symbols">format_align_right</span>
                </button>
            </div>
        `
    }

    _setupEventListeners() {
        const buttons = this.querySelectorAll('.justify-btn')
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.disabled) return
                const newValue = btn.dataset.value
                if (newValue !== this._value) {
                    this._value = newValue
                    this._updateSelection()
                    this._updateFormValue()
                    this.dispatchEvent(new Event('change', { bubbles: true }))
                    this.dispatchEvent(new CustomEvent('input', {
                        bubbles: true,
                        detail: { value: this._value }
                    }))
                }
            })
        })
    }

    _updateSelection() {
        const buttons = this.querySelectorAll('.justify-btn')
        buttons.forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.value === this._value)
        })
    }

    _updateDisabledState() {
        const buttons = this.querySelectorAll('.justify-btn')
        const isDisabled = this.disabled
        buttons.forEach(btn => {
            btn.disabled = isDisabled
        })
    }

    _updateFormValue() {
        if (this._internals) {
            this._internals.setFormValue(this._value)
        }
    }
}

// Register the custom element
if (!customElements.get('justify-button-group')) {
    customElements.define('justify-button-group', JustifyButtonGroup)
}

export { JustifyButtonGroup }
