// <led-matrix> — a micro-OLED-style inspector screen: a dense monochrome pixel
// grid (128x32) on near-black with a slight emissive glow. Renders a descriptor
// { label, value, mode, data, playhead } as a small label line, a large value,
// and an optional pattern preview (a Euclidean onset grid or a bar gauge).
//
// Colours are read from CSS custom properties at paint time (the canvas needs
// concrete values), with built-in fallbacks:
//   --hf-led-bg   background        (near-black)
//   --hf-led      lit pixel         (cyan)
//   --hf-led-dim  dim pixel / label (desaturated cyan)
//   --hf-led-hi   highlight pixel   (near-white cyan)
//
// Imperative API:    el.show({ label, value, mode, data, playhead })
// Declarative attrs: label, value, mode
import { GLYPHS, GLYPH_W, GLYPH_H } from './led-font.js'

const GRID_W = 128
const GRID_H = 32

const css = (name, fallback) => {
  if (typeof getComputedStyle === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

const STYLE_ID = 'hf-led-matrix-styles'
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    led-matrix { display:block; width:100%; height:100%; }
    led-matrix canvas { display:block; width:100%; height:100%; border-radius:4px; }
  `
  document.head.appendChild(s)
}

// Width in LEDs that a string occupies at the given integer scale.
function textWidthScaled(text, scale) {
  const n = String(text).length
  return n ? n * (GLYPH_W + 1) * scale - scale : 0
}

export class LedMatrix extends HTMLElement {
  static get observedAttributes() { return ['label', 'value', 'mode'] }

  constructor() {
    super()
    this._desc = { label: '', value: '', mode: 'value', data: {}, playhead: -1 }
  }

  connectedCallback() {
    injectStyles()
    if (!this._canvas) {
      this._canvas = document.createElement('canvas')
      this.appendChild(this._canvas)
      this._ctx = this._canvas.getContext('2d')
    }
    for (const name of ['label', 'value', 'mode']) {
      if (this.hasAttribute(name)) this._applyAttr(name, this.getAttribute(name))
    }
    this._ro?.disconnect()
    this._ro = new ResizeObserver(() => this._resize())
    this._ro.observe(this)
    this._resize()
  }

  disconnectedCallback() {
    this._ro?.disconnect()
    this._ro = null
  }

  attributeChangedCallback(name, _old, val) {
    this._applyAttr(name, val)
    this._paint()
  }

  _applyAttr(name, val) {
    if (name === 'mode') this._desc.mode = val || 'value'
    else this._desc[name] = val || ''
  }

  // Replace the descriptor and repaint.
  show(desc) {
    this._desc = { label: '', value: '', mode: 'value', data: {}, playhead: -1, ...desc }
    this._paint()
  }

  _resize() {
    if (!this._canvas) return
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const r = this.getBoundingClientRect()
    const w = Math.max(1, Math.floor(r.width))
    const h = Math.max(1, Math.floor(r.height))
    this._canvas.width = Math.floor(w * dpr)
    this._canvas.height = Math.floor(h * dpr)
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this._cssW = w
    this._cssH = h
    this._paint()
  }

  // Stamp text into a setPixel callback at an integer scale (row 0 = top).
  _stamp(setPixel, text, x, y, scale) {
    let cx = x
    for (const ch of String(text).toUpperCase()) {
      const g = GLYPHS[ch]
      if (g) {
        for (let row = 0; row < GLYPH_H; row++) {
          for (let col = 0; col < GLYPH_W; col++) {
            if (g[row][col] === '1') {
              for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) setPixel(cx + col * scale + dx, y + row * scale + dy)
              }
            }
          }
        }
      }
      cx += (GLYPH_W + 1) * scale
    }
  }

  _paint() {
    if (!this._ctx || !this._cssW) return
    const ctx = this._ctx
    const W = this._cssW
    const H = this._cssH
    const bg = css('--hf-led-bg', '#03060a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Fit the 128x32 grid into the element, centered, preserving square pixels.
    const pad = 4
    const cell = Math.max(1, Math.min((W - pad * 2) / GRID_W, (H - pad * 2) / GRID_H))
    const offX = (W - cell * GRID_W) / 2
    const offY = (H - cell * GRID_H) / 2
    const dot = Math.max(1, cell * 0.82)
    const inset = (cell - dot) / 2

    const bright = css('--hf-led', '#8fe9ff')
    const dim = css('--hf-led-dim', '#2c5e72')
    const hi = css('--hf-led-hi', '#e6fbff')

    const setPixel = (px, py, color) => {
      if (px < 0 || px >= GRID_W || py < 0 || py >= GRID_H) return
      const x = offX + px * cell + inset
      const y = offY + py * cell + inset
      ctx.shadowColor = color
      ctx.shadowBlur = dot * 0.7
      ctx.fillStyle = color
      ctx.fillRect(x, y, dot, dot)
    }

    const { label, value, mode, data, playhead } = this._desc

    // Top line: small dim label.
    this._stamp((x, y) => setPixel(x, y, dim), String(label || ''), 1, 0, 1)

    // Main line: big (2x) value, left-aligned; fall back to 1x if it won't fit.
    const v = String(value || '')
    const scale = textWidthScaled(v, 2) <= GRID_W - 2 ? 2 : 1
    const vy = scale === 2 ? 11 : 13
    this._stamp((x, y) => setPixel(x, y, bright), v, 1, vy, scale)
    const previewX = Math.min(GRID_W - 2, textWidthScaled(v, scale) + 6)

    if (mode === 'euclid') {
      this._paintEuclid(setPixel, data || {}, playhead ?? -1, previewX, bright, dim, hi)
    } else if (mode === 'bars') {
      this._paintBar(setPixel, data || {}, previewX, bright, dim)
    }
    ctx.shadowBlur = 0
  }

  _paintEuclid(setPixel, data, playhead, x0, bright, dim, hi) {
    const onsets = data.onsets || []
    const n = onsets.length
    if (!n) return
    const span = GRID_W - 1 - x0
    if (span < n) x0 = 1 // not enough room beside the value — use the full width
    const width = GRID_W - 1 - x0
    const base = 23 // baseline row in the main zone
    for (let i = 0; i < n; i++) {
      const px = x0 + Math.round((i * width) / n)
      const head = playhead >= 0 && i === playhead
      if (onsets[i]) {
        const c = head ? hi : bright
        for (let y = base - 5; y <= base; y++) setPixel(px, y, c) // tall pulse mark
      } else {
        setPixel(px, base, head ? hi : dim) // dim grid tick
      }
      if (head) {
        for (let y = 14; y <= 30; y++) setPixel(px, y, hi) // playhead column
      }
    }
  }

  _paintBar(setPixel, data, x0, bright, dim) {
    const frac = Math.max(0, Math.min(1, (data.value || 0) / (data.max || 1)))
    const x1 = GRID_W - 2
    const top = 17
    const bot = 27
    const width = x1 - x0
    if (width < 2) return
    for (let x = x0; x <= x1; x++) {
      setPixel(x, top, dim)
      setPixel(x, bot, dim)
    }
    for (let y = top; y <= bot; y++) {
      setPixel(x0, y, dim)
      setPixel(x1, y, dim)
    }
    const lit = Math.round(frac * (width - 2))
    for (let x = 0; x < lit; x++) {
      for (let y = top + 2; y <= bot - 2; y++) setPixel(x0 + 1 + x, y, bright)
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('led-matrix')) {
  customElements.define('led-matrix', LedMatrix)
}
