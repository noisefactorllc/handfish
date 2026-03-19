/**
 * Select Dropdown Web Component
 *
 * A general-purpose dropdown to replace native <select> elements.
 * Uses inline dropdown for < 6 options, dialog mode for >= 6 options.
 *
 * @module components/select-dropdown/SelectDropdown
 */

// Track the currently open dialog globally
let currentOpenDialog = null

// Style injection for light DOM
const SELECT_DROPDOWN_STYLES_ID = 'hf-select-dropdown-styles'
if (!document.getElementById(SELECT_DROPDOWN_STYLES_ID)) {
    const style = document.createElement('style')
    style.id = SELECT_DROPDOWN_STYLES_ID
    style.textContent = `
        select-dropdown {
            display: inline-block;
            position: relative;
            font-family: var(--hf-font-family);
            min-width: 5em;
        }

        select-dropdown[disabled] {
            opacity: 0.5;
            pointer-events: none;
        }

        /* When dropdown is open, create stacking context above siblings */
        select-dropdown.dropdown-open {
            z-index: 10000;
        }

        /* Trigger button */
        select-dropdown .select-trigger {
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
            font-family: var(--hf-font-family);
            color: var(--hf-text-normal, #d9deeb);
            background: var(--hf-bg-elevated, #1b2538);
            border: var(--hf-border-width) solid var(--hf-border-subtle);
            border-radius: var(--hf-radius-sm, 0.25rem);
        }

        select-dropdown .select-trigger:hover {
            background: var(--hf-bg-muted);
        }

        select-dropdown .select-trigger:focus-visible {
            outline: var(--hf-focus-ring-width) solid var(--hf-focus-ring-color);
            outline-offset: var(--hf-focus-ring-offset);
        }

        select-dropdown .trigger-text {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        select-dropdown .trigger-arrow {
            font-size: 0.5rem;
            color: var(--hf-text-dim, #98a7c8);
            flex-shrink: 0;
            margin-left: auto;
            transition: transform 0.15s ease;
        }

        select-dropdown.dropdown-open .trigger-arrow {
            transform: rotate(180deg);
        }

        /* Inline dropdown (< 6 options) */
        select-dropdown .inline-dropdown {
            display: none;
            position: absolute;
            left: 0;
            right: 0;
            z-index: 10000;
            min-width: 100px;
            background: color-mix(
                in srgb,
                var(--hf-bg-surface, #1a1f2e) 95%,
                transparent 5%
            );
            backdrop-filter: var(--hf-glass-blur, blur(12px));
            border: var(--hf-border-width) solid color-mix(in srgb, var(--hf-accent, #4a5568) 30%, transparent 70%);
            border-radius: var(--hf-radius-sm, 0.25rem);
            box-shadow: var(--hf-shadow-md, 0 4px 8px rgba(0, 0, 0, 0.2));
            overflow: hidden;
            max-height: 200px;
            overflow-y: auto;
        }

        select-dropdown .inline-dropdown.open {
            display: block;
        }

        select-dropdown .inline-dropdown.position-below {
            top: 100%;
            margin-top: 2px;
        }

        select-dropdown .inline-dropdown.position-above {
            bottom: 100%;
            margin-bottom: 2px;
        }

        select-dropdown .inline-dropdown .group-header {
            padding: 0.375rem 0.5rem 0.2rem;
            font-size: var(--hf-size-sm, 0.75rem);
            font-weight: 700;
            opacity: 0.5;
            letter-spacing: 0.05em;
        }

        select-dropdown .inline-dropdown .option {
            padding: 0.375rem 0.5rem;
            cursor: pointer;
            transition: background 0.1s ease;
            font-size: var(--hf-size-sm, 0.75rem);
            color: var(--hf-text-normal, #d9deeb);
        }

        select-dropdown .inline-dropdown .option:hover,
        select-dropdown .inline-dropdown .option.focused {
            background: color-mix(in srgb, var(--hf-accent, #a5b8ff) 25%, transparent 75%);
        }

        select-dropdown .inline-dropdown .option.selected {
            background: color-mix(in srgb, var(--hf-accent, #a5b8ff) 35%, transparent 65%);
        }

        /* Dialog mode (>= 6 options) */
        select-dropdown .select-dialog {
            background: color-mix(
                in srgb,
                var(--hf-bg-surface, #101522) 92%,
                transparent 8%
            );
            backdrop-filter: var(--hf-glass-blur, blur(20px));
            border: none;
            border-radius: var(--hf-radius, 0.5rem);
            padding: 0;
            color: var(--hf-text-normal, #d9deeb);
            box-shadow: var(--hf-shadow-xl, 0 16px 32px rgba(0, 0, 0, 0.3));
            min-width: 200px;
            max-width: 400px;
            overflow: hidden;
        }

        select-dropdown .select-dialog::backdrop {
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: var(--hf-glass-blur-sm, blur(4px));
        }

        select-dropdown .dialog-titlebar {
            background-color: var(--hf-titlebar-bg, var(--hf-bg-elevated, #262e3f));
            border-bottom: none;
            padding: 0 0.5em;
            min-height: 2.25em;
            height: 2.25em;
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--hf-text-normal, #d9deeb);
            text-transform: lowercase;
            letter-spacing: 0.05em;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 0.5em;
            border-radius: var(--hf-radius, 0.5rem) var(--hf-radius, 0.5rem) 0 0;
        }

        select-dropdown .dialog-title {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        select-dropdown .dialog-close {
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

        select-dropdown .dialog-close:hover {
            opacity: 1;
            color: var(--hf-text-normal, #d9deeb);
        }

        select-dropdown .dialog-body {
            max-height: 300px;
            overflow: hidden;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
        }

        select-dropdown .dialog-options {
            outline: none;
            overflow-x: hidden;
            overflow-y: auto;
            flex: 1;
        }

        select-dropdown .dialog-options .option {
            padding: 0.375rem 0.5rem;
            cursor: pointer;
            transition: background 0.1s ease;
            border-bottom: var(--hf-border-width) solid color-mix(in srgb, var(--hf-accent, #a5b8ff) 8%, transparent 92%);
            font-size: var(--hf-size-base, 0.875rem);
        }

        select-dropdown .dialog-options .option:last-child {
            border-bottom: none;
        }

        select-dropdown .dialog-options .group-header {
            padding: 0.375rem 0.5rem 0.2rem;
            font-size: var(--hf-size-sm, 0.75rem);
            font-weight: 700;
            opacity: 0.5;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        select-dropdown .dialog-options .option:hover,
        select-dropdown .dialog-options .option.focused {
            background: color-mix(in srgb, var(--hf-accent, #a5b8ff) 20%, transparent 80%);
        }

        select-dropdown .dialog-options .option.selected {
            background: color-mix(in srgb, var(--hf-accent, #a5b8ff) 30%, transparent 70%);
        }

        select-dropdown .empty-message {
            padding: 0.5rem;
            font-size: var(--hf-size-xs, 0.625rem);
            font-style: italic;
            color: var(--hf-text-dim, #98a7c8);
            text-align: center;
        }

        /* Scrollbar styling */
        select-dropdown .inline-dropdown::-webkit-scrollbar,
        select-dropdown .dialog-options::-webkit-scrollbar {
            width: 0.3rem;
        }

        select-dropdown .inline-dropdown::-webkit-scrollbar-track,
        select-dropdown .dialog-options::-webkit-scrollbar-track {
            background: transparent;
        }

        select-dropdown .inline-dropdown::-webkit-scrollbar-thumb,
        select-dropdown .dialog-options::-webkit-scrollbar-thumb {
            background: color-mix(in srgb, var(--hf-accent, #a5b8ff) 30%, transparent 70%);
            border-radius: 0.2rem;
        }

        select-dropdown .inline-dropdown::-webkit-scrollbar-thumb:hover,
        select-dropdown .dialog-options::-webkit-scrollbar-thumb:hover {
            background: color-mix(in srgb, var(--hf-accent, #a5b8ff) 50%, transparent 50%);
        }

        select-dropdown .inline-dropdown,
        select-dropdown .dialog-options {
            scrollbar-width: thin;
            scrollbar-color: color-mix(in srgb, var(--hf-accent, #a5b8ff) 30%, transparent 70%) transparent;
        }
    `
    document.head.appendChild(style)
}

/**
 * SelectDropdown - Web component for general dropdown selection
 * @extends HTMLElement
 */
class SelectDropdown extends HTMLElement {
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

        /** @type {Array<{value: string, text: string}>} */
        this._options = []

        /** @type {string} */
        this._value = ''

        /** @type {boolean} */
        this._isOpen = false

        /** @type {number} */
        this._focusedIndex = -1

        /** @type {string} */
        this._searchString = ''

        /** @type {number|null} */
        this._searchTimeout = null

        /** @type {number} */
        this._lastSearchTime = 0

        /** @type {boolean} */
        this._rendered = false

        /** @type {boolean} */
        this._listenersAttached = false
    }

    connectedCallback() {
        // Parse <option> children before rendering (they get replaced by _render)
        if (this._options.length === 0) {
            this._parseOptionChildren()
        }

        if (!this._rendered) {
            this._render()
            this._rendered = true
        }
        if (!this._listenersAttached) {
            this._setupEventListeners()
            this._listenersAttached = true
        }
        if (this._options.length > 0) {
            this._renderDropdown()
        }
        this._updateDisplay()
        this._updateFormValue()
    }

    disconnectedCallback() {
        if (this._searchTimeout) {
            clearTimeout(this._searchTimeout)
        }
        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler)
        }
        this._close()
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return

        switch (name) {
            case 'value':
                this._value = newValue || ''
                this._updateDisplay()
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

    /** @returns {string} Current selected value */
    get value() {
        return this._value
    }

    /** @param {string} val - Value to select */
    set value(val) {
        const strVal = String(val ?? '')
        if (this._value === strVal) return

        this._value = strVal
        this.setAttribute('value', this._value)
        this._updateDisplay()
        this._updateFormValue()
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

    /** @returns {number} Selected index */
    get selectedIndex() {
        return this._options.findIndex(o => o.value === this._value)
    }

    /** @param {number} idx - Index to select */
    set selectedIndex(idx) {
        if (idx >= 0 && idx < this._options.length) {
            this.value = this._options[idx].value
        }
    }

    /**
     * Set the dropdown options
     * @param {Array<{value: string, text: string}>} options
     */
    setOptions(options) {
        this._options = options || []
        if (this._rendered) {
            this._renderDropdown()
            this._updateDisplay()
        }
    }

    /**
     * Get the dropdown options
     * @returns {Array<{value: string, text: string}>}
     */
    getOptions() {
        return this._options.slice()
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    /**
     * Parse <option> child elements to populate options array
     * This allows declarative usage: <select-dropdown><option value="a">A</option></select-dropdown>
     * @private
     */
    _parseOptionChildren() {
        const optionElements = this.querySelectorAll('option')
        if (optionElements.length > 0) {
            this._options = Array.from(optionElements).map(opt => ({
                value: opt.value || opt.textContent.trim(),
                text: opt.textContent.trim()
            }))
            // If no value attribute is set, use the first option's value
            if (!this._value && this._options.length > 0) {
                const valueAttr = this.getAttribute('value')
                if (valueAttr) {
                    this._value = valueAttr
                }
            }
        }
    }

    _render() {
        this.innerHTML = `
            <button class="select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
                <span class="trigger-text">Select...</span>
                <span class="trigger-arrow">▼</span>
            </button>
            <div class="inline-dropdown" role="listbox" tabindex="-1"></div>
            <dialog class="select-dialog" aria-label="select option">
                <div class="dialog-titlebar">
                    <span class="dialog-title">select</span>
                    <button class="dialog-close" type="button" aria-label="close">✕</button>
                </div>
                <div class="dialog-body">
                    <div class="dialog-options" role="listbox" tabindex="-1"></div>
                </div>
            </dialog>
        `
    }

    _setupEventListeners() {
        const trigger = this.querySelector('.select-trigger')
        const dialog = this.querySelector('.select-dialog')
        const inlineDropdown = this.querySelector('.inline-dropdown')
        const dialogOptions = this.querySelector('.dialog-options')
        const closeBtn = this.querySelector('.dialog-close')

        if (!trigger || !dialog || !inlineDropdown || !dialogOptions) return

        trigger.addEventListener('click', (e) => {
            e.stopPropagation()
            if (this.disabled) return
            this._toggle()
        })

        inlineDropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.option')
            if (option) {
                this._selectOption(option.dataset.value)
            }
        })

        dialogOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.option')
            if (option) {
                this._selectOption(option.dataset.value)
            }
        })

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this._close())
        }

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                this._close()
            }
        })

        dialog.addEventListener('cancel', (e) => {
            e.preventDefault()
            this._close()
        })

        dialog.addEventListener('close', () => {
            this._onClosed()
        })

        this._documentClickHandler = (e) => {
            if (this._isOpen && this._useInlineMode() && !this.contains(e.target)) {
                this._close()
            }
        }
        document.addEventListener('click', this._documentClickHandler)

        trigger.addEventListener('keydown', (e) => this._handleKeydown(e))
        inlineDropdown.addEventListener('keydown', (e) => this._handleKeydown(e))
        dialog.addEventListener('keydown', (e) => this._handleKeydown(e))
    }

    _useInlineMode() {
        return this._options.length < 60
    }

    _getOptionsContainer() {
        if (this._useInlineMode()) {
            return this.querySelector('.inline-dropdown')
        } else {
            return this.querySelector('.dialog-options')
        }
    }

    _renderDropdown() {
        const inlineDropdown = this.querySelector('.inline-dropdown')
        const dialogOptions = this.querySelector('.dialog-options');

        [inlineDropdown, dialogOptions].forEach(container => {
            if (!container) return

            container.innerHTML = ''

            if (this._options.length === 0) {
                const emptyMsg = document.createElement('div')
                emptyMsg.className = 'empty-message'
                emptyMsg.textContent = 'no options available'
                container.appendChild(emptyMsg)
                return
            }

            let lastCategory = null
            this._options.forEach((opt) => {
                if (opt.category && opt.category !== lastCategory) {
                    lastCategory = opt.category
                    const header = document.createElement('div')
                    header.className = 'group-header'
                    header.textContent = opt.category
                    container.appendChild(header)
                }
                const option = document.createElement('div')
                option.className = 'option'
                option.dataset.value = opt.value
                option.setAttribute('role', 'option')
                option.textContent = opt.text
                container.appendChild(option)
            })
        })

        this._updateSelectedOption()
    }

    _updateDisplay() {
        const triggerText = this.querySelector('.trigger-text')
        if (!triggerText) return

        const selected = this._options.find(o => o.value === this._value)
        triggerText.textContent = selected ? selected.text : (this._value || 'Select...')

        this._updateSelectedOption()
    }

    _updateSelectedOption() {
        const containers = [
            this.querySelector('.inline-dropdown'),
            this.querySelector('.dialog-options')
        ]

        containers.forEach(container => {
            if (!container) return
            container.querySelectorAll('.option').forEach(option => {
                option.classList.toggle('selected', option.dataset.value === this._value)
            })
        })
    }

    _handleKeydown(e) {
        switch (e.key) {
            case 'Enter':
                e.preventDefault()
                if (this._isOpen) {
                    if (this._focusedIndex >= 0 && this._focusedIndex < this._options.length) {
                        this._selectOption(this._options[this._focusedIndex].value)
                    } else {
                        this._close()
                    }
                } else {
                    this._open()
                }
                break
            case ' ':
                e.preventDefault()
                if (!this._isOpen) {
                    this._open()
                }
                break
            case 'ArrowDown':
                e.preventDefault()
                if (this._isOpen) {
                    this._moveFocus(1)
                } else {
                    this._moveSelection(1)
                }
                break
            case 'ArrowUp':
                e.preventDefault()
                if (this._isOpen) {
                    this._moveFocus(-1)
                } else {
                    this._moveSelection(-1)
                }
                break
            case 'Escape':
                this._close()
                break
            case 'Home':
                e.preventDefault()
                if (this._options.length > 0) {
                    if (this._isOpen) {
                        this._focusedIndex = 0
                        this._updateFocusedOption()
                    } else {
                        this._selectOption(this._options[0].value)
                    }
                }
                break
            case 'End':
                e.preventDefault()
                if (this._options.length > 0) {
                    if (this._isOpen) {
                        this._focusedIndex = this._options.length - 1
                        this._updateFocusedOption()
                    } else {
                        this._selectOption(this._options[this._options.length - 1].value)
                    }
                }
                break
            default:
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault()
                    this._handleTypeAhead(e.key)
                }
        }
    }

    _toggle() {
        if (this._isOpen) {
            this._close()
        } else {
            this._open()
        }
    }

    _open() {
        const trigger = this.querySelector('.select-trigger')

        if (currentOpenDialog && currentOpenDialog !== this) {
            currentOpenDialog._close()
        }

        currentOpenDialog = this
        this._isOpen = true
        this.classList.add('dropdown-open')
        trigger?.setAttribute('aria-expanded', 'true')

        const selectedIdx = this._options.findIndex(o => o.value === this._value)
        this._focusedIndex = selectedIdx >= 0 ? selectedIdx : 0

        if (this._useInlineMode()) {
            this._openInlineDropdown()
        } else {
            this._openDialog()
        }
    }

    _openInlineDropdown() {
        const inlineDropdown = this.querySelector('.inline-dropdown')
        const trigger = this.querySelector('.select-trigger')
        if (!inlineDropdown || !trigger) return

        const triggerRect = trigger.getBoundingClientRect()
        const spaceBelow = window.innerHeight - triggerRect.bottom
        const spaceAbove = triggerRect.top

        const estimatedHeight = Math.min(this._options.length * 28 + 8, 200)

        inlineDropdown.classList.remove('position-above', 'position-below')
        if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
            inlineDropdown.classList.add('position-above')
        } else {
            inlineDropdown.classList.add('position-below')
        }

        inlineDropdown.classList.add('open')
        this._updateFocusedOption()
        inlineDropdown.focus()

        const selected = inlineDropdown.querySelector('.option.selected')
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' })
        }
    }

    _openDialog() {
        const dialog = this.querySelector('.select-dialog')
        if (!dialog) return

        this._updateDialogTitle()

        if (!dialog.open) {
            const openAncestorDialog = this.closest('dialog[open]')
            if (openAncestorDialog) {
                dialog.show()
            } else {
                dialog.showModal()
            }
        }

        this._updateFocusedOption()

        const dialogOptions = this.querySelector('.dialog-options')
        const selected = dialogOptions?.querySelector('.option.selected')
        if (selected) {
            selected.scrollIntoView({ block: 'center' })
        }

        dialogOptions?.focus()
    }

    _close() {
        if (this._useInlineMode()) {
            this._closeInlineDropdown()
        } else {
            this._closeDialog()
        }
    }

    _closeInlineDropdown() {
        const inlineDropdown = this.querySelector('.inline-dropdown')
        inlineDropdown?.classList.remove('open')
        this._onClosed()
    }

    _closeDialog() {
        const dialog = this.querySelector('.select-dialog')
        if (dialog?.open) {
            dialog.close()
        } else {
            this._onClosed()
        }
    }

    _onClosed() {
        const trigger = this.querySelector('.select-trigger')
        this._isOpen = false
        this._focusedIndex = -1
        this.classList.remove('dropdown-open')
        this._clearFocus()

        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false')
            trigger.focus()
        }

        if (currentOpenDialog === this) {
            currentOpenDialog = null
        }
    }

    _updateDialogTitle() {
        const titleEl = this.querySelector('.dialog-title')
        if (!titleEl) return

        const controlGroup = this.closest('.control-group')
        const labelEl = controlGroup?.querySelector('.control-label')
        const paramName = labelEl?.textContent?.trim() || ''

        const shaderEffect = this.closest('.shader-effect')
        const effectName = shaderEffect?.dataset?.effectName || ''

        let title = 'select'
        if (effectName && paramName) {
            title = `${effectName}: ${paramName}`
        } else if (effectName) {
            title = effectName
        } else if (paramName) {
            title = paramName
        }

        titleEl.textContent = title
    }

    _selectOption(value) {
        const oldVal = this._value
        this._value = value
        this.setAttribute('value', value)
        this._updateDisplay()
        this._updateFormValue()
        this._close()

        if (oldVal !== value) {
            this.dispatchEvent(new Event('change', { bubbles: true }))
        }
    }

    _moveFocus(offset) {
        if (this._options.length === 0) return

        this._focusedIndex += offset
        if (this._focusedIndex < 0) {
            this._focusedIndex = this._options.length - 1
        }
        if (this._focusedIndex >= this._options.length) {
            this._focusedIndex = 0
        }
        this._updateFocusedOption()
    }

    _moveSelection(offset) {
        if (this._options.length === 0) return

        let currentIdx = this._options.findIndex(o => o.value === this._value)
        if (currentIdx === -1) currentIdx = offset > 0 ? -1 : this._options.length
        let newIdx = currentIdx + offset

        if (newIdx < 0) newIdx = this._options.length - 1
        if (newIdx >= this._options.length) newIdx = 0

        const oldVal = this._value
        this._value = this._options[newIdx].value
        this.setAttribute('value', this._value)
        this._updateDisplay()
        this._updateFormValue()

        if (this._isOpen) {
            this._focusedIndex = newIdx
            this._updateFocusedOption()
        }

        if (oldVal !== this._value) {
            this.dispatchEvent(new Event('change', { bubbles: true }))
        }
    }

    _updateFocusedOption() {
        this._clearFocus()

        if (this._focusedIndex >= 0 && this._focusedIndex < this._options.length) {
            const value = this._options[this._focusedIndex].value
            const container = this._getOptionsContainer()
            const option = container?.querySelector(`.option[data-value="${CSS.escape(value)}"]`)
            if (option) {
                option.classList.add('focused')
                option.scrollIntoView({ block: 'nearest' })
            }
        }
    }

    _clearFocus() {
        const containers = [
            this.querySelector('.inline-dropdown'),
            this.querySelector('.dialog-options')
        ]
        containers.forEach(container => {
            container?.querySelectorAll('.option.focused').forEach(o => o.classList.remove('focused'))
        })
    }

    _handleTypeAhead(char) {
        const now = Date.now()
        const timeSinceLastKey = now - this._lastSearchTime
        this._lastSearchTime = now

        if (this._searchTimeout) {
            clearTimeout(this._searchTimeout)
        }

        if (timeSinceLastKey > 500) {
            this._searchString = ''
        }

        this._searchString += char.toLowerCase()

        this._searchTimeout = setTimeout(() => {
            this._searchString = ''
        }, 1000)

        const matches = this._options
            .map((o, idx) => ({ ...o, idx, lowerText: (o.text || '').toLowerCase() }))
            .filter(o => o.lowerText.startsWith(this._searchString))

        if (matches.length > 0) {
            const matchIdx = matches[0].idx
            if (this._isOpen) {
                this._focusedIndex = matchIdx
                this._updateFocusedOption()
            } else {
                this._selectOption(this._options[matchIdx].value)
            }
        }
    }

    _updateDisabledState() {
        const trigger = this.querySelector('.select-trigger')
        if (trigger) {
            trigger.disabled = this.disabled
        }
        if (this.disabled) {
            this._close()
        }
    }

    _updateFormValue() {
        if (this._internals) {
            this._internals.setFormValue(this._value)
        }
    }
}

// Register the custom element
customElements.define('select-dropdown', SelectDropdown)

export { SelectDropdown }
