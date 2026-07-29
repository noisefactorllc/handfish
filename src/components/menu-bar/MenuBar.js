import { registerEscapeable, unregisterEscapeable } from '../../utils/escapeHandler.js'

// Inject styles once. Panels and items reuse the .hf-menu* classes from
// src/styles/menus-and-toolbars.css (required stylesheet, same contract as
// <tempo-bar>); this block only covers menu-bar-specific chrome.
const MENU_BAR_STYLES_ID = 'hf-menu-bar-styles'
if (typeof document !== 'undefined' && !document.getElementById(MENU_BAR_STYLES_ID)) {
    const style = document.createElement('style')
    style.id = MENU_BAR_STYLES_ID
    style.textContent = `
menu-bar {
    display: block;
}

.hf-menubar {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    height: var(--hf-titlebar-height, 2.25rem);
    font-family: var(--hf-font-family);
    font-size: 16px;
    font-weight: var(--hf-weight-bold, 700);
    color: var(--hf-text-normal);
}

.hf-menubar-backdrop {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    border-radius: inherit;
    background:
        linear-gradient(180deg,
            color-mix(in srgb, var(--hf-color-2) 86%, white 14%) 0%,
            var(--hf-color-2) 55%,
            color-mix(in srgb, var(--hf-color-2) 72%, black 28%) 100%);
    opacity: var(--hf-panel-opacity, 85%);
    backdrop-filter: var(--hf-glass-blur, blur(20px));
    -webkit-backdrop-filter: var(--hf-glass-blur, blur(20px));
}

.hf-menubar-region {
    display: flex;
    align-items: center;
    height: 100%;
    min-width: 0;
}

.hf-menubar-left {
    gap: 1.5em;
    padding-inline-start: 1em;
}

.hf-menubar-center {
    justify-content: center;
    overflow: hidden;
}

.hf-menubar-right {
    justify-content: flex-end;
    gap: 1em;
    padding-inline-end: 1em;
}

.hf-menubar-menu {
    position: relative;
    height: 100%;
    display: flex;
    align-items: center;
}

.hf-menubar-trigger {
    display: flex;
    align-items: center;
    gap: 0.25em;
    height: 100%;
    padding: 0 0.125em;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.875em;
    font-weight: inherit;
    color: var(--hf-accent-3);
    transition: color var(--hf-transition-fast, 0.15s);
}

.hf-menubar-trigger:hover,
.hf-menubar-trigger[aria-expanded="true"] {
    color: var(--hf-accent-4);
}

.hf-menubar-trigger:focus-visible {
    outline: var(--hf-focus-ring-width, 2px) solid var(--hf-focus-ring-color, var(--hf-accent-2));
    outline-offset: var(--hf-focus-ring-offset, 2px);
}

.hf-menubar-trigger svg {
    display: block;
}

.hf-menubar-panel {
    position: absolute;
    top: calc(100% + 4px);
    min-width: 200px;
    width: max-content;
    white-space: nowrap;
    max-height: calc(100vh - var(--hf-titlebar-height, 2.25rem) - 8px);
    overflow-y: auto;
}

.hf-menubar-panel[hidden] {
    display: none;
}

.hf-menubar-panel-left { left: -10px; }
.hf-menubar-panel-right { right: 0; }
.hf-menubar-panel-start { inset-inline-start: -10px; }
.hf-menubar-panel-end { inset-inline-end: 0; }

.hf-menubar-item-label {
    flex: 1 1 auto;
    text-align: start;
}

/* .hf-menu-item / .hf-menu set their own display; keep [hidden] authoritative */
.hf-menubar .hf-menu-item[hidden],
.hf-menubar .hf-menu-separator[hidden],
.hf-menubar .hf-menu-header[hidden] {
    display: none;
}

.hf-menubar-submenu-holder {
    position: relative;
    display: block;
}

.hf-menubar-btn {
    font-size: 1.2em;
    padding: 0.18em 0.32em;
}

.hf-menubar-btn .hf-icon {
    font-size: 20px;
}

.hf-menubar-btn[hidden] {
    display: none;
}

.hf-menubar-btn.active {
    color: var(--hf-accent-4);
    background: color-mix(in srgb, var(--hf-accent-4) 12%, transparent);
}

.hf-menubar-vseparator {
    width: 1px;
    align-self: stretch;
    margin: 0.45em 0;
    background: var(--hf-border-subtle);
}

.hf-menubar-segmented {
    display: flex;
    align-items: center;
    border: 1px solid var(--hf-border-subtle);
    border-radius: var(--hf-radius-sm, 0.25rem);
    overflow: hidden;
}

.hf-menubar-segmented[hidden] {
    display: none;
}

.hf-menubar-segment {
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.75em;
    font-weight: inherit;
    color: var(--hf-text-dim);
    padding: 0.25em 0.6em;
    transition: color var(--hf-transition-fast, 0.15s), background var(--hf-transition-fast, 0.15s);
}

.hf-menubar-segment:hover:not(:disabled) {
    color: var(--hf-accent-4);
}

.hf-menubar-segment[aria-pressed="true"] {
    color: var(--hf-accent-4);
    background: color-mix(in srgb, var(--hf-accent-1) 25%, transparent);
}

.hf-menubar-segment:disabled {
    opacity: 0.4;
    cursor: default;
}

.hf-menubar-label {
    font-size: 0.75em;
    font-weight: var(--hf-weight-medium, 500);
    color: var(--hf-text-muted);
    opacity: 0.8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.hf-menubar-label-interactive {
    cursor: pointer;
}

.hf-menubar-label-interactive:hover {
    color: var(--hf-text-normal);
}

.hf-menubar-badge {
    font-size: 0.7em;
}

.hf-menubar-badge[hidden] {
    display: none;
}

.hf-menubar-has-submenu::after {
    content: '\\25b8';
    margin-inline-start: auto;
    padding-inline-start: 1em;
    opacity: 0.6;
}

.hf-menubar-subpanel {
    position: absolute;
    left: 100%;
    top: 0;
    min-width: 160px;
    width: max-content;
    white-space: nowrap;
    max-height: calc(100vh - var(--hf-titlebar-height, 2.25rem) - 8px);
    overflow-y: auto;
}

.hf-menubar-subpanel[hidden] {
    display: none;
}

/* Floating island placement (the shared cross-product titlebar language) */
menu-bar[floating] .hf-menubar {
    position: fixed;
    top: env(safe-area-inset-top, 0px);
    left: 0;
    width: var(--hf-menubar-width, calc(590px - 0.5em));
    z-index: var(--hf-menubar-z, 2000);
    border-radius: 0 0 var(--hf-radius, 0.5rem) 0;
}
`
    document.head.appendChild(style)
}

// Top-level elements that participate in roving-tabindex arrow navigation.
const TOP_FOCUSABLE_SELECTOR = '.hf-menubar-trigger, .hf-menubar-btn, .hf-menubar-segment, .hf-menubar-label-interactive, .hf-menubar-badge'

/**
 * Application menu bar web component
 * @extends HTMLElement
 *
 * Config-driven: assign a config object to the \`config\` property; the bar
 * renders menus, items, and controls across left/center/right regions.
 * Dynamic fields (labels, checked, disabled, hidden, icons, tooltips, text,
 * pressed, active, interactive) accept a plain value or a zero-arg function;
 * functions are re-evaluated when a menu opens, after every activation, and
 * on refresh()/update(). update(id, patch) overrides persist until patched
 * again. Item ids/classes/attrs from the config land on the rendered
 * elements, so programmatic element.click() delegation, tutorial targeting,
 * and app CSS hooks keep working. Like AboutDialog, config is trusted
 * developer input: trigger.html is interpolated as HTML, and attrs/classes
 * are applied verbatim — never feed them user-controlled strings. See the demo in
 * examples/index.html for a complete config example.
 *
 * @attribute {boolean} floating - Fixed top-left island placement (590px default width, safe-area aware)
 * @attribute {string} hover-switch - Set to "off" to disable hover-switching between open menus
 * @attribute {string} bar-label - Accessible label for the bar (default "Application menu")
 *
 * @fires {CustomEvent} menu-select - An item or control was activated, detail contains { id, menuId, controlType, itemType, checked }
 * @fires {CustomEvent} menu-open - A dropdown menu opened, detail contains { menuId }
 * @fires {CustomEvent} menu-close - A dropdown menu closed, detail contains { menuId }
 */
class MenuBar extends HTMLElement {
    static get observedAttributes() {
        return ['floating', 'hover-switch', 'bar-label']
    }

    constructor() {
        super()
        this._config = null
        this._openMenuId = null
        this._overrides = new Map()
        this._menus = []
        this._customSlots = new Map()
        this._rendered = false
        this._itemForEl = new WeakMap()
        this._controlForEl = new WeakMap()
        this._controls = []

        this._onClick = (e) => {
            const trigger = e.target.closest?.('.hf-menubar-trigger')
            if (trigger && this.contains(trigger)) {
                const menu = this._menus.find(m => m.trigger === trigger)
                if (menu) this._toggleMenu(menu)
                return
            }
            const itemEl = e.target.closest?.('.hf-menu-item')
            if (itemEl && this.contains(itemEl)) {
                if (itemEl.classList.contains('hf-menubar-has-submenu')) {
                    const hover = this._subHoverOpenedAt
                    this._subHoverOpenedAt = null
                    if (!(hover && hover.el === itemEl && performance.now() - hover.at < 400)) {
                        this._toggleSubmenu(itemEl)
                    }
                } else {
                    this._activateItem(itemEl)
                }
                return
            }
            const controlEl = e.target.closest?.('.hf-menubar-btn, .hf-menubar-segment, .hf-menubar-badge, .hf-menubar-label-interactive')
            if (controlEl && this.contains(controlEl)) {
                this._activateControl(controlEl)
            }
        }

        this._onPointerOver = (e) => {
            if (this._openMenuId !== null) {
                // Submenu hover: entering a submenu owner opens its panel;
                // entering anything else in the open dropdown (except the
                // subpanel itself) closes open subpanels.
                const subOwner = e.target.closest?.('.hf-menubar-has-submenu')
                const inSubpanel = e.target.closest?.('.hf-menubar-subpanel')
                const inPanel = e.target.closest?.('.hf-menubar-panel')
                if (subOwner && this.contains(subOwner)) {
                    if (subOwner.getAttribute('aria-expanded') !== 'true') {
                        this._toggleSubmenu(subOwner)
                        // The click that follows this hover-open is the same
                        // gesture — it must not toggle the subpanel closed.
                        this._subHoverOpenedAt = { el: subOwner, at: performance.now() }
                    }
                } else if (inPanel && !inSubpanel && this.contains(inPanel)) {
                    this._closeSubmenus(inPanel)
                }
            }
            if (this.getAttribute('hover-switch') === 'off') return
            if (this._openMenuId === null) return
            const trigger = e.target.closest?.('.hf-menubar-trigger')
            if (!trigger || !this.contains(trigger)) return
            const menu = this._menus.find(m => m.trigger === trigger)
            if (menu && menu.id !== this._openMenuId) {
                this._openMenu(menu)
                // A click that lands right after this hover-switch is the same
                // gesture — it must not toggle the menu straight back closed.
                this._hoverSwitchedAt = { id: menu.id, at: performance.now() }
            }
        }

        this._onResize = () => {
            if (this._openMenuId === null) return
            const menu = this._findMenu(this._openMenuId)
            if (!menu) return
            this._clampPanel(menu)
            const openOwner = menu.panel.querySelector('.hf-menubar-has-submenu[aria-expanded="true"]')
            const openSub = menu.panel.querySelector('.hf-menubar-subpanel:not([hidden])')
            if (openOwner && openSub) this._positionSubpanel(openOwner, openSub)
        }

        this._onDocumentClick = (e) => {
            if (!this.contains(e.target)) this._closeMenu()
        }

        this._onKeyDown = (e) => {
            const itemEl = e.target.closest?.('.hf-menu-item')
            if (itemEl && this.contains(itemEl) && itemEl.closest('.hf-menubar-panel')) {
                this._handleItemKey(e, itemEl)
                return
            }
            const top = e.target.closest?.(TOP_FOCUSABLE_SELECTOR)
            if (top && this.contains(top)) this._handleTopKey(e, top)
        }
    }

    get config() {
        return this._config
    }

    set config(value) {
        this._config = value
        // Drop custom-slot elements whose ids the new config no longer declares.
        if (this._customSlots.size) {
            const kept = new Set()
            const regions = (value && value.regions) || {}
            for (const name of ['left', 'center', 'right']) {
                for (const control of regions[name] || []) {
                    if (control && control.type === 'custom' && control.id) kept.add(control.id)
                }
            }
            for (const id of [...this._customSlots.keys()]) {
                if (!kept.has(id)) this._customSlots.delete(id)
            }
        }
        this._sync()
    }

    /** The id of the currently open dropdown menu, or null. */
    get openMenuId() {
        return this._openMenuId
    }

    connectedCallback() {
        this.addEventListener('click', this._onClick)
        this.addEventListener('pointerover', this._onPointerOver)
        this.addEventListener('keydown', this._onKeyDown)
        document.addEventListener('click', this._onDocumentClick)
        window.addEventListener('resize', this._onResize)
        this._sync()
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onClick)
        this.removeEventListener('pointerover', this._onPointerOver)
        this.removeEventListener('keydown', this._onKeyDown)
        document.removeEventListener('click', this._onDocumentClick)
        window.removeEventListener('resize', this._onResize)
        unregisterEscapeable(this)
    }

    /** Open the dropdown menu with the given id. */
    openMenu(menuId) {
        const menu = this._menus.find(m => m.id === menuId)
        if (menu) this._openMenu(menu)
    }

    /** Close any open dropdown menu. */
    closeAll() {
        this._closeMenu()
    }

    /**
     * Re-evaluate every dynamic config field (labels, checked, disabled,
     * hidden, icons, tooltips…) and update the rendered bar in place.
     * Call after app state changes outside a menu interaction.
     */
    refresh() {
        for (const menu of this._menus) {
            const label = this._resolve((menu.config.trigger || {}).label)
            if (label !== undefined && !((menu.config.trigger || {}).html) && !((menu.config.trigger || {}).icon)) {
                if (menu.trigger.textContent !== label) menu.trigger.textContent = label ?? ''
            }
            this._refreshMenu(menu)
        }
        this._refreshControls()
    }

    /**
     * Merge an imperative state patch for the config entry with the given id
     * (e.g. update('undoItem', { disabled: true })). Patched keys win over
     * the config's own values until patched again.
     */
    update(id, patch) {
        if (!id) return
        const existing = this._overrides.get(id) || {}
        this._overrides.set(id, { ...existing, ...patch })
        this.refresh()
    }

    _refreshControls() {
        for (const { control, el } of this._controls) {
            switch (control.type) {
                case 'button': this._refreshButton(control, el); break
                case 'segmented': this._refreshSegmented(control, el); break
                case 'label': this._refreshLabel(control, el); break
                case 'badge': this._refreshBadge(control, el); break
                default: break
            }
        }
    }

    // ---- Keyboard navigation (ARIA APG menubar pattern) ----

    _topFocusables() {
        return [...this.querySelectorAll(TOP_FOCUSABLE_SELECTOR)]
            .filter(el => !el.hidden && !el.disabled && !el.closest('[hidden]'))
    }

    _setRoving(el) {
        for (const f of this._topFocusables()) f.setAttribute('tabindex', f === el ? '0' : '-1')
    }

    _enabledItems(panel) {
        return [...panel.querySelectorAll(':scope > .hf-menu-item, :scope > .hf-menubar-submenu-holder > .hf-menu-item')]
            .filter(el => !el.hidden && el.getAttribute('aria-disabled') !== 'true')
    }

    _moveTop(fromEl, dir) {
        const tops = this._topFocusables()
        if (!tops.length) return
        const idx = tops.indexOf(fromEl)
        const next = tops[(idx + dir + tops.length) % tops.length]
        const menu = this._menus.find(m => m.trigger === next)
        if (this._openMenuId !== null && menu) {
            this._openMenu(menu)
            this._enabledItems(menu.panel)[0]?.focus()
        } else {
            if (this._openMenuId !== null && !menu) this._closeMenu()
            next.focus()
        }
        this._setRoving(next)
    }

    _handleTopKey(e, top) {
        const menu = this._menus.find(m => m.trigger === top)
        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault()
                this._moveTop(top, 1)
                break
            case 'ArrowLeft':
                e.preventDefault()
                this._moveTop(top, -1)
                break
            case 'ArrowDown':
            case 'Enter':
            case ' ':
                if (!menu) return // plain controls keep native Enter/Space activation
                e.preventDefault()
                this._openMenu(menu)
                this._enabledItems(menu.panel)[0]?.focus()
                break
            default:
                break
        }
    }

    _handleItemKey(e, itemEl) {
        const panel = itemEl.closest('.hf-menu[role="menu"]')
        const inSubpanel = panel?.classList.contains('hf-menubar-subpanel')
        const items = panel ? this._enabledItems(panel) : []
        const idx = items.indexOf(itemEl)
        const openMenu = this._findMenu(this._openMenuId)
        const isSubmenuItem = itemEl.classList.contains('hf-menubar-has-submenu')
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                items[(idx + 1) % items.length]?.focus()
                break
            case 'ArrowUp':
                e.preventDefault()
                items[(idx - 1 + items.length) % items.length]?.focus()
                break
            case 'Home':
                e.preventDefault()
                items[0]?.focus()
                break
            case 'End':
                e.preventDefault()
                items[items.length - 1]?.focus()
                break
            case 'Enter':
            case ' ':
                e.preventDefault()
                if (isSubmenuItem) {
                    this._toggleSubmenu(itemEl)
                    const sub = itemEl.closest('.hf-menubar-submenu-holder')?.querySelector('.hf-menubar-subpanel')
                    if (sub && !sub.hidden) this._enabledItems(sub)[0]?.focus()
                } else if (itemEl.tagName === 'A') {
                    // Link items: a synthetic click both follows the href and
                    // bubbles into the delegated activation path exactly once.
                    const trigger = openMenu?.trigger
                    itemEl.click()
                    trigger?.focus()
                } else {
                    const trigger = openMenu?.trigger
                    this._activateItem(itemEl)
                    trigger?.focus()
                }
                break
            case 'ArrowRight':
                e.preventDefault()
                if (isSubmenuItem) {
                    this._toggleSubmenu(itemEl)
                    const sub = itemEl.closest('.hf-menubar-submenu-holder')?.querySelector('.hf-menubar-subpanel')
                    if (sub && !sub.hidden) this._enabledItems(sub)[0]?.focus()
                } else if (openMenu) {
                    this._moveTop(openMenu.trigger, 1)
                }
                break
            case 'ArrowLeft':
                e.preventDefault()
                if (inSubpanel) {
                    const owner = panel.closest('.hf-menubar-submenu-holder')?.querySelector('.hf-menubar-has-submenu')
                    if (owner) {
                        this._toggleSubmenu(owner)
                        owner.focus()
                    }
                } else if (openMenu) {
                    this._moveTop(openMenu.trigger, -1)
                }
                break
            default:
                break
        }
    }

    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }))
    }

    _findMenu(menuId) {
        return this._menus.find(m => m.id === menuId) || null
    }

    _toggleMenu(menu) {
        const hover = this._hoverSwitchedAt
        this._hoverSwitchedAt = null
        if (this._openMenuId !== null && this._openMenuId === menu.id) {
            if (hover && hover.id === menu.id && performance.now() - hover.at < 400) return
            this._closeMenu()
        } else {
            this._openMenu(menu)
        }
    }

    _openMenu(menu) {
        if (this._openMenuId !== null && this._openMenuId !== menu.id) this._closeMenu()
        if (this._openMenuId === menu.id) return
        this._refreshMenu(menu)
        menu.panel.hidden = false
        menu.trigger.setAttribute('aria-expanded', 'true')
        this._openMenuId = menu.id
        this._clampPanel(menu)
        registerEscapeable(this, () => {
            this._closeMenu()
            menu.trigger.focus()
        })
        this.dispatchEvent(new CustomEvent('menu-open', { bubbles: true, composed: true, detail: { menuId: menu.config.id || null } }))
    }

    _closeMenu() {
        if (this._openMenuId === null) return
        const menu = this._findMenu(this._openMenuId)
        this._openMenuId = null
        unregisterEscapeable(this)
        if (menu) {
            menu.panel.hidden = true
            menu.panel.style.left = ''
            menu.panel.style.right = ''
            menu.trigger.setAttribute('aria-expanded', 'false')
            this._closeSubmenus(menu.panel)
            this.dispatchEvent(new CustomEvent('menu-close', { bubbles: true, composed: true, detail: { menuId: menu.config.id || null } }))
        }
    }

    _closeSubmenus(panel) {
        for (const sub of panel.querySelectorAll('.hf-menubar-subpanel')) {
            sub.hidden = true
            sub.style.left = ''
            sub.style.right = ''
            sub.style.top = ''
        }
        for (const owner of panel.querySelectorAll('.hf-menubar-has-submenu')) {
            owner.setAttribute('aria-expanded', 'false')
        }
    }

    _toggleSubmenu(itemEl) {
        const entry = this._itemForEl.get(itemEl)
        if (entry && this._resolve(this._fieldFor(entry.item, 'disabled'))) return
        const holder = itemEl.closest('.hf-menubar-submenu-holder')
        const subpanel = holder?.querySelector('.hf-menubar-subpanel')
        if (!subpanel) return
        const willOpen = subpanel.hidden
        const panel = holder.closest('.hf-menu[role="menu"]')
        if (panel) this._closeSubmenus(panel)
        subpanel.hidden = !willOpen
        itemEl.setAttribute('aria-expanded', String(willOpen))
        if (willOpen) this._positionSubpanel(itemEl, subpanel)
    }

    _viewportInset() {
        const v = parseFloat(getComputedStyle(this).getPropertyValue('--hf-menubar-viewport-inset'))
        return Number.isFinite(v) ? v : 8
    }

    // Dynamic subpanel placement: opens to the right of the dropdown, flips to
    // the left when it would overflow the viewport, clamps past the min-left
    // floor (--hf-menubar-subpanel-min-left, e.g. a fixed side toolbar), and
    // shifts vertically to stay inside the viewport.
    _positionSubpanel(ownerEl, subpanel) {
        const holder = ownerEl.closest('.hf-menubar-submenu-holder')
        if (!holder) return
        const inset = this._viewportInset()
        const floorVar = parseFloat(getComputedStyle(this).getPropertyValue('--hf-menubar-subpanel-min-left'))
        const minLeft = Math.max(inset, Number.isFinite(floorVar) ? floorVar : inset)

        subpanel.style.left = ''
        subpanel.style.right = ''
        subpanel.style.top = ''
        const holderRect = holder.getBoundingClientRect()
        let rect = subpanel.getBoundingClientRect()
        if (rect.right > window.innerWidth - inset) {
            subpanel.style.left = 'auto'
            subpanel.style.right = '100%'
            rect = subpanel.getBoundingClientRect()
        }
        if (rect.left < minLeft) {
            subpanel.style.right = ''
            subpanel.style.left = `${minLeft - holderRect.left}px`
            rect = subpanel.getBoundingClientRect()
        }
        let top = 0
        if (rect.bottom > window.innerHeight - inset) {
            top -= rect.bottom - (window.innerHeight - inset)
        }
        if (rect.top + top < inset) {
            top += inset - (rect.top + top)
        }
        if (top !== 0) subpanel.style.top = `${top}px`
    }

    // Keep an open dropdown panel horizontally inside the viewport.
    _clampPanel(menu) {
        const panel = menu.panel
        panel.style.left = ''
        panel.style.right = ''
        const inset = this._viewportInset()
        const wrapperRect = menu.wrapper.getBoundingClientRect()
        let rect = panel.getBoundingClientRect()
        if (rect.right > window.innerWidth - inset) {
            panel.style.right = ''
            panel.style.left = `${(window.innerWidth - inset - rect.width) - wrapperRect.left}px`
            rect = panel.getBoundingClientRect()
        }
        if (rect.left < inset) {
            panel.style.right = ''
            panel.style.left = `${inset - wrapperRect.left}px`
        }
    }

    _activateItem(itemEl) {
        const entry = this._itemForEl.get(itemEl)
        if (!entry) return
        const { item, menu } = entry
        if (this._resolve(this._fieldFor(item, 'disabled'))) return
        const type = item.type || (('checked' in item) ? 'checkbox' : 'action')
        item.onSelect?.()
        const checked = ('checked' in item) || type === 'radio'
            ? !!this._resolve(this._fieldFor(item, 'checked'))
            : null
        this.dispatchEvent(new CustomEvent('menu-select', {
            bubbles: true,
            composed: true,
            detail: {
                id: item.id || null,
                menuId: menu ? (menu.config.id || null) : null,
                controlType: 'menu',
                itemType: type,
                checked,
            },
        }))
        if (menu && this._openMenuId === menu.id) this._refreshMenu(menu)
        this._refreshControls()
        this._closeMenu()
    }

    _fieldFor(spec, key) {
        const override = spec.id ? this._overrides.get(spec.id) : null
        if (override && key in override) return override[key]
        return spec[key]
    }

    _refreshMenu(menu) {
        for (const { item, el } of menu.entries) {
            this._refreshItem(item, el)
        }
    }

    _refreshItem(item, el) {
        this._applyItemState(el, item)
    }

    attributeChangedCallback() {
        this._sync()
    }

    _resolve(value) {
        return typeof value === 'function' ? value() : value
    }

    _barLabel() {
        return (this._config && this._config.ariaLabel) || this.getAttribute('bar-label') || 'Application menu'
    }

    _sync() {
        if (!this.isConnected && !this._rendered) return
        // A rebuild discards every panel; interaction state must not survive it.
        this._openMenuId = null
        this._hoverSwitchedAt = null
        unregisterEscapeable(this)
        const config = this._config || { regions: {} }
        const regions = config.regions || {}

        this.textContent = ''
        const bar = document.createElement('div')
        bar.className = 'hf-menubar'
        bar.setAttribute('role', 'menubar')
        bar.setAttribute('aria-label', this._barLabel())

        const backdrop = document.createElement('div')
        backdrop.className = 'hf-menubar-backdrop'
        bar.appendChild(backdrop)

        this._menus = []
        this._controls = []
        for (const name of ['left', 'center', 'right']) {
            const region = document.createElement('div')
            region.className = `hf-menubar-region hf-menubar-${name}`
            for (const control of regions[name] || []) {
                this._renderControl(control, region)
            }
            bar.appendChild(region)
        }

        this.appendChild(bar)
        this._rendered = true
        const tops = this._topFocusables()
        if (tops.length) this._setRoving(tops[0])
    }

    _renderControl(control, regionEl) {
        switch (control.type) {
            case 'menu':
                this._renderMenu(control, regionEl)
                break
            case 'button': {
                const btn = document.createElement('button')
                btn.type = 'button'
                btn.className = 'hf-icon-btn hf-menubar-btn'
                btn.setAttribute('tabindex', '-1')
                const icon = document.createElement('span')
                icon.className = 'hf-icon'
                btn.appendChild(icon)
                this._applyCommon(btn, control)
                this._controlForEl.set(btn, control)
                this._controls.push({ control, el: btn })
                this._refreshButton(control, btn)
                regionEl.appendChild(btn)
                break
            }
            case 'separator': {
                const sep = document.createElement('div')
                sep.className = 'hf-menubar-vseparator'
                regionEl.appendChild(sep)
                break
            }
            case 'segmented': {
                const group = document.createElement('div')
                group.className = 'hf-menubar-segmented'
                group.setAttribute('role', 'group')
                if (control.ariaLabel) group.setAttribute('aria-label', control.ariaLabel)
                this._applyCommon(group, control)
                for (const buttonSpec of control.buttons || []) {
                    const seg = document.createElement('button')
                    seg.type = 'button'
                    seg.className = 'hf-menubar-segment'
                    seg.setAttribute('tabindex', '-1')
                    seg.textContent = buttonSpec.label ?? ''
                    this._applyCommon(seg, buttonSpec)
                    this._controlForEl.set(seg, { group: control, button: buttonSpec })
                    group.appendChild(seg)
                }
                this._controls.push({ control, el: group })
                this._refreshSegmented(control, group)
                regionEl.appendChild(group)
                break
            }
            case 'label': {
                const label = document.createElement('span')
                label.className = 'hf-menubar-label'
                this._applyCommon(label, control)
                this._controlForEl.set(label, control)
                this._controls.push({ control, el: label })
                this._refreshLabel(control, label)
                regionEl.appendChild(label)
                break
            }
            case 'badge': {
                const badge = document.createElement('button')
                badge.type = 'button'
                badge.className = 'hf-badge hf-menubar-badge'
                badge.setAttribute('tabindex', '-1')
                this._applyCommon(badge, control)
                this._controlForEl.set(badge, control)
                this._controls.push({ control, el: badge })
                this._refreshBadge(control, badge)
                regionEl.appendChild(badge)
                break
            }
            case 'custom': {
                let slot = control.id ? this._customSlots.get(control.id) : null
                if (!slot) {
                    slot = document.createElement('div')
                    slot.className = 'hf-menubar-custom'
                    this._applyCommon(slot, control)
                    if (control.id) this._customSlots.set(control.id, slot)
                }
                regionEl.appendChild(slot)
                break
            }
            default:
                break
        }
    }

    _refreshButton(control, btn) {
        const icon = btn.querySelector('.hf-icon')
        const glyph = this._resolve(this._fieldFor(control, 'icon')) ?? ''
        if (icon && icon.textContent !== glyph) icon.textContent = glyph
        const tooltip = this._resolve(this._fieldFor(control, 'tooltip'))
        if (tooltip != null) {
            btn.classList.add('tooltip')
            btn.setAttribute('data-title', tooltip)
        }
        const ariaLabel = this._resolve(this._fieldFor(control, 'ariaLabel'))
        if (ariaLabel != null) btn.setAttribute('aria-label', ariaLabel)
        btn.classList.toggle('active', !!this._resolve(this._fieldFor(control, 'active')))
        btn.disabled = !!this._resolve(this._fieldFor(control, 'disabled'))
        btn.hidden = !!this._resolve(this._fieldFor(control, 'hidden'))
    }

    _refreshSegmented(control, group) {
        group.hidden = !!this._resolve(this._fieldFor(control, 'hidden'))
        const segments = group.querySelectorAll('.hf-menubar-segment')
        const buttons = control.buttons || []
        segments.forEach((seg, i) => {
            const spec = buttons[i]
            if (!spec) return
            const pressed = !!this._resolve(this._fieldFor(spec, 'pressed'))
            seg.setAttribute('aria-pressed', String(pressed))
            seg.classList.toggle('active', pressed)
            seg.disabled = !!this._resolve(this._fieldFor(spec, 'disabled'))
            const title = this._resolve(this._fieldFor(spec, 'title'))
            if (title != null) seg.title = title
        })
    }

    _refreshLabel(control, label) {
        const text = this._resolve(this._fieldFor(control, 'text')) ?? ''
        if (label.textContent !== text) label.textContent = text
        const tooltip = this._resolve(this._fieldFor(control, 'tooltip'))
        if (tooltip != null) {
            label.classList.add('tooltip')
            label.setAttribute('data-title', tooltip)
        }
        const interactive = !!this._resolve(this._fieldFor(control, 'interactive'))
        label.classList.toggle('hf-menubar-label-interactive', interactive)
        if (interactive) {
            label.setAttribute('role', 'button')
            if (!label.hasAttribute('tabindex')) label.setAttribute('tabindex', '-1')
        } else {
            label.removeAttribute('role')
            label.removeAttribute('tabindex')
        }
        label.hidden = !!this._resolve(this._fieldFor(control, 'hidden'))
    }

    _refreshBadge(control, badge) {
        const text = this._resolve(this._fieldFor(control, 'label')) ?? ''
        if (badge.textContent !== text) badge.textContent = text
        badge.hidden = !!this._resolve(this._fieldFor(control, 'hidden'))
    }

    _activateControl(el) {
        const entry = this._controlForEl.get(el)
        if (!entry) return
        if (entry.group) {
            const { group, button } = entry
            if (this._resolve(this._fieldFor(button, 'disabled'))) return
            this._closeMenu()
            button.onSelect?.()
            group.onSelect?.(button.id)
            this.dispatchEvent(new CustomEvent('menu-select', {
                bubbles: true,
                composed: true,
                detail: { id: button.id || null, menuId: null, controlType: 'segmented', itemType: null, checked: null },
            }))
            this._refreshControls()
            return
        }
        const control = entry
        if (control.type === 'label' && !this._resolve(this._fieldFor(control, 'interactive'))) return
        if (this._resolve(this._fieldFor(control, 'disabled'))) return
        // Activating a bar control dismisses any open dropdown — matches the
        // document-level close-on-any-click behavior of the source apps.
        this._closeMenu()
        control.onSelect?.()
        this.dispatchEvent(new CustomEvent('menu-select', {
            bubbles: true,
            composed: true,
            detail: { id: control.id || null, menuId: null, controlType: control.type, itemType: null, checked: null },
        }))
        this._refreshControls()
    }

    _applyCommon(el, spec) {
        if (spec.id) el.id = spec.id
        if (spec.classes) el.className += ` ${spec.classes}`
        if (spec.attrs) {
            for (const [name, value] of Object.entries(spec.attrs)) {
                el.setAttribute(name, value)
            }
        }
    }

    _renderMenu(control, regionEl) {
        const wrapper = document.createElement('div')
        wrapper.className = 'hf-menubar-menu'
        if (control.split) wrapper.classList.add('hf-menubar-split')

        if (control.split) {
            const split = { type: 'button', ...control.split }
            const primary = document.createElement('button')
            primary.type = 'button'
            primary.className = 'hf-icon-btn hf-menubar-btn'
            primary.setAttribute('tabindex', '-1')
            const icon = document.createElement('span')
            icon.className = 'hf-icon'
            primary.appendChild(icon)
            this._applyCommon(primary, split)
            this._controlForEl.set(primary, split)
            this._controls.push({ control: split, el: primary })
            this._refreshButton(split, primary)
            wrapper.appendChild(primary)
        }

        const trigger = document.createElement('button')
        trigger.type = 'button'
        trigger.className = 'hf-menubar-trigger'
        trigger.setAttribute('role', 'menuitem')
        trigger.setAttribute('aria-haspopup', 'menu')
        trigger.setAttribute('aria-expanded', 'false')
        trigger.setAttribute('tabindex', '-1')
        const triggerSpec = control.trigger || {}
        if (triggerSpec.html) {
            trigger.innerHTML = triggerSpec.html // trusted app-supplied markup (logo SVG)
        } else if (triggerSpec.icon) {
            const icon = document.createElement('span')
            icon.className = 'hf-icon hf-icon-sm'
            icon.textContent = triggerSpec.icon
            trigger.appendChild(icon)
        } else {
            trigger.textContent = this._resolve(triggerSpec.label) ?? ''
        }
        if (triggerSpec.ariaLabel) trigger.setAttribute('aria-label', triggerSpec.ariaLabel)
        this._applyCommon(trigger, triggerSpec)

        const panel = document.createElement('div')
        panel.className = 'hf-menu hf-menubar-panel'
        panel.setAttribute('role', 'menu')
        panel.hidden = true
        const align = control.align || 'left'
        panel.classList.add(`hf-menubar-panel-${['left', 'right', 'start', 'end'].includes(align) ? align : 'left'}`)

        // The wrapper is the analog of the app's own menu container element —
        // reflect the control's id/classes/attrs onto it so app CSS overrides
        // (#filterMenu …) and JS lookups (delegated listeners) keep working.
        this._applyCommon(wrapper, control)
        // Internal id must be unique and non-null: null is the "no menu open"
        // sentinel in _openMenuId, so an id-less menu would read as already
        // open and never open at all.
        const menu = { id: control.id || `__menu${this._menus.length}`, config: control, trigger, panel, wrapper, entries: [] }
        for (const item of control.items || []) {
            panel.appendChild(this._renderItem(item, menu))
        }

        wrapper.appendChild(trigger)
        wrapper.appendChild(panel)
        regionEl.appendChild(wrapper)
        this._menus.push(menu)
    }

    _renderItem(item, menu) {
        const type = item.type || (('checked' in item) ? 'checkbox' : 'action')

        if (type === 'separator') {
            const hr = document.createElement('hr')
            hr.className = 'hf-menu-separator'
            if (item.id) hr.id = item.id
            hr.hidden = !!this._resolve(this._fieldFor(item, 'hidden'))
            menu.entries.push({ item, el: hr })
            return hr
        }

        if (type === 'header') {
            const header = document.createElement('div')
            header.className = 'hf-menu-header'
            header.textContent = this._resolve(this._fieldFor(item, 'label')) ?? ''
            if (item.id) header.id = item.id
            menu.entries.push({ item, el: header })
            return header
        }

        let el
        if (type === 'link') {
            el = document.createElement('a')
            if (item.href) el.href = item.href
            if (item.target) el.target = item.target
            if (item.rel) el.rel = item.rel
        } else {
            el = document.createElement('button')
            el.type = 'button'
        }
        el.className = 'hf-menu-item'
        el.setAttribute('tabindex', '-1')
        const role = type === 'checkbox' ? 'menuitemcheckbox'
            : type === 'radio' ? 'menuitemradio'
            : 'menuitem'
        el.setAttribute('role', role)
        if (type === 'submenu') {
            el.classList.add('hf-menubar-has-submenu')
            el.setAttribute('aria-haspopup', 'menu')
            el.setAttribute('aria-expanded', 'false')
        }
        if (item.destructive) el.classList.add('hf-menu-item-destructive')

        if (item.icon) {
            const icon = document.createElement('span')
            icon.className = 'hf-icon hf-icon-sm'
            icon.textContent = this._resolve(item.icon)
            el.appendChild(icon)
        }
        const label = document.createElement('span')
        label.className = 'hf-menubar-item-label'
        label.textContent = this._resolve(item.label) ?? ''
        el.appendChild(label)
        if (item.shortcut) {
            const shortcut = document.createElement('span')
            shortcut.className = 'hf-menu-shortcut'
            shortcut.textContent = item.shortcut
            el.appendChild(shortcut)
        }

        this._applyCommon(el, item)
        this._applyItemState(el, item)
        this._itemForEl.set(el, { item, menu })
        menu.entries.push({ item, el })

        if (type === 'submenu') {
            const holder = document.createElement('div')
            holder.className = 'hf-menubar-submenu-holder'
            const subpanel = document.createElement('div')
            subpanel.className = 'hf-menu hf-menubar-subpanel'
            subpanel.setAttribute('role', 'menu')
            subpanel.hidden = true
            for (const child of item.items || []) {
                subpanel.appendChild(this._renderItem(child, menu))
            }
            holder.appendChild(el)
            holder.appendChild(subpanel)
            return holder
        }
        return el
    }

    _applyItemState(el, item) {
        const type = item.type || (('checked' in item) ? 'checkbox' : 'action')
        if (type === 'separator' || type === 'header') {
            el.hidden = !!this._resolve(this._fieldFor(item, 'hidden'))
            return
        }
        const disabled = !!this._resolve(this._fieldFor(item, 'disabled'))
        if (disabled) el.setAttribute('aria-disabled', 'true')
        else el.removeAttribute('aria-disabled')
        el.hidden = !!this._resolve(this._fieldFor(item, 'hidden'))
        if (type === 'checkbox' || type === 'radio') {
            el.setAttribute('aria-checked', String(!!this._resolve(this._fieldFor(item, 'checked'))))
        }
        const labelEl = el.querySelector('.hf-menubar-item-label')
        if (labelEl) {
            const label = this._resolve(this._fieldFor(item, 'label')) ?? ''
            if (labelEl.textContent !== label) labelEl.textContent = label
        }
        if (item.icon) {
            const iconEl = el.querySelector('.hf-icon')
            if (iconEl) {
                const icon = this._resolve(this._fieldFor(item, 'icon')) ?? ''
                if (iconEl.textContent !== icon) iconEl.textContent = icon
            }
        }
    }
}

customElements.define('menu-bar', MenuBar)

export { MenuBar }
