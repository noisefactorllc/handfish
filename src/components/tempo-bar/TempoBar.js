// <tempo-bar> — a compact transport tempo control:
//
//   [tap] [bpm] [/divider] bpm  ● ● ● ●  [phase reset] phase [====slider====]
//
// Owns a BeatScheduler (a free-running beat clock by default) and wires it to a
// tap button, an editable BPM field, a divider dropdown, four beat-indicator
// lights, a phase-reset button, and a phase-nudge slider — all built from
// handfish primitives (.hf-icon-btn, .hf-number, <select-dropdown>, <slider-value>).
//
// Attributes:  bpm, divider, storage-key, manual (skip auto-start),
//              min-bpm / max-bpm (default 40 / 300), no-divider, no-phase
// Properties:  scheduler (the BeatScheduler), bpm, divider
// Methods:     start(), stop(), tap(), resetPhase(), barSeconds(),
//              showBeat(beatInBar) — drive the beat lights from an external clock
// Events:      'change'  detail {bpm}            — BPM changed (any source)
//              'dividerchange' detail {divider}  — divider changed
//              'beat'    detail {bpm, beatIndex, beatInBar, barIndex, isDownbeat}
import { BeatScheduler, DIVIDER_OPTIONS } from './beatScheduler.js'

const STYLE_ID = 'hf-tempo-bar-styles'
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    tempo-bar { display:inline-flex; align-items:center; gap:var(--hf-space-2);
      font-family:var(--hf-font-family); color:var(--hf-text-normal); }
    tempo-bar .tempo-bar__group { display:inline-flex; align-items:center; gap:var(--hf-space-1); }
    tempo-bar .tempo-bar__bpm { width:4.5em; text-align:right; }
    tempo-bar .tempo-bar__divider { min-width:3.5em; }
    tempo-bar .tempo-bar__label { font-size:var(--hf-size-xs); color:var(--hf-text-dim);
      text-transform:lowercase; letter-spacing:.04em; }
    tempo-bar .tempo-bar__beats { display:inline-flex; align-items:center; gap:5px; }
    tempo-bar .tempo-bar__beat { width:8px; height:8px; border-radius:50%;
      background:var(--hf-border-subtle); transition:background .08s ease, box-shadow .08s ease; }
    tempo-bar .tempo-bar__beat.is-down { width:10px; height:10px; }
    tempo-bar .tempo-bar__beat.is-on { background:var(--hf-accent); box-shadow:0 0 6px var(--hf-accent); }
    tempo-bar .tempo-bar__beat.is-down.is-on { background:var(--hf-red); box-shadow:0 0 6px var(--hf-red); }
    tempo-bar .tempo-bar__tap.is-flash { color:var(--hf-accent-hover); background:var(--hf-bg-elevated); }
    tempo-bar .tempo-bar__phase { display:inline-flex; align-items:center; gap:var(--hf-space-1); width:7em; }
  `
  document.head.appendChild(s)
}

export class TempoBar extends HTMLElement {
  connectedCallback() {
    injectStyles()
    if (!this._built) this._build()
    if (!this.hasAttribute('manual')) this._scheduler.start()
  }

  disconnectedCallback() {
    this._scheduler?.stop()
  }

  _build() {
    this._built = true
    const bpm = Number(this.getAttribute('bpm')) || 120
    const divider = Number(this.getAttribute('divider')) || 4
    const storageKey = this.getAttribute('storage-key') || null
    const minBpm = Number(this.getAttribute('min-bpm')) || 40
    const maxBpm = Number(this.getAttribute('max-bpm')) || 300
    this._noDivider = this.hasAttribute('no-divider')
    this._noPhase = this.hasAttribute('no-phase')
    this._scheduler = new BeatScheduler({ bpm, divider, storageKey, minBpm, maxBpm })

    const opts = DIVIDER_OPTIONS.map((d) => `<option value="${d}">/${d}</option>`).join('')
    const dividerHtml = this._noDivider
      ? ''
      : `<select-dropdown class="tempo-bar__divider" aria-label="Tempo divider">${opts}</select-dropdown>`
    const phaseHtml = this._noPhase
      ? ''
      : `
      <button class="hf-icon-btn tooltip tempo-bar__reset" type="button" data-title="Reset phase" aria-label="Reset phase">
        <span class="hf-icon">restart_alt</span>
      </button>
      <div class="tempo-bar__group">
        <span class="tempo-bar__label">phase</span>
        <div class="tempo-bar__phase">
          <slider-value class="tempo-bar__phase-slider" type="float" min="0" max="1" step="0.01" value="0" aria-label="Phase"></slider-value>
        </div>
      </div>`
    this.innerHTML = `
      <button class="hf-icon-btn tooltip tempo-bar__tap" type="button" data-title="Tap tempo" aria-label="Tap tempo">
        <span class="hf-icon">touch_app</span>
      </button>
      <div class="tempo-bar__group">
        <input class="hf-number tempo-bar__bpm" type="number" min="${minBpm}" max="${maxBpm}" step="0.1" aria-label="Tempo (BPM)">
        ${dividerHtml}
        <span class="tempo-bar__label">bpm</span>
      </div>
      <div class="tempo-bar__beats" aria-hidden="true">
        <span class="tempo-bar__beat is-down" data-beat="0"></span>
        <span class="tempo-bar__beat" data-beat="1"></span>
        <span class="tempo-bar__beat" data-beat="2"></span>
        <span class="tempo-bar__beat" data-beat="3"></span>
      </div>
      ${phaseHtml}`

    this._els = {
      tap: this.querySelector('.tempo-bar__tap'),
      bpm: this.querySelector('.tempo-bar__bpm'),
      divider: this.querySelector('.tempo-bar__divider'),
      beats: [...this.querySelectorAll('.tempo-bar__beat')],
      reset: this.querySelector('.tempo-bar__reset'),
      phase: this.querySelector('.tempo-bar__phase-slider'),
    }

    // Initialize sub-controls from the scheduler.
    this._els.bpm.value = this._formatBpm(this._scheduler.bpm)
    if (this._els.divider) this._els.divider.setAttribute('value', String(this._scheduler.divider))

    this._wire()
  }

  _formatBpm(v) {
    return String(Math.round(v * 10) / 10)
  }

  _wire() {
    const sch = this._scheduler

    // Tap button.
    this._els.tap.addEventListener('click', () => sch.tap())

    // BPM field — push to scheduler on edit.
    const onBpmInput = () => { sch.bpm = Number(this._els.bpm.value) }
    this._els.bpm.addEventListener('input', onBpmInput)
    this._els.bpm.addEventListener('change', onBpmInput)

    // Divider dropdown (optional).
    if (this._els.divider) {
      this._els.divider.addEventListener('change', () => { sch.divider = Number(this._els.divider.value) })
    }

    // Phase reset + phase nudge (optional).
    if (this._els.reset) {
      this._els.reset.addEventListener('click', () => { sch.resetPhase(); if (this._els.phase) this._els.phase.value = 0 })
    }
    if (this._els.phase) {
      this._els.phase.addEventListener('input', () => sch.setPhaseOffset(Number(this._els.phase.value)))
    }

    // Scheduler → UI + re-emitted DOM events.
    sch.onChange((v) => {
      // Don't clobber the field mid-edit.
      if (document.activeElement !== this._els.bpm) this._els.bpm.value = this._formatBpm(v)
      this.dispatchEvent(new CustomEvent('change', { detail: { bpm: v }, bubbles: true }))
    })
    sch.onDividerChange((v) => {
      if (this._els.divider) this._els.divider.setAttribute('value', String(v))
      this.dispatchEvent(new CustomEvent('dividerchange', { detail: { divider: v }, bubbles: true }))
    })
    sch.onTap(() => {
      this._els.tap.classList.add('is-flash')
      setTimeout(() => this._els.tap.classList.remove('is-flash'), 100)
    })
    sch.onBeat((payload) => {
      this.showBeat(payload.beatInBar)
      this.dispatchEvent(new CustomEvent('beat', { detail: payload, bubbles: true }))
    })
  }

  /** Light the beat-indicator dot for `beatInBar` (0..3). Lets an app that owns
   *  its own clock (e.g. a sequencer transport in `manual` mode) drive the beat
   *  lights instead of the bundled scheduler. */
  showBeat(beatInBar) {
    for (const dot of this._els.beats) dot.classList.toggle('is-on', Number(dot.dataset.beat) === beatInBar)
  }

  // ---- Public API -----------------------------------------------------------
  get scheduler() { return this._scheduler }
  get bpm() { return this._scheduler?.bpm }
  set bpm(v) { if (this._scheduler) this._scheduler.bpm = v }
  get divider() { return this._scheduler?.divider }
  set divider(v) { if (this._scheduler) this._scheduler.divider = v }
  start() { this._scheduler?.start() }
  stop() { this._scheduler?.stop() }
  tap(now) { return this._scheduler?.tap(now) }
  resetPhase() { this._scheduler?.resetPhase() }
  barSeconds() { return this._scheduler?.barSeconds() }
}

if (typeof customElements !== 'undefined' && !customElements.get('tempo-bar')) {
  customElements.define('tempo-bar', TempoBar)
}
