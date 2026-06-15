/**
 * BeatScheduler — drives a beat-level callback at the current BPM and owns the
 * tempo divider used to convert BPM into a visible animation-cycle duration.
 *
 * Two ways to set tempo:
 *   - manual:    set the BPM directly (a number input, or a MIDI-clock follower)
 *   - tap tempo: tap() repeatedly; a rolling average of inter-tap intervals
 *                becomes the BPM.
 *
 * The divider stretches one "bar" of animation across `divider` musical bars:
 * /1 = a cycle every bar (snappy), /4 = once every four bars (generative work
 * usually wants to breathe rather than strobe per beat).
 *
 * Uses setTimeout (not requestAnimationFrame) so beats keep firing when the tab
 * is backgrounded — browsers throttle rAF to ~1Hz on hidden tabs. setTimeout is
 * also throttled to ~1Hz while hidden, so on tab focus we re-anchor the phase
 * rather than firing a burst of catch-up beats.
 *
 * Persistence is opt-in: pass a `storageKey` to remember the divider in
 * localStorage. With no key, nothing is stored (safe for multiple instances).
 */

const MIN_BPM = 40
const MAX_BPM = 300

export const DIVIDER_OPTIONS = [1, 2, 4, 8, 16, 32]

/** Bar = 4 beats; the divider stretches the visible cycle across `divider` bars. */
export function computeBarSeconds(bpm, divider = 1) {
    return (60 / bpm) * 4 * divider
}

export class BeatScheduler {
    constructor({ bpm = 120, divider = 4, storageKey = null, minBpm = MIN_BPM, maxBpm = MAX_BPM } = {}) {
        this._minBpm = minBpm
        this._maxBpm = maxBpm
        this._bpm = Math.max(minBpm, Math.min(maxBpm, bpm))
        this._beatIndex = 0
        this._lastBeatMs = 0
        this._running = false
        this._timeoutId = null
        this._listeners = []
        this._changeListeners = []
        this._dividerListeners = []
        this._tapListeners = []
        this._tapTimes = []
        this._tapResetMs = 2000
        this._storageKey = storageKey
        this._divider = this._loadDivider(divider)
    }

    get bpm() { return this._bpm }
    set bpm(v) {
        const n = Number(v)
        if (!Number.isFinite(n) || n <= 0) return
        const clamped = Math.max(this._minBpm, Math.min(this._maxBpm, n))
        if (clamped === this._bpm) return
        this._bpm = clamped
        for (const cb of this._changeListeners) cb(this._bpm)
    }

    get divider() { return this._divider }
    set divider(v) {
        const n = Number(v)
        if (!DIVIDER_OPTIONS.includes(n)) return
        if (n === this._divider) return
        this._divider = n
        this._saveDivider(n)
        for (const cb of this._dividerListeners) cb(this._divider)
    }

    /** Seconds per visible animation cycle at the current BPM × divider. */
    barSeconds() {
        return computeBarSeconds(this._bpm, this._divider)
    }

    onChange(cb) { this._changeListeners.push(cb) }
    onDividerChange(cb) { this._dividerListeners.push(cb) }
    onTap(cb) { this._tapListeners.push(cb) }
    onBeat(cb) { this._listeners.push(cb) }

    _loadDivider(fallback) {
        const fb = DIVIDER_OPTIONS.includes(fallback) ? fallback : 4
        if (!this._storageKey || typeof localStorage === 'undefined') return fb
        try {
            const n = parseInt(localStorage.getItem(this._storageKey), 10)
            return DIVIDER_OPTIONS.includes(n) ? n : fb
        } catch { return fb }
    }

    _saveDivider(n) {
        if (!this._storageKey || typeof localStorage === 'undefined') return
        try { localStorage.setItem(this._storageKey, String(n)) } catch { /* ignore */ }
    }

    get bps() { return this._bpm / 60 }
    get beatIntervalMs() { return 60000 / this._bpm }
    get running() { return this._running }

    start() {
        if (this._running) return
        this._running = true
        this._lastBeatMs = performance.now()
        this._scheduleNext()
        if (typeof document !== 'undefined') {
            this._visHandler = () => {
                if (!document.hidden && this._running) {
                    this._lastBeatMs = performance.now()
                    if (this._timeoutId) clearTimeout(this._timeoutId)
                    this._scheduleNext()
                }
            }
            document.addEventListener('visibilitychange', this._visHandler)
        }
    }

    stop() {
        this._running = false
        if (this._timeoutId) clearTimeout(this._timeoutId)
        this._timeoutId = null
        if (this._visHandler && typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this._visHandler)
            this._visHandler = null
        }
    }

    _scheduleNext() {
        if (!this._running) return
        const now = performance.now()
        const nextBeatMs = this._lastBeatMs + this.beatIntervalMs
        const delay = Math.max(0, nextBeatMs - now)
        this._timeoutId = setTimeout(() => {
            if (!this._running) return
            this._lastBeatMs += this.beatIntervalMs
            this._beatIndex++
            this._emit()
            this._scheduleNext()
        }, delay)
    }

    /** Restart phase from this moment (used after a tap or BPM change). */
    resetPhase() {
        this._lastBeatMs = performance.now()
        this._beatIndex = 0
        this._emit()
        if (this._running) {
            if (this._timeoutId) clearTimeout(this._timeoutId)
            this._scheduleNext()
        }
    }

    setPhaseOffset(fraction) {
        const barMs = this.barSeconds() * 1000
        this._lastBeatMs = performance.now() - (fraction * barMs)
        this._beatIndex = Math.floor(fraction * 4 * this._divider)
        this._emit()
        if (this._running) {
            if (this._timeoutId) clearTimeout(this._timeoutId)
            this._scheduleNext()
        }
    }

    /** Fractional beat position 0..1 within the current beat. */
    get beatPhase() {
        const dt = performance.now() - this._lastBeatMs
        return Math.max(0, Math.min(1, dt / this.beatIntervalMs))
    }

    get beatIndex() { return this._beatIndex }
    get beatInBar() { return this._beatIndex % 4 }
    get barIndex() { return Math.floor(this._beatIndex / 4) }

    /**
     * Record a tap; returns the inferred BPM (0 until there are enough taps).
     * `now` defaults to performance.now(); tests may pass explicit timestamps so
     * inter-tap intervals are exact rather than relying on real-time spacing.
     */
    tap(now = performance.now()) {
        if (this._tapTimes.length > 0 && now - this._tapTimes[this._tapTimes.length - 1] > this._tapResetMs) {
            this._tapTimes = []
        }
        this._tapTimes.push(now)
        if (this._tapTimes.length > 8) this._tapTimes.shift()
        for (const cb of this._tapListeners) cb()
        if (this._tapTimes.length < 2) return 0
        const intervals = []
        for (let i = 1; i < this._tapTimes.length; i++) {
            intervals.push(this._tapTimes[i] - this._tapTimes[i - 1])
        }
        const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length
        const bpm = 60000 / avgMs
        if (bpm > this._minBpm && bpm < this._maxBpm) {
            this.bpm = bpm
            this.resetPhase()
        }
        return this._bpm
    }

    _emit() {
        const payload = {
            bpm: this._bpm,
            beatIndex: this._beatIndex,
            beatInBar: this.beatInBar,
            barIndex: this.barIndex,
            isDownbeat: this.beatInBar === 0,
        }
        for (const cb of this._listeners) {
            try { cb(payload) } catch (err) { console.error(err) }
        }
    }
}
