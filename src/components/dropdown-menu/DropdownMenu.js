/**
 * Dropdown Menu Web Component
 * Provides a trigger button with dropdown menu functionality
 *
 * @module components/dropdown-menu/DropdownMenu
 *
 * @example
 * <dropdown-menu label="Options">
 *   <dropdown-item value="edit">Edit</dropdown-item>
 *   <dropdown-item value="delete" destructive>Delete</dropdown-item>
 * </dropdown-menu>
 *
 * @example With icon
 * <dropdown-menu label="Randomize" icon="casino">
 *   <dropdown-item value="random">Random</dropdown-item>
 *   <dropdown-item value="vibrant">Vibrant</dropdown-item>
 * </dropdown-menu>
 */

// Style injection for light DOM
const DROPDOWN_MENU_STYLES_ID = 'hf-dropdown-menu-styles'
if (!document.getElementById(DROPDOWN_MENU_STYLES_ID)) {
    const style = document.createElement('style')
    style.id = DROPDOWN_MENU_STYLES_ID
    style.textContent = `
        dropdown-menu {
            display: inline-block;
            position: relative;
        }

        dropdown-menu[disabled] {
            opacity: 0.5;
            pointer-events: none;
        }

        /* Trigger button */
        dropdown-menu .dropdown-trigger {
            all: unset;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: var(--hf-space-2, 0.5rem) var(--hf-space-3, 0.75rem);
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            line-height: 1.25;
            text-wrap: nowrap;
            font-family: var(--hf-font-family, 'Nunito', system-ui, sans-serif);
            color: var(--hf-text-normal);
            background: var(--hf-bg-elevated);
            border: 1px solid var(--hf-border-subtle);
            border-radius: var(--hf-radius-sm, 0.375rem);
            transition: background-color 0.15s ease, border-color 0.15s ease;
        }

        dropdown-menu .dropdown-trigger:hover,
        dropdown-menu .dropdown-trigger:focus {
            background: var(--hf-bg-muted);
            border-color: var(--hf-text-dim);
        }

        dropdown-menu .dropdown-trigger .material-symbols {
            font-size: 1.125rem;
        }

        /* Hide text on smaller screens */
        @media (max-width: 960px) {
            dropdown-menu[compact-mobile] .dropdown-trigger .trigger-text {
                display: none;
            }
        }

        /* The dropdown container */
        dropdown-menu .dropdown-content {
            position: absolute;
            top: 100%;
            left: 0;
            z-index: 100;
            min-width: 150px;
            padding: 0;
            margin-top: 2px;
            background: var(--hf-bg-surface);
            border: 1px solid var(--hf-border-subtle);
            border-radius: var(--hf-radius-sm, 0.375rem);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: none;
            overflow: hidden;
        }

        dropdown-menu .dropdown-content.show {
            display: block;
        }

        dropdown-menu .dropdown-content.align-right {
            left: auto;
            right: 0;
        }

        /* Items */
        dropdown-menu dropdown-item,
        dropdown-menu .dropdown-item {
            display: block;
            width: 100%;
            padding: 0.5rem 0.75rem;
            font-size: 0.8125rem;
            font-family: inherit;
            text-align: left;
            text-wrap: nowrap;
            color: var(--hf-text-normal);
            background: transparent;
            border: none;
            cursor: pointer;
            transition: background-color 0.15s ease, color 0.15s ease;
        }

        dropdown-menu dropdown-item:hover,
        dropdown-menu .dropdown-item:hover {
            background: var(--hf-bg-elevated);
            color: var(--hf-text-bright);
        }

        dropdown-menu dropdown-item:active,
        dropdown-menu .dropdown-item:active {
            background: var(--hf-bg-muted);
        }

        dropdown-menu dropdown-item[destructive] {
            color: var(--hf-red);
        }

        dropdown-menu dropdown-item[destructive]:hover {
            background: color-mix(in srgb, var(--hf-red) 15%, transparent);
        }

        /* Small variant */
        dropdown-menu[small] .dropdown-trigger {
            padding: var(--hf-space-1, 0.25rem) var(--hf-space-2, 0.5rem);
            font-size: 0.75rem;
            gap: 0.25rem;
        }

        dropdown-menu[small] .dropdown-trigger .material-symbols {
            font-size: 0.875rem;
        }

        dropdown-menu[small] .dropdown-content {
            min-width: 100px;
        }

        dropdown-menu[small] dropdown-item,
        dropdown-menu[small] .dropdown-item {
            padding: 0.375rem 0.5rem;
            font-size: 0.75rem;
        }

        /* Selectable mode - dropdown arrow indicator */
        dropdown-menu[selectable] .dropdown-trigger::after {
            content: '▾';
            font-size: 1rem;
            line-height: 0;
            color: var(--hf-text-dim);
            margin-left: 4px;
        }

        /* Selected item highlight in selectable mode */
        dropdown-menu[selectable] dropdown-item[selected],
        dropdown-menu[selectable] .dropdown-item[selected] {
            background: color-mix(in srgb, var(--hf-accent) 25%, transparent);
        }

        /* Divider */
        dropdown-menu .dropdown-divider {
            height: 1px;
            margin: 0.25rem 0;
            background: var(--hf-bg-muted);
        }
    `
    document.head.appendChild(style)
}

import { registerEscapeable, unregisterEscapeable } from '../../utils/escapeHandler.js'

// Track open menus for closing on outside click
const openMenus = new Set()

// Single global click handler (Escape is handled by escapeHandler.js)
if (!window._hfDropdownMenuGlobalHandler) {
    window._hfDropdownMenuGlobalHandler = true
    document.addEventListener('click', (e) => {
        openMenus.forEach(menu => {
            if (!menu.contains(e.target)) {
                menu.close()
            }
        })
    })
}

/**
 * Dropdown Menu web component
 * @extends HTMLElement
 *
 * @attribute {string} label - Button text
 * @attribute {string} icon - Material Symbols icon name
 * @attribute {boolean} disabled - Disables the dropdown
 * @attribute {boolean} compact-mobile - Hides text on mobile
 * @attribute {string} align - 'left' (default) or 'right'
 * @attribute {boolean} small - Use compact sizing
 * @attribute {boolean} selectable - Enable selection mode (tracks value, shows selected item)
 * @attribute {string} value - Currently selected value (only used with selectable)
 *
 * @fires {CustomEvent} change - Fired when an item is selected, detail contains { value, item }
 */
class DropdownMenu extends HTMLElement {
    static get observedAttributes() {
        return ['label', 'icon', 'disabled', 'align', 'value']
    }

    constructor() {
        super()
        this._rendered = false
        this._boundClose = this.close.bind(this)
        this._value = ''
    }

    connectedCallback() {
        if (!this._rendered) {
            this._render()
            this._setupEventListeners()
            this._rendered = true
        }

        // Initialize value from attribute if selectable
        if (this.hasAttribute('selectable') && this.hasAttribute('value')) {
            this._value = this.getAttribute('value')
            this._updateSelectedState()
        }
    }

    disconnectedCallback() {
        openMenus.delete(this)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this._rendered) return

        if (name === 'label') {
            const textEl = this.querySelector('.trigger-text')
            if (textEl) textEl.textContent = newValue || ''
        } else if (name === 'icon') {
            const iconEl = this.querySelector('.trigger-icon')
            if (iconEl) iconEl.textContent = newValue || ''
            if (iconEl) iconEl.style.display = newValue ? '' : 'none'
        } else if (name === 'disabled') {
            // Handled via CSS attribute selector
        } else if (name === 'align') {
            const content = this.querySelector('.dropdown-content')
            if (content) {
                content.classList.toggle('align-right', newValue === 'right')
            }
        } else if (name === 'value') {
            if (this.hasAttribute('selectable')) {
                this._value = newValue || ''
                this._updateSelectedState()
            }
        }
    }

    /**
     * Get/set the current value (for selectable mode)
     * @type {string}
     */
    get value() {
        return this._value
    }

    set value(val) {
        this._value = val
        this.setAttribute('value', val)
        this._updateSelectedState()
    }

    /**
     * Update selected state for selectable mode
     * @private
     */
    _updateSelectedState() {
        if (!this.hasAttribute('selectable')) return

        const items = this._getItems()
        let selectedText = ''

        items.forEach(item => {
            const itemValue = item.getAttribute('value') || item.dataset.value || item.textContent.trim()
            if (itemValue === this._value) {
                item.setAttribute('selected', '')
                selectedText = item.textContent.trim()
            } else {
                item.removeAttribute('selected')
            }
        })

        // Update trigger text to show selected item
        if (selectedText) {
            const textEl = this.querySelector('.trigger-text')
            if (textEl) textEl.textContent = selectedText
        }
    }

    _render() {
        const label = this.getAttribute('label') || ''
        const icon = this.getAttribute('icon') || ''
        const align = this.getAttribute('align')

        // Move existing children to the dropdown content
        const existingItems = Array.from(this.children)

        this.innerHTML = `
            <button class="dropdown-trigger" type="button">
                <span class="material-symbols trigger-icon" style="${icon ? '' : 'display:none'}">${icon}</span>
                <span class="trigger-text">${label}</span>
            </button>
            <div class="dropdown-content${align === 'right' ? ' align-right' : ''}"></div>
        `

        // Put items back
        const content = this.querySelector('.dropdown-content')
        existingItems.forEach(item => content.appendChild(item))
    }

    _setupEventListeners() {
        const trigger = this.querySelector('.dropdown-trigger')
        const content = this.querySelector('.dropdown-content')

        // Toggle on trigger click (but not if we just opened via keyboard)
        trigger.addEventListener('click', (e) => {
            e.stopPropagation()
            if (this._openedViaKeyboard) {
                this._openedViaKeyboard = false
                return
            }
            this.toggle()
        })

        // Handle item clicks
        content.addEventListener('click', (e) => {
            e.stopPropagation()
            e.preventDefault()
            const item = e.target.closest('dropdown-item, .dropdown-item')
            if (item) {
                const value = item.getAttribute('value') || item.dataset.value || item.textContent.trim()

                // Update value in selectable mode
                if (this.hasAttribute('selectable')) {
                    this._value = value
                    this.setAttribute('value', value)
                    this._updateSelectedState()
                }

                this.dispatchEvent(new CustomEvent('change', {
                    detail: { value, item },
                    bubbles: true
                }))
                this.close()
            }
        })

        // Keyboard navigation on trigger
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                this._openedViaKeyboard = true
                this.open()
                this._focusFirstItem()
            }
        })

        // Handle keydown on the component (bubbles up from items)
        this.addEventListener('keydown', (e) => {
            if (!this.isOpen) return
            if (!this.contains(document.activeElement)) return
            if (document.activeElement === trigger) return

            const items = this._getItems()
            const currentIndex = items.indexOf(document.activeElement)

            switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                if (currentIndex < items.length - 1) {
                    items[currentIndex + 1].focus()
                }
                break
            case 'ArrowUp':
                e.preventDefault()
                if (currentIndex > 0) {
                    items[currentIndex - 1].focus()
                }
                break
            case 'Enter':
            case ' ':
                e.preventDefault()
                if (document.activeElement?.closest('dropdown-item, .dropdown-item')) {
                    document.activeElement.click()
                }
                break
            }
        })
    }

    _getItems() {
        return Array.from(this.querySelectorAll('dropdown-item, .dropdown-item'))
    }

    _focusFirstItem() {
        const items = this._getItems()
        if (items.length > 0) {
            items[0].setAttribute('tabindex', '0')
            items[0].focus()
        }
    }

    /**
     * Open the dropdown menu
     */
    open() {
        const content = this.querySelector('.dropdown-content')
        content.classList.add('show')
        openMenus.add(this)
        registerEscapeable(this, () => this.close())
    }

    /**
     * Close the dropdown menu
     */
    close() {
        const content = this.querySelector('.dropdown-content')
        content?.classList.remove('show')
        openMenus.delete(this)
        unregisterEscapeable(this)
    }

    /**
     * Toggle the dropdown menu
     */
    toggle() {
        const content = this.querySelector('.dropdown-content')
        if (content.classList.contains('show')) {
            this.close()
        } else {
            // Close other open menus
            openMenus.forEach(menu => {
                if (menu !== this) menu.close()
            })
            this.open()
        }
    }

    /**
     * Check if the dropdown is open
     * @returns {boolean}
     */
    get isOpen() {
        return this.querySelector('.dropdown-content')?.classList.contains('show') || false
    }

    /**
     * Set items programmatically
     * @param {Array<{value: string, label: string, destructive?: boolean}>} items
     */
    setItems(items) {
        const content = this.querySelector('.dropdown-content')
        content.innerHTML = items.map(item =>
            `<dropdown-item value="${item.value}"${item.destructive ? ' destructive' : ''}>${item.label}</dropdown-item>`
        ).join('')
    }

    /**
     * Add a single item
     * @param {string} value
     * @param {string} label
     * @param {Object} [options]
     * @param {boolean} [options.destructive]
     */
    addItem(value, label, options = {}) {
        const content = this.querySelector('.dropdown-content')
        const item = document.createElement('dropdown-item')
        item.setAttribute('value', value)
        item.textContent = label
        if (options.destructive) {
            item.setAttribute('destructive', '')
        }
        content.appendChild(item)
    }

    /**
     * Clear all items
     */
    clearItems() {
        const content = this.querySelector('.dropdown-content')
        content.innerHTML = ''
    }
}

/**
 * Dropdown Item element (simple, no special behavior needed)
 * Used for semantic markup within dropdown-menu
 */
class DropdownItem extends HTMLElement {
    constructor() {
        super()
        this.setAttribute('tabindex', '-1')
        this.setAttribute('role', 'menuitem')
    }
}

// Register components
customElements.define('dropdown-menu', DropdownMenu)
customElements.define('dropdown-item', DropdownItem)

export { DropdownMenu, DropdownItem }
