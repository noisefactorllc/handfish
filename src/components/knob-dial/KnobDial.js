// <knob-dial> — a rotary knob with two interaction models, chosen per instance so
// a UI can mix both:
//
//   absolute (default)  — a bounded pot. Normalized value 0..1 shown three ways: a
//                         value-arc ring drawn as far as the value, a pointer, and
//                         the formatted value inside the cap. Drag/wheel/arrows set
//                         the value; double-click resets to default. Emits 'input'
//                         (live) and 'change' (commit). Map 0..1 to real units with
//                         the `format` property: knob.format = v => String(40+v*140).
//
//   endless (mode="endless") — a relative encoder. No fixed value: drag/wheel/arrows
//                         emit 'turn' {delta} (signed detents); a click emits 'press';
//                         double-click emits 'lock'. The app owns state and sets the
//                         text inside the cap via the `display` attribute/property.
//                         The pointer free-rotates; there is no level ring.
//
// Both modes: right-click or long-press emits 'learn' (MIDI-learn); a `cc` attribute
// shows a CC badge; a `selected` attribute draws the accent highlight; `label` sits
// below; `disabled` dims + disables.

const STYLES_ID = 'hf-knob-dial-styles'
const START = 135
const SWEEP = 270
const PX_PER_DETENT = 5

function injectStyles() {
  if (document.getElementById(STYLES_ID)) return
  const s = document.createElement('style')
  s.id = STYLES_ID
  s.textContent = `
    .knob-dial { position:relative; display:inline-flex; flex-direction:column; align-items:center;
      gap:2px; width:64px; user-select:none; -webkit-user-select:none; cursor:ns-resize; outline:none; }
    .knob-dial:focus-visible { outline:var(--hf-focus-ring-width) solid var(--hf-focus-ring-color);
      outline-offset:var(--hf-focus-ring-offset); border-radius:var(--hf-radius); }
    .knob-dial[disabled] { opacity:.45; pointer-events:none; }
    .knob-dial__dial { width:48px; height:48px; display:block; touch-action:none; }
    .knob-dial__track { fill:none; stroke:var(--hf-border-subtle); stroke-width:3; stroke-linecap:round; }
    .knob-dial__arc { fill:none; stroke:var(--hf-accent); stroke-width:3; stroke-linecap:round; }
    .knob-dial[mode="endless"] .knob-dial__arc { display:none; }
    .knob-dial__cap { fill:var(--hf-bg-elevated); stroke:var(--hf-border); stroke-width:1; }
    .knob-dial__ind { stroke:var(--hf-text-bright); stroke-width:2.5; stroke-linecap:round; }
    .knob-dial__value { position:absolute; top:0; left:50%; transform:translateX(-50%);
      width:48px; height:48px; display:flex; align-items:center; justify-content:center;
      font-family:var(--hf-font-family); font-size:var(--hf-size-sm); font-weight:var(--hf-weight-bold);
      color:var(--hf-text-bright); font-variant-numeric:tabular-nums; line-height:1; pointer-events:none; }
    .knob-dial__label { font-size:var(--hf-size-xs); color:var(--hf-text-dim); text-align:center;
      max-width:64px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .knob-dial__cc { font-size:9px; color:var(--hf-accent); letter-spacing:.04em; }
    .knob-dial[selected] .knob-dial__cap { stroke:var(--hf-accent); }
    .knob-dial[selected] .knob-dial__ind { stroke:var(--hf-accent); }
    .knob-dial[selected] .knob-dial__value { color:var(--hf-accent-hover); }
    .knob-dial[selected] .knob-dial__dial { filter:drop-shadow(0 0 4px var(--hf-accent)); }
  `
  document.head.appendChild(s)
}

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const [sx, sy] = polar(cx, cy, r, startDeg)
  const [ex, ey] = polar(cx, cy, r, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`
}

export class KnobDial extends HTMLElement {
  static get observedAttributes() {
    return ['value', 'label', 'unit', 'cc', 'disabled', 'mode', 'display']
  }

  constructor() {
    super()
    this._value = 0
    this._step = 0.01
    this._default = 0
    this._mode = 'absolute'
    this._display = ''
    this._angle = 0 // endless: accumulated pointer angle (radians)
    this._acc = 0 // endless: sub-detent drag accumulator
    this.format = (v) => String(Math.round(v * 100))
  }

  connectedCallback() {
    injectStyles()
    if (!this._built) this._build()
    this._render()
  }

  _build() {
    this._built = true
    this.classList.add('knob-dial')
    this._mode = this.getAttribute('mode') === 'endless' ? 'endless' : 'absolute'
    this.setAttribute('role', 'slider')
    if (!this.hasAttribute('tabindex')) this.tabIndex = this.hasAttribute('disabled') ? -1 : 0
    this.innerHTML = `
      <svg class="knob-dial__dial" viewBox="0 0 48 48" aria-hidden="true">
        <path class="knob-dial__track"></path>
        <path class="knob-dial__arc"></path>
        <circle class="knob-dial__cap" cx="24" cy="24" r="15"></circle>
        <line class="knob-dial__ind" x1="24" y1="24" x2="24" y2="24"></line>
      </svg>
      <div class="knob-dial__value"></div>
      <div class="knob-dial__label"></div>
      <div class="knob-dial__cc" hidden></div>`
    this._els = {
      track: this.querySelector('.knob-dial__track'),
      arc: this.querySelector('.knob-dial__arc'),
      ind: this.querySelector('.knob-dial__ind'),
      value: this.querySelector('.knob-dial__value'),
      label: this.querySelector('.knob-dial__label'),
      cc: this.querySelector('.knob-dial__cc'),
    }
    this._els.track.setAttribute('d', arcPath(24, 24, 18, START, START + SWEEP))
    if (this.hasAttribute('value')) this._value = this._clamp(this.getAttribute('value'))
    if (this.hasAttribute('display')) this._display = this.getAttribute('display')
    this._bind()
  }

  _bind() {
    this.addEventListener('pointerdown', (e) => this._onPointerDown(e))
    this.addEventListener('wheel', (e) => this._onWheel(e), { passive: false })
    this.addEventListener('dblclick', () => {
      if (this._mode === 'endless') this.dispatchEvent(new CustomEvent('lock', { bubbles: true }))
      else this._commit(this._default)
    })
    this.addEventListener('keydown', (e) => this._onKey(e))
    this.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      this.dispatchEvent(new CustomEvent('learn', { bubbles: true }))
    })
  }

  // ---- Public API -----------------------------------------------------------
  get value() { return this._value }
  set value(v) { this._value = this._clamp(v); this._render() }
  get default() { return this._default }
  set default(v) { this._default = this._clamp(v) }
  get step() { return this._step }
  set step(v) { this._step = Number(v) || 0.01 }
  get mode() { return this._mode }
  set mode(m) { this._mode = m === 'endless' ? 'endless' : 'absolute'; if (this._built) { this.setAttribute('mode', this._mode); this._render() } }
  get display() { return this._display }
  set display(t) { this._display = t == null ? '' : String(t); this._render() }

  _clamp(v) {
    v = Number(v)
    if (Number.isNaN(v)) v = 0
    return Math.min(1, Math.max(0, v))
  }

  attributeChangedCallback(name, _old, val) {
    if (name === 'value') this._value = this._clamp(val)
    else if (name === 'mode') this._mode = val === 'endless' ? 'endless' : 'absolute'
    else if (name === 'display') this._display = val == null ? '' : val
    else if (name === 'disabled') this.tabIndex = val != null ? -1 : 0
    if (this._built) this._render()
  }

  _render() {
    if (!this._els) return
    if (this._mode === 'endless') return this._renderEndless()

    const v = this._value
    const ang = START + v * SWEEP
    this._els.arc.setAttribute('d', arcPath(24, 24, 18, START, START + Math.max(0.0001, v) * SWEEP))
    const [ix1, iy1] = polar(24, 24, 10, ang)
    const [ix2, iy2] = polar(24, 24, 15, ang)
    this._setInd(ix1, iy1, ix2, iy2)
    const unit = this.getAttribute('unit') || ''
    this._els.value.textContent = this.format(v) + unit
    this._els.label.textContent = this.getAttribute('label') || ''
    this._renderCc()
    this.setAttribute('aria-valuemin', '0')
    this.setAttribute('aria-valuemax', '1')
    this.setAttribute('aria-valuenow', v.toFixed(3))
    this.setAttribute('aria-valuetext', this.format(v) + unit)
    const label = this.getAttribute('label')
    if (label) this.setAttribute('aria-label', label)
  }

  _renderEndless() {
    // Pointer free-rotates; no value-arc (hidden via CSS). The app owns the readout.
    const a = this._angle - Math.PI / 2 // up at angle 0
    this._setInd(24 + Math.cos(a) * 9, 24 + Math.sin(a) * 9, 24 + Math.cos(a) * 15, 24 + Math.sin(a) * 15)
    this._els.value.textContent = this._display || ''
    this._els.label.textContent = this.getAttribute('label') || ''
    this._renderCc()
    // Relative control: drop slider value semantics, keep an accessible name.
    this.removeAttribute('aria-valuemin')
    this.removeAttribute('aria-valuemax')
    this.removeAttribute('aria-valuenow')
    const label = this.getAttribute('label')
    if (label) this.setAttribute('aria-label', label)
  }

  _setInd(x1, y1, x2, y2) {
    this._els.ind.setAttribute('x1', x1.toFixed(2))
    this._els.ind.setAttribute('y1', y1.toFixed(2))
    this._els.ind.setAttribute('x2', x2.toFixed(2))
    this._els.ind.setAttribute('y2', y2.toFixed(2))
  }

  _renderCc() {
    const cc = this.getAttribute('cc')
    if (cc) { this._els.cc.hidden = false; this._els.cc.textContent = 'cc' + cc } else { this._els.cc.hidden = true }
  }

  // ---- Absolute helpers -----------------------------------------------------
  _emit(type) {
    this.dispatchEvent(new CustomEvent(type, { detail: { value: this._value }, bubbles: true }))
  }

  _commit(v) {
    this._value = this._clamp(v)
    this._render()
    this._emit('input')
    this._emit('change')
  }

  // ---- Endless helpers ------------------------------------------------------
  _turn(delta, e) {
    this._angle += delta * 0.32
    this._renderEndless()
    this.dispatchEvent(new CustomEvent('turn', {
      bubbles: true,
      detail: { delta, ctrl: !!(e && (e.ctrlKey || e.metaKey)), shift: !!(e && e.shiftKey) },
    }))
  }

  _press(e) {
    this.dispatchEvent(new CustomEvent('press', {
      bubbles: true,
      detail: { ctrl: !!(e && (e.ctrlKey || e.metaKey)) },
    }))
  }

  // ---- Interaction ----------------------------------------------------------
  _onPointerDown(e) {
    if (this.hasAttribute('disabled') || e.button === 2) return
    e.preventDefault()
    this.focus()
    const longPress = setTimeout(() => this.dispatchEvent(new CustomEvent('learn', { bubbles: true })), 600)

    if (this._mode === 'endless') {
      this._acc = 0
      let lastY = e.clientY
      let moved = false
      const move = (ev) => {
        const dy = ev.clientY - lastY
        lastY = ev.clientY
        if (Math.abs(dy) > 1) { moved = true; clearTimeout(longPress) }
        this._acc += -dy // up = increase
        let detents = 0
        while (this._acc >= PX_PER_DETENT) { detents++; this._acc -= PX_PER_DETENT }
        while (this._acc <= -PX_PER_DETENT) { detents--; this._acc += PX_PER_DETENT }
        if (detents) this._turn(detents, ev)
      }
      const up = (ev) => {
        clearTimeout(longPress)
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        if (!moved) this._press(ev) // a click with no drag
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      return
    }

    // absolute
    const startY = e.clientY
    const startV = this._value
    let moved = false
    const move = (ev) => {
      const dy = startY - ev.clientY
      if (Math.abs(dy) > 2) { moved = true; clearTimeout(longPress) }
      const fine = ev.shiftKey ? 0.25 : 1
      this._value = this._clamp(startV + (dy / 200) * fine)
      this._render()
      this._emit('input')
    }
    const up = () => {
      clearTimeout(longPress)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (moved) this._emit('change')
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  _onWheel(e) {
    if (this.hasAttribute('disabled')) return
    e.preventDefault()
    const dir = e.deltaY < 0 ? 1 : -1
    if (this._mode === 'endless') { this._turn(dir, e); return }
    const step = e.shiftKey ? this._step * 0.25 : this._step
    this._commit(this._value + dir * step)
  }

  _onKey(e) {
    if (this.hasAttribute('disabled')) return
    if (this._mode === 'endless') {
      let handled = true
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') this._turn(1, e)
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') this._turn(-1, e)
      else if (e.key === 'Enter' || e.key === ' ') this._press(e)
      else handled = false
      if (handled) e.preventDefault()
      return
    }
    const step = e.shiftKey ? this._step * 0.25 : this._step
    let handled = true
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') this._commit(this._value + step)
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') this._commit(this._value - step)
    else if (e.key === 'Home') this._commit(0)
    else if (e.key === 'End') this._commit(1)
    else handled = false
    if (handled) e.preventDefault()
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('knob-dial')) {
  customElements.define('knob-dial', KnobDial)
}
