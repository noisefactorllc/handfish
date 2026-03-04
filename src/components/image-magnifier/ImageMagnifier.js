/**
 * Image Magnifier Web Component
 *
 * Shows a zoomed-in view of an image under the cursor to help with precise color picking.
 * Displays a magnified circle with crosshairs and the color value at the center pixel.
 *
 * @module components/image-magnifier/ImageMagnifier
 */

import { rgbToHex } from '../../utils/colorConversions.js'

// ============================================================================
// Constants
// ============================================================================

const MAGNIFIER_SIZE = 120
const ZOOM_LEVEL = 8

// ============================================================================
// Style Injection
// ============================================================================

const IMAGE_MAGNIFIER_STYLES_ID = 'hf-image-magnifier-styles'

if (!document.getElementById(IMAGE_MAGNIFIER_STYLES_ID)) {
    const styleEl = document.createElement('style')
    styleEl.id = IMAGE_MAGNIFIER_STYLES_ID
    styleEl.textContent = `
        image-magnifier {
            position: fixed;
            pointer-events: none;
            z-index: 10000;
            display: none;
            --mag-size: ${MAGNIFIER_SIZE}px;
            --mag-border: var(--hf-border-subtle, #4a5568);
            --mag-bg: var(--hf-bg-base, #1a202c);
            --mag-text: var(--hf-text-normal, #e2e8f0);
            --mag-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        image-magnifier[active] {
            display: block;
        }

        image-magnifier .magnifier-container {
            position: relative;
            width: var(--mag-size);
            height: var(--mag-size);
        }

        image-magnifier .magnifier-lens {
            width: var(--mag-size);
            height: var(--mag-size);
            border-radius: 50%;
            border: 2px solid var(--mag-border);
            box-shadow: var(--mag-shadow);
            overflow: hidden;
            position: relative;
            background: var(--mag-bg);
        }

        image-magnifier .magnifier-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
        }

        image-magnifier .magnifier-crosshair {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }

        image-magnifier .magnifier-crosshair::before,
        image-magnifier .magnifier-crosshair::after {
            content: '';
            position: absolute;
            background: rgba(255, 255, 255, 0.8);
            box-shadow: 0 0 1px rgba(0, 0, 0, 0.8);
        }

        /* Horizontal line */
        image-magnifier .magnifier-crosshair::before {
            width: 20px;
            height: 1px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }

        /* Vertical line */
        image-magnifier .magnifier-crosshair::after {
            width: 1px;
            height: 20px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }

        image-magnifier .magnifier-center-pixel {
            position: absolute;
            top: 50%;
            left: 50%;
            width: ${ZOOM_LEVEL}px;
            height: ${ZOOM_LEVEL}px;
            transform: translate(-50%, -50%);
            border: 1px solid rgba(255, 255, 255, 0.9);
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
            pointer-events: none;
        }

        image-magnifier .magnifier-info {
            position: absolute;
            bottom: -28px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--mag-bg);
            border: 1px solid var(--mag-border);
            border-radius: var(--hf-radius-sm, 0.25rem);
            padding: 2px 8px;
            font-family: var(--hf-font-family-mono, monospace);
            font-size: var(--hf-size-xs, 0.625rem);
            color: var(--mag-text);
            white-space: nowrap;
            box-shadow: var(--mag-shadow);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        image-magnifier .magnifier-color-preview {
            width: 12px;
            height: 12px;
            border-radius: var(--hf-radius-sm, 0.25rem);
            border: 1px solid rgba(255, 255, 255, 0.3);
            flex-shrink: 0;
        }
    `
    document.head.appendChild(styleEl)
}

// ============================================================================
// Image Magnifier Component
// ============================================================================

class ImageMagnifier extends HTMLElement {
    static get observedAttributes() {
        return ['active', 'zoom', 'size']
    }

    constructor() {
        super()

        /** @type {HTMLCanvasElement|null} Source canvas to magnify */
        this._sourceCanvas = null

        /** @type {CanvasRenderingContext2D|null} */
        this._sourceCtx = null

        /** @type {HTMLCanvasElement|null} Magnifier canvas */
        this._magnifierCanvas = null

        /** @type {CanvasRenderingContext2D|null} */
        this._magnifierCtx = null

        /** @type {number} Zoom level */
        this._zoom = ZOOM_LEVEL

        /** @type {number} Magnifier size */
        this._size = MAGNIFIER_SIZE

        /** @type {{r: number, g: number, b: number}|null} Current center color */
        this._centerColor = null

        /** @type {boolean} */
        this._rendered = false

        /** @type {number} Offset X from cursor */
        this._offsetX = 0

        /** @type {number} Offset Y from cursor */
        this._offsetY = 0
    }

    connectedCallback() {
        if (!this._rendered) {
            this._render()
            this._rendered = true
        }
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal) return

        switch (name) {
            case 'zoom':
                this._zoom = parseInt(newVal, 10) || ZOOM_LEVEL
                break
            case 'size':
                this._size = parseInt(newVal, 10) || MAGNIFIER_SIZE
                this.style.setProperty('--mag-size', `${this._size}px`)
                break
        }
    }

    // ========================================================================
    // Public API
    // ========================================================================

    /**
     * Attach the magnifier to a source canvas
     * @param {HTMLCanvasElement} canvas - The canvas to magnify
     */
    attach(canvas) {
        if (this._sourceCanvas) {
            this.detach()
        }

        this._sourceCanvas = canvas
        this._sourceCtx = canvas.getContext('2d', { willReadFrequently: true })

        // Set up event listeners on the canvas
        this._onMouseMove = this._handleMouseMove.bind(this)
        this._onMouseEnter = this._handleMouseEnter.bind(this)
        this._onMouseLeave = this._handleMouseLeave.bind(this)

        canvas.addEventListener('mousemove', this._onMouseMove)
        canvas.addEventListener('mouseenter', this._onMouseEnter)
        canvas.addEventListener('mouseleave', this._onMouseLeave)
    }

    /**
     * Detach the magnifier from the current source
     */
    detach() {
        if (this._sourceCanvas) {
            this._sourceCanvas.removeEventListener('mousemove', this._onMouseMove)
            this._sourceCanvas.removeEventListener('mouseenter', this._onMouseEnter)
            this._sourceCanvas.removeEventListener('mouseleave', this._onMouseLeave)
        }

        this._sourceCanvas = null
        this._sourceCtx = null
        this.hide()
    }

    /**
     * Show the magnifier
     */
    show() {
        this.setAttribute('active', '')
    }

    /**
     * Hide the magnifier
     */
    hide() {
        this.removeAttribute('active')
    }

    /**
     * Get the current center color
     * @returns {{r: number, g: number, b: number}|null}
     */
    get centerColor() {
        return this._centerColor
    }

    /**
     * Check if magnifier is active
     * @returns {boolean}
     */
    get active() {
        return this.hasAttribute('active')
    }

    // ========================================================================
    // Internal: Rendering
    // ========================================================================

    _render() {
        this.innerHTML = `
            <div class="magnifier-container">
                <div class="magnifier-lens">
                    <canvas class="magnifier-canvas" width="${this._size}" height="${this._size}"></canvas>
                    <div class="magnifier-crosshair"></div>
                    <div class="magnifier-center-pixel"></div>
                </div>
                <div class="magnifier-info">
                    <span class="magnifier-color-preview"></span>
                    <span class="magnifier-hex">#000000</span>
                </div>
            </div>
        `

        this._magnifierCanvas = this.querySelector('.magnifier-canvas')
        this._magnifierCtx = this._magnifierCanvas?.getContext('2d')
    }

    // ========================================================================
    // Internal: Event Handling
    // ========================================================================

    _handleMouseEnter() {
        this.show()
    }

    _handleMouseLeave() {
        this.hide()
    }

    _handleMouseMove(e) {
        if (!this._sourceCanvas || !this._sourceCtx || !this._magnifierCtx) return

        const rect = this._sourceCanvas.getBoundingClientRect()

        // Get position in canvas coordinates
        const scaleX = this._sourceCanvas.width / rect.width
        const scaleY = this._sourceCanvas.height / rect.height

        const canvasX = Math.floor((e.clientX - rect.left) * scaleX)
        const canvasY = Math.floor((e.clientY - rect.top) * scaleY)

        // Update magnifier content
        this._updateMagnifierView(canvasX, canvasY)

        // Position the magnifier near the cursor
        this._positionMagnifier(e.clientX, e.clientY)
    }

    _updateMagnifierView(centerX, centerY) {
        if (!this._sourceCtx || !this._magnifierCtx || !this._magnifierCanvas) return

        const ctx = this._magnifierCtx
        const sourceCtx = this._sourceCtx
        const size = this._size
        const zoom = this._zoom

        // Calculate source region
        const sourceSize = Math.ceil(size / zoom)
        const halfSource = Math.floor(sourceSize / 2)

        const sx = centerX - halfSource
        const sy = centerY - halfSource

        // Clear the magnifier canvas
        ctx.clearRect(0, 0, size, size)

        // Create circular clip
        ctx.save()
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
        ctx.clip()

        // Draw magnified region
        const sourceCanvas = this._sourceCanvas

        // Use imageSmoothingEnabled = false for crisp pixel view
        ctx.imageSmoothingEnabled = false

        // Calculate actual source bounds (clamped to canvas)
        const actualSx = Math.max(0, sx)
        const actualSy = Math.max(0, sy)
        const actualEx = Math.min(sourceCanvas.width, sx + sourceSize)
        const actualEy = Math.min(sourceCanvas.height, sy + sourceSize)
        const actualWidth = actualEx - actualSx
        const actualHeight = actualEy - actualSy

        if (actualWidth > 0 && actualHeight > 0) {
            // Calculate destination position
            const destX = (actualSx - sx) * zoom
            const destY = (actualSy - sy) * zoom
            const destWidth = actualWidth * zoom
            const destHeight = actualHeight * zoom

            ctx.drawImage(
                sourceCanvas,
                actualSx, actualSy, actualWidth, actualHeight,
                destX, destY, destWidth, destHeight
            )
        }

        ctx.restore()

        // Get center pixel color
        if (centerX >= 0 && centerX < sourceCanvas.width &&
            centerY >= 0 && centerY < sourceCanvas.height) {
            const pixel = sourceCtx.getImageData(centerX, centerY, 1, 1).data
            this._centerColor = {
                r: pixel[0],
                g: pixel[1],
                b: pixel[2]
            }

            // Update info display
            this._updateColorInfo()
        }
    }

    _updateColorInfo() {
        if (!this._centerColor) return

        // rgbToHex expects {r,g,b} 0-255 — _centerColor is already 0-255
        const hex = rgbToHex(this._centerColor)

        const preview = this.querySelector('.magnifier-color-preview')
        const hexDisplay = this.querySelector('.magnifier-hex')

        if (preview) {
            preview.style.backgroundColor = hex
        }
        if (hexDisplay) {
            hexDisplay.textContent = hex
        }
    }

    _positionMagnifier(clientX, clientY) {
        const size = this._size
        const infoHeight = 32 // Approximate height of info panel below

        // Default position: offset from cursor
        let x = clientX + this._offsetX
        let y = clientY + this._offsetY

        // Check if magnifier would go off screen and flip if needed
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // Check right edge
        if (x + size > viewportWidth - 10) {
            x = clientX - size - this._offsetX
        }

        // Check bottom edge
        if (y + size + infoHeight > viewportHeight - 10) {
            y = clientY - size - infoHeight - this._offsetY
        }

        // Ensure we don't go off left/top edges
        x = Math.max(10, x)
        y = Math.max(10, y)

        this.style.left = `${x}px`
        this.style.top = `${y}px`
    }
}

// Register the custom element
customElements.define('image-magnifier', ImageMagnifier)

export { ImageMagnifier }
