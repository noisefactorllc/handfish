/**
 * Color Wheel Web Component
 *
 * A modern, accessible color picker with support for RGB, HSV, and OKLCH color spaces.
 * Designed to replace native `<input type="color">` with a higher-quality UI.
 *
 * @module components/color-wheel/ColorWheel
 */

import {
    rgbToHsv, hsvToRgb,
    rgbToOklch, oklchToRgb, getMaxChroma,
    parseHex, rgbToHex, rgbToHexWithAlpha,
    clamp, normalizeHue, roundTo
} from '../../utils/colorConversions.js'

// ============================================================================
// Constants
// ============================================================================

const WHEEL_SIZE = 180
const SLIDER_WIDTH = 24
const SLIDER_HEIGHT = WHEEL_SIZE
const THUMB_RADIUS = 8
const WHEEL_INNER_RADIUS_RATIO = 0.15

// Step sizes for keyboard navigation
const STEPS = {
    normal: { hue: 1, sat: 1, value: 1, lightness: 1, chroma: 0.005 },
    shift: { hue: 10, sat: 10, value: 10, lightness: 10, chroma: 0.02 },
    alt: { hue: 0.1, sat: 0.1, value: 0.1, lightness: 0.1, chroma: 0.001 }
}

// ============================================================================
// Light DOM Style Injection
// ============================================================================

const COLOR_WHEEL_STYLES_ID = 'hf-color-wheel-styles'

if (!document.getElementById(COLOR_WHEEL_STYLES_ID)) {
    const styleEl = document.createElement('style')
    styleEl.id = COLOR_WHEEL_STYLES_ID
    styleEl.textContent = `
        color-wheel {
            display: inline-block;
            font-family: var(--hf-font-family, Nunito, system-ui, sans-serif);
            font-size: 12px;
            --cw-bg: var(--hf-color-2, #101522);
            --cw-border: color-mix(in srgb, var(--hf-accent-3, #a5b8ff) 25%, transparent 75%);
            --cw-text: var(--hf-color-6, #d9deeb);
            --cw-text-dim: var(--hf-color-5, #98a7c8);
            --cw-accent: var(--hf-accent-3, #a5b8ff);
            --cw-input-bg: var(--hf-color-1, #07090d);
            --cw-radius: var(--hf-radius-sm, 4px);
        }

        color-wheel[disabled] {
            opacity: 0.5;
            pointer-events: none;
        }

        color-wheel .color-wheel-container {
            background: var(--cw-bg);
            border: none;
            border-radius: var(--hf-radius, 8px);
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: fit-content;
        }

        color-wheel .wheel-area {
            display: flex;
            gap: 12px;
            align-items: stretch;
        }

        color-wheel .wheel-canvas-container {
            position: relative;
            width: ${WHEEL_SIZE}px;
            height: ${WHEEL_SIZE}px;
        }

        color-wheel .wheel-canvas {
            border-radius: 50%;
            cursor: crosshair;
        }

        color-wheel .wheel-thumb {
            position: absolute;
            width: ${THUMB_RADIUS * 2}px;
            height: ${THUMB_RADIUS * 2}px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3);
            pointer-events: none;
            transform: translate(-50%, -50%);
            z-index: 1;
        }

        color-wheel .slider-container {
            position: relative;
            width: ${SLIDER_WIDTH}px;
            height: ${SLIDER_HEIGHT}px;
        }

        color-wheel .slider-canvas {
            border-radius: var(--cw-radius);
            cursor: ns-resize;
        }

        color-wheel .slider-thumb {
            position: absolute;
            left: -2px;
            width: ${SLIDER_WIDTH + 4}px;
            height: 4px;
            background: white;
            border-radius: 2px;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3);
            pointer-events: none;
            transform: translateY(-50%);
        }

        color-wheel .preview-row {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        color-wheel .preview-swatches {
            display: flex;
            gap: 4px;
        }

        color-wheel .preview-swatch {
            width: 28px;
            height: 28px;
            border-radius: var(--cw-radius);
            border: 1px solid var(--cw-border);
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }

        color-wheel .preview-swatch::before {
            content: '';
            position: absolute;
            inset: 0;
            background: 
                linear-gradient(45deg, #888 25%, transparent 25%),
                linear-gradient(-45deg, #888 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #888 75%),
                linear-gradient(-45deg, transparent 75%, #888 75%);
            background-size: 8px 8px;
            background-position: 0 0, 0 4px, 4px -4px, -4px 0;
            opacity: 0.3;
        }

        color-wheel .preview-swatch-color {
            position: absolute;
            inset: 0;
        }

        color-wheel .preview-current {
            border-width: 2px;
        }

        color-wheel .hex-input-container {
            flex: 1;
        }

        color-wheel .hex-input {
            width: 100%;
            font-family: monospace;
            font-size: 12px;
            font-weight: 500;
            color: var(--cw-text);
            background: var(--cw-input-bg);
            border: 1px solid var(--cw-border);
            border-radius: var(--cw-radius);
            padding: 6px 8px;
            box-sizing: border-box;
            text-transform: lowercase;
        }

        color-wheel .hex-input:focus {
            outline: none;
            border-color: var(--cw-accent);
        }

        color-wheel .alpha-container {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        color-wheel .alpha-slider-container {
            position: relative;
            flex: 1;
            height: 12px;
        }

        color-wheel .alpha-slider-bg {
            position: absolute;
            inset: 0;
            border-radius: var(--cw-radius);
            overflow: hidden;
        }

        color-wheel .alpha-slider-bg::before {
            content: '';
            position: absolute;
            inset: 0;
            background: 
                linear-gradient(45deg, #888 25%, transparent 25%),
                linear-gradient(-45deg, #888 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #888 75%),
                linear-gradient(-45deg, transparent 75%, #888 75%);
            background-size: 8px 8px;
            background-position: 0 0, 0 4px, 4px -4px, -4px 0;
            opacity: 0.3;
        }

        color-wheel .alpha-slider-gradient {
            position: absolute;
            inset: 0;
            border-radius: var(--cw-radius);
        }

        color-wheel .alpha-slider-track {
            position: absolute;
            inset: 0;
            cursor: ew-resize;
        }

        color-wheel .alpha-slider-thumb {
            position: absolute;
            top: 50%;
            width: 4px;
            height: 16px;
            background: white;
            border-radius: 2px;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
            pointer-events: none;
            transform: translate(-50%, -50%);
        }

        color-wheel .alpha-value {
            font-family: monospace;
            font-size: 11px;
            color: var(--cw-text-dim);
            width: 32px;
            text-align: right;
        }

        color-wheel .mode-tabs {
            display: flex;
            gap: 0;
            background: var(--cw-input-bg);
            border-radius: var(--cw-radius);
            padding: 2px;
        }

        color-wheel .mode-tab {
            flex: 1;
            padding: 4px 8px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--cw-text-dim);
            background: transparent;
            border: none;
            border-radius: calc(var(--cw-radius) - 1px);
            cursor: pointer;
            transition: color 0.15s, background 0.15s;
        }

        color-wheel .mode-tab:hover {
            color: var(--cw-text);
        }

        color-wheel .mode-tab.active {
            color: var(--cw-text);
            background: var(--cw-bg);
        }

        color-wheel .inputs-panel {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }

        color-wheel .input-group {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        color-wheel .input-label {
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--cw-text-dim);
        }

        color-wheel .input-field {
            font-family: monospace;
            font-size: 11px;
            color: var(--cw-text);
            background: var(--cw-input-bg);
            border: 1px solid var(--cw-border);
            border-radius: var(--cw-radius);
            padding: 4px 6px;
            width: 100%;
            box-sizing: border-box;
            text-align: center;
        }

        color-wheel .input-field:focus {
            outline: none;
            border-color: var(--cw-accent);
        }

        /* Focus ring for accessibility */
        color-wheel .wheel-canvas:focus,
        color-wheel .slider-canvas:focus,
        color-wheel .alpha-slider-track:focus {
            outline: 2px solid var(--cw-accent);
            outline-offset: 2px;
        }

        color-wheel .wheel-canvas:focus {
            border-radius: 50%;
        }
    `
    document.head.appendChild(styleEl)
}

// ============================================================================
// Color Wheel Component
// ============================================================================

class ColorWheel extends HTMLElement {
    static formAssociated = true

    static get observedAttributes() {
        return ['value', 'alpha', 'mode', 'disabled', 'required', 'name']
    }

    constructor() {
        super()

        if (this.constructor.formAssociated) {
            this._internals = this.attachInternals?.()
        }

        this._rgb = { r: 0, g: 0, b: 0 }
        this._alpha = 1
        this._mode = 'hsv'
        this._preservedHue = 0
        this._hsv = { h: 0, s: 0, v: 0 }
        this._oklch = { l: 0, c: 0, h: 0 }

        this._wheelImageData = null
        this._wheelCacheKey = ''
        this._sliderImageData = null
        this._sliderCacheKey = ''

        this._isDraggingWheel = false
        this._isDraggingSlider = false
        this._isDraggingAlpha = false
        this._previousValue = '#000000'

        this._rendered = false
        this._listenersAttached = false
    }

    connectedCallback() {
        if (!this._rendered) {
            this._render()
            this._updateFromRGB()
            this._rendered = true
        }
        if (!this._listenersAttached) {
            this._setupEventListeners()
            this._listenersAttached = true
        }
        this._drawWheel()
        this._drawSlider()
        this._drawAlphaSlider()
        this._updateThumbs()
        this._updateInputs()
        this._updatePreview()
        this._updateFormValue()
    }

    disconnectedCallback() {}

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal) return

        switch (name) {
            case 'value':
                this._setValueFromAttribute(newVal)
                break
            case 'alpha':
                this._alpha = clamp(parseFloat(newVal) || 1, 0, 1)
                this._updateAlphaUI()
                break
            case 'mode':
                if (['rgb', 'hsv', 'oklch'].includes(newVal)) {
                    this._mode = newVal
                    this._updateModeUI()
                }
                break
            case 'disabled':
                this._updateDisabledState()
                break
        }
    }

    // Public API
    get value() {
        return rgbToHex(this._rgb)
    }

    set value(val) {
        const rgb = parseHex(val)
        if (rgb) {
            this._rgb = rgb
            this._updateFromRGB()
            this._redrawAll()
            this._updateFormValue()
        }
    }

    get alpha() {
        return this._alpha
    }

    set alpha(val) {
        this._alpha = clamp(val, 0, 1)
        this._updateAlphaUI()
    }

    get mode() {
        return this._mode
    }

    set mode(val) {
        if (['rgb', 'hsv', 'oklch'].includes(val)) {
            this._mode = val
            this._updateModeUI()
        }
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
        return this.getAttribute('name') || ''
    }

    set name(val) {
        this.setAttribute('name', val)
    }

    get valueWithAlpha() {
        return rgbToHexWithAlpha(this._rgb, this._alpha)
    }

    setColor(opts) {
        if (opts.value) {
            const rgb = parseHex(opts.value)
            if (rgb) {
                this._rgb = rgb
                this._updateFromRGB()
            }
        }
        if (typeof opts.alpha === 'number') {
            this._alpha = clamp(opts.alpha, 0, 1)
        }
        if (opts.mode && ['rgb', 'hsv', 'oklch'].includes(opts.mode)) {
            this._mode = opts.mode
        }
        this._redrawAll()
    }

    getColor() {
        return {
            value: this.value,
            alpha: this._alpha,
            rgb: { ...this._rgb },
            hsv: { ...this._hsv },
            oklch: { ...this._oklch }
        }
    }

    // Internal value management
    _setValueFromAttribute(hex) {
        const rgb = parseHex(hex)
        if (rgb) {
            this._rgb = rgb
            this._updateFromRGB()
            this._redrawAll()
        }
    }

    _updateFromRGB() {
        this._hsv = rgbToHsv(this._rgb)
        if (this._hsv.s > 0 && this._hsv.v > 0) {
            this._preservedHue = this._hsv.h
        } else {
            this._hsv.h = this._preservedHue
        }
        this._oklch = rgbToOklch(this._rgb)
        if (this._oklch.c > 0.001) {
            this._preservedHue = this._oklch.h
        } else {
            this._oklch.h = this._preservedHue
        }
    }

    _updateFromHSV() {
        if (this._hsv.s > 0 && this._hsv.v > 0) {
            this._preservedHue = this._hsv.h
        }
        this._rgb = hsvToRgb(this._hsv)
        this._oklch = rgbToOklch(this._rgb)
        if (this._oklch.c < 0.001) {
            this._oklch.h = this._preservedHue
        }
    }

    _updateFromOKLCH() {
        if (this._oklch.c > 0.001) {
            this._preservedHue = this._oklch.h
        }
        this._rgb = oklchToRgb(this._oklch)
        this._hsv = rgbToHsv(this._rgb)
        if (this._hsv.s < 0.01 || this._hsv.v < 0.01) {
            this._hsv.h = this._preservedHue
        }
    }

    _updateFormValue() {
        if (this._internals) {
            this._internals.setFormValue(this.value)
        }
    }

    // Rendering
    _render() {
        this.innerHTML = `
            <div class="color-wheel-container">
                <div class="wheel-area">
                    <div class="wheel-canvas-container">
                        <canvas class="wheel-canvas" width="${WHEEL_SIZE}" height="${WHEEL_SIZE}" tabindex="0" role="slider" aria-label="Color wheel"></canvas>
                        <div class="wheel-thumb"></div>
                    </div>
                    <div class="slider-container">
                        <canvas class="slider-canvas" width="${SLIDER_WIDTH}" height="${SLIDER_HEIGHT}" tabindex="0" role="slider" aria-label="Value slider"></canvas>
                        <div class="slider-thumb"></div>
                    </div>
                </div>
                
                <div class="preview-row">
                    <div class="preview-swatches">
                        <div class="preview-swatch preview-current" title="Current color">
                            <div class="preview-swatch-color" data-preview="current"></div>
                        </div>
                        <div class="preview-swatch preview-previous" title="Previous color (click to revert)">
                            <div class="preview-swatch-color" data-preview="previous"></div>
                        </div>
                    </div>
                    <div class="hex-input-container">
                        <input type="text" class="hex-input" placeholder="#000000" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex color value">
                    </div>
                </div>

                <div class="alpha-container">
                    <span class="input-label">α</span>
                    <div class="alpha-slider-container">
                        <div class="alpha-slider-bg"></div>
                        <div class="alpha-slider-gradient"></div>
                        <div class="alpha-slider-track" tabindex="0" role="slider" aria-label="Alpha" aria-valuemin="0" aria-valuemax="100"></div>
                        <div class="alpha-slider-thumb"></div>
                    </div>
                    <span class="alpha-value">100%</span>
                </div>

                <div class="mode-tabs">
                    <button class="mode-tab active" data-mode="hsv">HSV</button>
                    <button class="mode-tab" data-mode="oklch">OKLCH</button>
                </div>

                <div class="inputs-panel rgb-panel">
                    <div class="input-group">
                        <label class="input-label">R</label>
                        <input type="number" class="input-field" data-channel="r" min="0" max="255" step="1">
                    </div>
                    <div class="input-group">
                        <label class="input-label">G</label>
                        <input type="number" class="input-field" data-channel="g" min="0" max="255" step="1">
                    </div>
                    <div class="input-group">
                        <label class="input-label">B</label>
                        <input type="number" class="input-field" data-channel="b" min="0" max="255" step="1">
                    </div>
                </div>

                <div class="inputs-panel" data-mode="hsv">
                    <div class="input-group">
                        <label class="input-label">H°</label>
                        <input type="number" class="input-field" data-channel="h" min="0" max="360" step="1">
                    </div>
                    <div class="input-group">
                        <label class="input-label">S%</label>
                        <input type="number" class="input-field" data-channel="s" min="0" max="100" step="1">
                    </div>
                    <div class="input-group">
                        <label class="input-label">V%</label>
                        <input type="number" class="input-field" data-channel="v" min="0" max="100" step="1">
                    </div>
                </div>

                <div class="inputs-panel" data-mode="oklch" hidden>
                    <div class="input-group">
                        <label class="input-label">L%</label>
                        <input type="number" class="input-field" data-channel="l" min="0" max="100" step="0.1">
                    </div>
                    <div class="input-group">
                        <label class="input-label">C</label>
                        <input type="number" class="input-field" data-channel="c" min="0" max="0.4" step="0.005">
                    </div>
                    <div class="input-group">
                        <label class="input-label">H°</label>
                        <input type="number" class="input-field" data-channel="lch-h" min="0" max="360" step="0.1">
                    </div>
                </div>
            </div>
        `
    }

    _drawWheel() {
        const canvas = this.querySelector('.wheel-canvas')
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        const size = WHEEL_SIZE
        const center = size / 2
        const outerRadius = center - 2
        const innerRadius = outerRadius * WHEEL_INNER_RADIUS_RATIO

        const cacheKey = this._mode === 'oklch'
            ? `oklch-${roundTo(this._oklch.l, 2)}`
            : `hsv-${roundTo(this._hsv.v, 0)}`

        if (this._wheelCacheKey === cacheKey && this._wheelImageData) {
            ctx.putImageData(this._wheelImageData, 0, 0)
            return
        }

        const imageData = ctx.createImageData(size, size)
        const data = imageData.data

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - center
                const dy = y - center
                const dist = Math.sqrt(dx * dx + dy * dy)

                const idx = (y * size + x) * 4

                if (dist <= outerRadius && dist >= innerRadius) {
                    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
                    if (angle < 0) angle += 360

                    const satRadius = (dist - innerRadius) / (outerRadius - innerRadius)

                    let rgb
                    if (this._mode === 'oklch') {
                        const maxC = getMaxChroma(this._oklch.l, angle)
                        const c = satRadius * maxC
                        rgb = oklchToRgb({ l: this._oklch.l, c, h: angle })
                    } else {
                        rgb = hsvToRgb({ h: angle, s: satRadius * 100, v: this._hsv.v })
                    }

                    data[idx] = clamp(rgb.r, 0, 255)
                    data[idx + 1] = clamp(rgb.g, 0, 255)
                    data[idx + 2] = clamp(rgb.b, 0, 255)
                    data[idx + 3] = 255
                } else {
                    data[idx + 3] = 0
                }
            }
        }

        ctx.putImageData(imageData, 0, 0)
        this._wheelImageData = imageData
        this._wheelCacheKey = cacheKey
    }

    _drawSlider() {
        const canvas = this.querySelector('.slider-canvas')
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        const width = SLIDER_WIDTH
        const height = SLIDER_HEIGHT

        let cacheKey
        if (this._mode === 'oklch') {
            cacheKey = `oklch-${roundTo(this._oklch.c, 3)}-${roundTo(this._oklch.h, 1)}`
        } else {
            cacheKey = `hsv-${roundTo(this._hsv.h, 1)}-${roundTo(this._hsv.s, 0)}`
        }

        if (this._sliderCacheKey === cacheKey && this._sliderImageData) {
            ctx.putImageData(this._sliderImageData, 0, 0)
            return
        }

        const imageData = ctx.createImageData(width, height)
        const data = imageData.data

        for (let y = 0; y < height; y++) {
            const t = 1 - (y / (height - 1))

            let rgb
            if (this._mode === 'oklch') {
                rgb = oklchToRgb({ l: t, c: this._oklch.c, h: this._oklch.h })
            } else {
                rgb = hsvToRgb({ h: this._hsv.h, s: this._hsv.s, v: t * 100 })
            }

            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4
                data[idx] = clamp(rgb.r, 0, 255)
                data[idx + 1] = clamp(rgb.g, 0, 255)
                data[idx + 2] = clamp(rgb.b, 0, 255)
                data[idx + 3] = 255
            }
        }

        ctx.putImageData(imageData, 0, 0)
        this._sliderImageData = imageData
        this._sliderCacheKey = cacheKey
    }

    _drawAlphaSlider() {
        const gradient = this.querySelector('.alpha-slider-gradient')
        if (!gradient) return

        const hex = rgbToHex(this._rgb)
        gradient.style.background = `linear-gradient(to right, transparent, ${hex})`
    }

    _updateThumbs() {
        const wheelThumb = this.querySelector('.wheel-thumb')
        if (wheelThumb) {
            const center = WHEEL_SIZE / 2
            const outerRadius = center - 2
            const innerRadius = outerRadius * WHEEL_INNER_RADIUS_RATIO

            let hue, satNorm
            if (this._mode === 'oklch') {
                hue = this._oklch.h
                const maxC = getMaxChroma(this._oklch.l, this._oklch.h)
                satNorm = maxC > 0 ? this._oklch.c / maxC : 0
            } else {
                hue = this._hsv.h
                satNorm = this._hsv.s / 100
            }

            const angleRad = hue * (Math.PI / 180)
            const radius = innerRadius + satNorm * (outerRadius - innerRadius)

            const x = center + radius * Math.cos(angleRad)
            const y = center + radius * Math.sin(angleRad)

            wheelThumb.style.left = `${x}px`
            wheelThumb.style.top = `${y}px`
            wheelThumb.style.backgroundColor = rgbToHex(this._rgb)
        }

        const sliderThumb = this.querySelector('.slider-thumb')
        if (sliderThumb) {
            let valueNorm
            if (this._mode === 'oklch') {
                valueNorm = this._oklch.l
            } else {
                valueNorm = this._hsv.v / 100
            }

            const y = (1 - valueNorm) * SLIDER_HEIGHT
            sliderThumb.style.top = `${y}px`
        }

        const alphaThumb = this.querySelector('.alpha-slider-thumb')
        if (alphaThumb) {
            const container = this.querySelector('.alpha-slider-container')
            const width = container?.offsetWidth || 100
            alphaThumb.style.left = `${this._alpha * width}px`
        }

        const alphaTrack = this.querySelector('.alpha-slider-track')
        if (alphaTrack) {
            alphaTrack.setAttribute('aria-valuenow', Math.round(this._alpha * 100))
            alphaTrack.setAttribute('aria-valuetext', `${Math.round(this._alpha * 100)}%`)
        }
    }

    _updateInputs() {
        const rInput = this.querySelector('[data-channel="r"]')
        const gInput = this.querySelector('[data-channel="g"]')
        const bInput = this.querySelector('[data-channel="b"]')
        if (rInput) rInput.value = Math.round(this._rgb.r)
        if (gInput) gInput.value = Math.round(this._rgb.g)
        if (bInput) bInput.value = Math.round(this._rgb.b)

        const hInput = this.querySelector('[data-channel="h"]')
        const sInput = this.querySelector('[data-channel="s"]')
        const vInput = this.querySelector('[data-channel="v"]')
        if (hInput) hInput.value = Math.round(this._hsv.h)
        if (sInput) sInput.value = Math.round(this._hsv.s)
        if (vInput) vInput.value = Math.round(this._hsv.v)

        const lInput = this.querySelector('[data-channel="l"]')
        const cInput = this.querySelector('[data-channel="c"]')
        const lchHInput = this.querySelector('[data-channel="lch-h"]')
        if (lInput) lInput.value = roundTo(this._oklch.l * 100, 1)
        if (cInput) cInput.value = roundTo(this._oklch.c, 3)
        if (lchHInput) lchHInput.value = roundTo(this._oklch.h, 1)

        const hexInput = this.querySelector('.hex-input')
        if (hexInput && document.activeElement !== hexInput) {
            hexInput.value = this.value
        }

        const alphaValue = this.querySelector('.alpha-value')
        if (alphaValue) {
            alphaValue.textContent = `${Math.round(this._alpha * 100)}%`
        }
    }

    _updatePreview() {
        const current = this.querySelector('[data-preview="current"]')
        const previous = this.querySelector('[data-preview="previous"]')

        if (current) {
            const hex = this.value
            current.style.backgroundColor = hex
            current.style.opacity = this._alpha
        }

        if (previous) {
            previous.style.backgroundColor = this._previousValue
        }
    }

    _updateModeUI() {
        const tabs = this.querySelectorAll('.mode-tab')
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === this._mode)
        })

        const panels = this.querySelectorAll('.inputs-panel')
        panels.forEach(panel => {
            panel.hidden = panel.dataset.mode !== this._mode
        })

        this._wheelCacheKey = ''
        this._sliderCacheKey = ''
        this._drawWheel()
        this._drawSlider()
        this._updateThumbs()
    }

    _updateAlphaUI() {
        this._drawAlphaSlider()
        this._updateThumbs()
        this._updateInputs()
        this._updatePreview()
    }

    _updateDisabledState() {
        const container = this.querySelector('.color-wheel-container')
        if (container) {
            container.inert = this.disabled
        }
    }

    _redrawAll() {
        this._drawWheel()
        this._drawSlider()
        this._drawAlphaSlider()
        this._updateThumbs()
        this._updateInputs()
        this._updatePreview()
    }

    // Event handling
    _setupEventListeners() {
        const wheelCanvas = this.querySelector('.wheel-canvas')
        const sliderCanvas = this.querySelector('.slider-canvas')
        const alphaTrack = this.querySelector('.alpha-slider-track')
        const hexInput = this.querySelector('.hex-input')
        const modeTabs = this.querySelectorAll('.mode-tab')
        const channelInputs = this.querySelectorAll('.input-field')
        const previousSwatch = this.querySelector('.preview-previous')

        if (wheelCanvas) {
            wheelCanvas.addEventListener('pointerdown', (e) => this._onWheelPointerDown(e))
            wheelCanvas.addEventListener('keydown', (e) => this._onWheelKeyDown(e))
        }

        if (sliderCanvas) {
            sliderCanvas.addEventListener('pointerdown', (e) => this._onSliderPointerDown(e))
            sliderCanvas.addEventListener('keydown', (e) => this._onSliderKeyDown(e))
        }

        if (alphaTrack) {
            alphaTrack.addEventListener('pointerdown', (e) => this._onAlphaPointerDown(e))
            alphaTrack.addEventListener('keydown', (e) => this._onAlphaKeyDown(e))
        }

        if (hexInput) {
            hexInput.addEventListener('input', () => this._onHexInput())
            hexInput.addEventListener('change', () => this._onHexChange())
            hexInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this._onHexChange()
                    hexInput.blur()
                }
            })
        }

        modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this._mode = tab.dataset.mode
                this._updateModeUI()
            })
        })

        channelInputs.forEach(input => {
            input.addEventListener('input', () => this._onChannelInput(input))
            input.addEventListener('change', () => this._onChannelChange(input))
        })

        if (previousSwatch) {
            previousSwatch.addEventListener('click', () => this._revertToPrevious())
        }
    }

    _onWheelPointerDown(e) {
        if (this.disabled) return

        this._isDraggingWheel = true
        this._previousValue = this.value

        const canvas = e.currentTarget
        canvas.setPointerCapture(e.pointerId)

        this._updateFromWheelPosition(e)
        this._emitInput()

        const onMove = (e) => {
            if (!this._isDraggingWheel) return
            this._updateFromWheelPosition(e)
            this._emitInput()
        }

        const onUp = () => {
            this._isDraggingWheel = false
            canvas.removeEventListener('pointermove', onMove)
            canvas.removeEventListener('pointerup', onUp)
            this._emitChange()
        }

        canvas.addEventListener('pointermove', onMove)
        canvas.addEventListener('pointerup', onUp)
    }

    _updateFromWheelPosition(e) {
        const canvas = this.querySelector('.wheel-canvas')
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const center = WHEEL_SIZE / 2
        const outerRadius = center - 2
        const innerRadius = outerRadius * WHEEL_INNER_RADIUS_RATIO

        const dx = x - center
        const dy = y - center

        let angle = Math.atan2(dy, dx) * (180 / Math.PI)
        if (angle < 0) angle += 360

        let dist = Math.sqrt(dx * dx + dy * dy)
        dist = clamp(dist, innerRadius, outerRadius)
        const satNorm = (dist - innerRadius) / (outerRadius - innerRadius)

        if (this._mode === 'oklch') {
            this._oklch.h = angle
            const maxC = getMaxChroma(this._oklch.l, angle)
            this._oklch.c = satNorm * maxC
            this._updateFromOKLCH()
        } else {
            this._hsv.h = angle
            this._hsv.s = satNorm * 100
            this._updateFromHSV()
        }

        this._drawSlider()
        this._updateThumbs()
        this._updateInputs()
        this._updatePreview()
        this._drawAlphaSlider()
        this._updateFormValue()
    }

    _onSliderPointerDown(e) {
        if (this.disabled) return

        this._isDraggingSlider = true
        this._previousValue = this.value

        const canvas = e.currentTarget
        canvas.setPointerCapture(e.pointerId)

        this._updateFromSliderPosition(e)
        this._emitInput()

        const onMove = (e) => {
            if (!this._isDraggingSlider) return
            this._updateFromSliderPosition(e)
            this._emitInput()
        }

        const onUp = () => {
            this._isDraggingSlider = false
            canvas.removeEventListener('pointermove', onMove)
            canvas.removeEventListener('pointerup', onUp)
            this._emitChange()
        }

        canvas.addEventListener('pointermove', onMove)
        canvas.addEventListener('pointerup', onUp)
    }

    _updateFromSliderPosition(e) {
        const canvas = this.querySelector('.slider-canvas')
        const rect = canvas.getBoundingClientRect()
        const y = e.clientY - rect.top

        const valueNorm = clamp(1 - (y / SLIDER_HEIGHT), 0, 1)

        if (this._mode === 'oklch') {
            this._oklch.l = valueNorm
            this._updateFromOKLCH()
        } else {
            this._hsv.v = valueNorm * 100
            this._updateFromHSV()
        }

        this._drawWheel()
        this._updateThumbs()
        this._updateInputs()
        this._updatePreview()
        this._drawAlphaSlider()
        this._updateFormValue()
    }

    _onAlphaPointerDown(e) {
        if (this.disabled) return

        this._isDraggingAlpha = true

        const track = e.currentTarget
        track.setPointerCapture(e.pointerId)

        this._updateFromAlphaPosition(e)
        this._emitInput()

        const onMove = (e) => {
            if (!this._isDraggingAlpha) return
            this._updateFromAlphaPosition(e)
            this._emitInput()
        }

        const onUp = () => {
            this._isDraggingAlpha = false
            track.removeEventListener('pointermove', onMove)
            track.removeEventListener('pointerup', onUp)
            this._emitChange()
        }

        track.addEventListener('pointermove', onMove)
        track.addEventListener('pointerup', onUp)
    }

    _updateFromAlphaPosition(e) {
        const container = this.querySelector('.alpha-slider-container')
        const rect = container.getBoundingClientRect()
        const x = e.clientX - rect.left

        this._alpha = clamp(x / rect.width, 0, 1)
        this._updateAlphaUI()
    }

    _onHexInput() {
        if (this.disabled) return
        const input = this.querySelector('.hex-input')
        const rgb = parseHex(input.value)
        if (rgb) {
            this._rgb = rgb
            this._updateFromRGB()
            this._redrawAll()
            this._emitInput()
        }
    }

    _onHexChange() {
        if (this.disabled) return
        const input = this.querySelector('.hex-input')
        const rgb = parseHex(input.value)
        if (rgb) {
            this._rgb = rgb
            this._updateFromRGB()
            this._redrawAll()
            this._updateFormValue()
            this._emitChange()
        } else {
            input.value = this.value
        }
    }

    _onChannelInput(input) {
        const channel = input.dataset.channel
        const value = parseFloat(input.value) || 0

        switch (channel) {
            case 'r':
                this._rgb.r = clamp(value, 0, 255)
                this._updateFromRGB()
                break
            case 'g':
                this._rgb.g = clamp(value, 0, 255)
                this._updateFromRGB()
                break
            case 'b':
                this._rgb.b = clamp(value, 0, 255)
                this._updateFromRGB()
                break
            case 'h':
                this._hsv.h = normalizeHue(value)
                this._updateFromHSV()
                break
            case 's':
                this._hsv.s = clamp(value, 0, 100)
                this._updateFromHSV()
                break
            case 'v':
                this._hsv.v = clamp(value, 0, 100)
                this._updateFromHSV()
                break
            case 'l':
                this._oklch.l = clamp(value / 100, 0, 1)
                this._updateFromOKLCH()
                break
            case 'c':
                this._oklch.c = clamp(value, 0, 0.5)
                this._updateFromOKLCH()
                break
            case 'lch-h':
                this._oklch.h = normalizeHue(value)
                this._updateFromOKLCH()
                break
        }

        this._redrawAll()
        this._emitInput()
    }

    _onChannelChange(input) {
        this._onChannelInput(input)
        this._updateFormValue()
        this._emitChange()
    }

    _revertToPrevious() {
        const rgb = parseHex(this._previousValue)
        if (rgb) {
            this._rgb = rgb
            this._updateFromRGB()
            this._redrawAll()
            this._updateFormValue()
            this._emitChange()
        }
    }

    // Keyboard handlers
    _onWheelKeyDown(e) {
        const steps = e.shiftKey ? STEPS.shift : e.altKey ? STEPS.alt : STEPS.normal
        let handled = false

        switch (e.key) {
            case 'ArrowLeft':
                if (this._mode === 'oklch') {
                    this._oklch.h = normalizeHue(this._oklch.h - steps.hue)
                    this._updateFromOKLCH()
                } else {
                    this._hsv.h = normalizeHue(this._hsv.h - steps.hue)
                    this._updateFromHSV()
                }
                handled = true
                break
            case 'ArrowRight':
                if (this._mode === 'oklch') {
                    this._oklch.h = normalizeHue(this._oklch.h + steps.hue)
                    this._updateFromOKLCH()
                } else {
                    this._hsv.h = normalizeHue(this._hsv.h + steps.hue)
                    this._updateFromHSV()
                }
                handled = true
                break
            case 'ArrowUp':
                if (this._mode === 'oklch') {
                    this._oklch.c = clamp(this._oklch.c + steps.chroma, 0, 0.5)
                    this._updateFromOKLCH()
                } else {
                    this._hsv.s = clamp(this._hsv.s + steps.sat, 0, 100)
                    this._updateFromHSV()
                }
                handled = true
                break
            case 'ArrowDown':
                if (this._mode === 'oklch') {
                    this._oklch.c = clamp(this._oklch.c - steps.chroma, 0, 0.5)
                    this._updateFromOKLCH()
                } else {
                    this._hsv.s = clamp(this._hsv.s - steps.sat, 0, 100)
                    this._updateFromHSV()
                }
                handled = true
                break
        }

        if (handled) {
            e.preventDefault()
            this._redrawAll()
            this._updateFormValue()
            this._emitInput()
        }
    }

    _onSliderKeyDown(e) {
        const steps = e.shiftKey ? STEPS.shift : e.altKey ? STEPS.alt : STEPS.normal
        let handled = false

        switch (e.key) {
            case 'ArrowUp':
                if (this._mode === 'oklch') {
                    this._oklch.l = clamp(this._oklch.l + steps.lightness / 100, 0, 1)
                    this._updateFromOKLCH()
                } else {
                    this._hsv.v = clamp(this._hsv.v + steps.value, 0, 100)
                    this._updateFromHSV()
                }
                handled = true
                break
            case 'ArrowDown':
                if (this._mode === 'oklch') {
                    this._oklch.l = clamp(this._oklch.l - steps.lightness / 100, 0, 1)
                    this._updateFromOKLCH()
                } else {
                    this._hsv.v = clamp(this._hsv.v - steps.value, 0, 100)
                    this._updateFromHSV()
                }
                handled = true
                break
        }

        if (handled) {
            e.preventDefault()
            this._redrawAll()
            this._updateFormValue()
            this._emitInput()
        }
    }

    _onAlphaKeyDown(e) {
        const step = e.shiftKey ? 0.1 : e.altKey ? 0.01 : 0.05
        let handled = false

        switch (e.key) {
            case 'ArrowLeft':
                this._alpha = clamp(this._alpha - step, 0, 1)
                handled = true
                break
            case 'ArrowRight':
                this._alpha = clamp(this._alpha + step, 0, 1)
                handled = true
                break
        }

        if (handled) {
            e.preventDefault()
            this._updateAlphaUI()
            this._emitInput()
        }
    }

    _emitInput() {
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
        this.dispatchEvent(new CustomEvent('colorinput', {
            bubbles: true,
            composed: true,
            detail: this.getColor()
        }))
    }

    _emitChange() {
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
}

// Register the custom element
customElements.define('color-wheel', ColorWheel)

export { ColorWheel }
