/**
 * BaseComponent - Abstract base class for Handfish web components
 * 
 * Provides common functionality and patterns for all components:
 * - Style injection into document head (once per component type)
 * - Form association support
 * - Render lifecycle management
 * - Common state management patterns
 *
 * @module components/base/BaseComponent
 */

/**
 * @abstract
 * @extends HTMLElement
 */
export class BaseComponent extends HTMLElement {
    static formAssociated = false
    
    /** @type {string} Override in subclass with unique style ID */
    static styleId = ''
    
    /** @type {string} Override in subclass with component styles */
    static styles = ''

    constructor() {
        super()
        
        // Form association
        if (this.constructor.formAssociated) {
            this._internals = this.attachInternals?.()
        }
        
        /** @type {boolean} */
        this._rendered = false
        
        /** @type {boolean} */
        this._listenersAttached = false
    }

    /**
     * Inject component styles into document head (once per component type)
     * @protected
     */
    static injectStyles() {
        if (!this.styleId || !this.styles) return
        if (document.getElementById(this.styleId)) return
        
        const styleEl = document.createElement('style')
        styleEl.id = this.styleId
        styleEl.textContent = this.styles
        document.head.appendChild(styleEl)
    }

    connectedCallback() {
        this.constructor.injectStyles()
        
        if (!this._rendered) {
            this._render()
            this._rendered = true
        }
        
        if (!this._listenersAttached) {
            this._setupEventListeners()
            this._listenersAttached = true
        }
        
        this._onConnected()
    }

    disconnectedCallback() {
        this._onDisconnected()
    }

    /**
     * Render the component's DOM structure
     * @abstract
     * @protected
     */
    _render() {
        // Override in subclass
    }

    /**
     * Set up event listeners
     * @abstract
     * @protected
     */
    _setupEventListeners() {
        // Override in subclass
    }

    /**
     * Called after component is connected and rendered
     * @protected
     */
    _onConnected() {
        // Override in subclass
    }

    /**
     * Called when component is disconnected
     * @protected
     */
    _onDisconnected() {
        // Override in subclass
    }

    /**
     * Update the form value (for form-associated components)
     * @param {string} value
     * @protected
     */
    _updateFormValue(value) {
        if (this._internals) {
            this._internals.setFormValue(value)
        }
    }

    /**
     * Dispatch a change event
     * @protected
     */
    _dispatchChange() {
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }

    /**
     * Dispatch an input event
     * @protected
     */
    _dispatchInput() {
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    }
}
