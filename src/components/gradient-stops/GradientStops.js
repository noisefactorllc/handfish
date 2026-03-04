/**
 * Gradient Stops Component
 * Draggable color stop handles for positioning colors in a gradient
 * Inspired by Photoshop's gradient editor
 * @module components/gradient-stops/GradientStops
 */

import { rgbToHex } from '../../utils/colorConversions.js'

// =============================================================================
// Styles
// =============================================================================

const STYLES_ID = 'hf-gradient-stops-styles'
if (!document.getElementById(STYLES_ID)) {
    const style = document.createElement('style')
    style.id = STYLES_ID
    style.textContent = `
        gradient-stops {
            display: block;
            position: relative;
            width: 100%;
            height: 28px;
            margin-top: 4px;
            user-select: none;
        }

        gradient-stops .stops-track {
            position: absolute;
            top: 0;
            left: 8px;
            right: 8px;
            height: 100%;
        }

        gradient-stops .stop-handle {
            position: absolute;
            width: 16px;
            height: 22px;
            transform: translateX(-50%);
            cursor: grab;
            transition: filter 0.1s ease;
        }

        gradient-stops .stop-handle:active {
            cursor: grabbing;
        }

        gradient-stops .stop-handle.selected {
            z-index: 10;
        }

        gradient-stops .stop-handle.selected .stop-body {
            box-shadow: 0 0 0 2px var(--hf-accent);
        }

        gradient-stops .stop-handle:hover .stop-body {
            filter: brightness(1.1);
        }

        gradient-stops .stop-pointer {
            position: absolute;
            top: 0;
            left: 50%;
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 6px solid var(--stop-color);
            transform: translateX(-50%);
        }

        gradient-stops .stop-body {
            position: absolute;
            top: 6px;
            left: 1px;
            right: 1px;
            height: 14px;
            background: var(--stop-color);
            border: 1px solid rgba(0, 0, 0, 0.3);
            border-radius: var(--hf-radius-sm, 0.25rem);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        gradient-stops .stop-delete {
            position: absolute;
            top: -6px;
            right: -6px;
            width: 14px;
            height: 14px;
            background: var(--hf-bg-surface);
            border: 1px solid var(--hf-border-subtle);
            border-radius: 50%;
            color: var(--hf-text-dim);
            font-size: var(--hf-size-xs, 0.625rem);
            line-height: 12px;
            text-align: center;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.1s ease;
            z-index: 20;
        }

        gradient-stops .stop-handle.selected .stop-delete {
            opacity: 1;
        }

        gradient-stops .stop-delete:hover {
            background: var(--hf-red);
            border-color: var(--hf-red);
            color: white;
        }

        gradient-stops.disabled {
            pointer-events: none;
            opacity: 0.5;
        }

        gradient-stops.disabled .stop-handle {
            cursor: default;
        }
    `
    document.head.appendChild(style)
}

// =============================================================================
// Component
// =============================================================================

class GradientStops extends HTMLElement {
    constructor() {
        super()
        this._colors = []
        this._positions = []
        this._selectedIndex = -1
        this._isDragging = false
        this._trackElement = null
        this._boundOnDocumentClick = this._onDocumentClick.bind(this)
    }

    static get observedAttributes() {
        return ['disabled']
    }

    connectedCallback() {
        this._render()
        document.addEventListener('click', this._boundOnDocumentClick)
    }

    disconnectedCallback() {
        document.removeEventListener('click', this._boundOnDocumentClick)
    }

    _onDocumentClick(e) {
        // If click is outside this component, deselect
        if (!this.contains(e.target)) {
            this._selectedIndex = -1
            this._updateSelection()
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return

        if (name === 'disabled') {
            if (newValue !== null) {
                this.classList.add('disabled')
            } else {
                this.classList.remove('disabled')
            }
        }
    }

    /**
     * Set the colors and their positions
     * @param {number[][]} colors - Array of RGB colors [0-1]
     * @param {number[]} positions - Array of positions [0-1]
     */
    setStops(colors, positions) {
        this._colors = [...colors]
        this._positions = [...positions]

        // Ensure same length
        while (this._positions.length < this._colors.length) {
            const i = this._positions.length
            this._positions.push(i / (this._colors.length - 1))
        }

        this._render()
    }

    /**
     * Get current positions
     * @returns {number[]}
     */
    getPositions() {
        return [...this._positions]
    }

    /**
     * Get selected color index
     * @returns {number}
     */
    getSelectedIndex() {
        return this._selectedIndex
    }

    /**
     * Set selected index
     * @param {number} index
     */
    setSelectedIndex(index) {
        this._selectedIndex = index
        this._updateSelection()
    }

    /**
     * Update a single stop's position
     * @param {number} index - Color index
     * @param {number} position - New position [0-1]
     */
    setPosition(index, position) {
        if (index >= 0 && index < this._positions.length) {
            this._positions[index] = Math.max(0, Math.min(1, position))
            this._updateHandlePositions()
        }
    }

    _render() {
        this.innerHTML = `<div class="stops-track"></div>`
        this._trackElement = this.querySelector('.stops-track')

        this._colors.forEach((color, index) => {
            const handle = this._createHandle(color, index)
            this._trackElement.appendChild(handle)
        })

        this._updateHandlePositions()
        this._updateSelection()
    }

    _createHandle(color, index) {
        // rgbToHex expects {r,g,b} 0-255
        const hex = rgbToHex({
            r: Math.round(color[0] * 255),
            g: Math.round(color[1] * 255),
            b: Math.round(color[2] * 255)
        })
        const handle = document.createElement('div')
        handle.className = 'stop-handle'
        handle.dataset.index = index
        handle.style.setProperty('--stop-color', hex)

        handle.innerHTML = `
            <div class="stop-pointer"></div>
            <div class="stop-body"></div>
            <button class="stop-delete" title="Delete color">×</button>
        `

        // Click to select
        handle.addEventListener('mousedown', (e) => this._onMouseDown(e, index))
        handle.addEventListener('touchstart', (e) => this._onTouchStart(e, index), { passive: false })

        // Delete button
        const deleteBtn = handle.querySelector('.stop-delete')
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            this._onDelete(index)
        })

        return handle
    }

    _updateHandlePositions() {
        const handles = this._trackElement?.querySelectorAll('.stop-handle')
        if (!handles) return

        handles.forEach((handle, i) => {
            const pos = this._positions[i] ?? (i / Math.max(1, this._colors.length - 1))
            handle.style.left = `${pos * 100}%`
        })
    }

    _updateSelection() {
        const handles = this._trackElement?.querySelectorAll('.stop-handle')
        if (!handles) return

        handles.forEach((handle, i) => {
            if (i === this._selectedIndex) {
                handle.classList.add('selected')
            } else {
                handle.classList.remove('selected')
            }
        })
    }

    _updateHandleColor(index, color) {
        const handle = this._trackElement?.querySelector(`[data-index="${index}"]`)
        if (handle) {
            const hex = rgbToHex({
                r: Math.round(color[0] * 255),
                g: Math.round(color[1] * 255),
                b: Math.round(color[2] * 255)
            })
            handle.style.setProperty('--stop-color', hex)
        }
    }

    _onMouseDown(e, index) {
        if (this.hasAttribute('disabled')) return

        // Don't start drag on delete button
        if (e.target.classList.contains('stop-delete')) return

        e.preventDefault()

        this._selectedIndex = index
        this._updateSelection()

        this.dispatchEvent(new CustomEvent('select', {
            detail: { index }
        }))

        // Start drag
        this._isDragging = true
        const startX = e.clientX
        const startPos = this._positions[index]
        const trackRect = this._trackElement.getBoundingClientRect()

        const onMouseMove = (moveEvent) => {
            if (!this._isDragging) return

            const deltaX = moveEvent.clientX - startX
            const deltaPct = deltaX / trackRect.width
            let newPos = startPos + deltaPct

            // Clamp to valid range
            newPos = this._clampPosition(newPos, index)

            this._positions[index] = newPos
            this._updateHandlePositions()

            this.dispatchEvent(new CustomEvent('input', {
                detail: { index, position: newPos, positions: [...this._positions] }
            }))
        }

        const onMouseUp = () => {
            this._isDragging = false
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)

            this.dispatchEvent(new CustomEvent('change', {
                detail: { index, positions: [...this._positions] }
            }))
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }

    _onTouchStart(e, index) {
        if (this.hasAttribute('disabled')) return

        // Don't start drag on delete button
        if (e.target.classList.contains('stop-delete')) return

        e.preventDefault()

        this._selectedIndex = index
        this._updateSelection()

        this.dispatchEvent(new CustomEvent('select', {
            detail: { index }
        }))

        const touch = e.touches[0]
        const startX = touch.clientX
        const startPos = this._positions[index]
        const trackRect = this._trackElement.getBoundingClientRect()

        const onTouchMove = (moveEvent) => {
            const currentTouch = moveEvent.touches[0]
            const deltaX = currentTouch.clientX - startX
            const deltaPct = deltaX / trackRect.width
            let newPos = startPos + deltaPct

            // Clamp to valid range
            newPos = this._clampPosition(newPos, index)

            this._positions[index] = newPos
            this._updateHandlePositions()

            this.dispatchEvent(new CustomEvent('input', {
                detail: { index, position: newPos, positions: [...this._positions] }
            }))
        }

        const onTouchEnd = () => {
            document.removeEventListener('touchmove', onTouchMove)
            document.removeEventListener('touchend', onTouchEnd)

            this.dispatchEvent(new CustomEvent('change', {
                detail: { index, positions: [...this._positions] }
            }))
        }

        document.addEventListener('touchmove', onTouchMove, { passive: false })
        document.addEventListener('touchend', onTouchEnd)
    }

    _clampPosition(position, index) {
        // Clamp to 0-1
        position = Math.max(0, Math.min(1, position))

        // Get neighbor positions
        const prevPos = index > 0 ? this._positions[index - 1] : 0
        const nextPos = index < this._positions.length - 1 ? this._positions[index + 1] : 1

        // Don't allow crossing neighbors (with small epsilon for numerical stability)
        const epsilon = 0.001
        position = Math.max(prevPos + epsilon, position)
        position = Math.min(nextPos - epsilon, position)

        return position
    }

    _onDelete(index) {
        if (this.hasAttribute('disabled')) return
        if (this._colors.length <= 2) return // Minimum 2 colors

        this._colors.splice(index, 1)
        this._positions.splice(index, 1)

        if (this._selectedIndex >= this._colors.length) {
            this._selectedIndex = this._colors.length - 1
        } else if (this._selectedIndex === index) {
            this._selectedIndex = Math.min(index, this._colors.length - 1)
        } else if (this._selectedIndex > index) {
            this._selectedIndex--
        }

        this._render()

        this.dispatchEvent(new CustomEvent('delete', {
            detail: { index, positions: [...this._positions], colors: [...this._colors] }
        }))
    }
}

customElements.define('gradient-stops', GradientStops)

export { GradientStops }
