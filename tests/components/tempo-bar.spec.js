import { test, expect } from '@playwright/test'

test.describe('tempo-bar', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/fixtures/tempo-bar.html', { waitUntil: 'load' })
        await page.waitForFunction(() => window.__ready === true)
    })

    test('builds the full control row', async ({ page }) => {
        const counts = await page.evaluate(() => {
            const el = document.getElementById('t')
            return {
                tap: el.querySelectorAll('.tempo-bar__tap').length,
                bpm: el.querySelectorAll('input.hf-number.tempo-bar__bpm').length,
                divider: el.querySelectorAll('select-dropdown.tempo-bar__divider').length,
                beats: el.querySelectorAll('.tempo-bar__beat').length,
                reset: el.querySelectorAll('.tempo-bar__reset').length,
                phase: el.querySelectorAll('slider-value.tempo-bar__phase-slider').length,
            }
        })
        expect(counts).toEqual({ tap: 1, bpm: 1, divider: 1, beats: 4, reset: 1, phase: 1 })
    })

    test('reflects initial bpm and divider', async ({ page }) => {
        const { bpm, divider, dividerSel } = await page.evaluate(() => {
            const el = document.getElementById('t')
            return {
                bpm: el.querySelector('.tempo-bar__bpm').value,
                divider: el.scheduler.divider,
                dividerSel: el.querySelector('.tempo-bar__divider').getAttribute('value'),
            }
        })
        expect(bpm).toBe('128')
        expect(divider).toBe(8)
        expect(dividerSel).toBe('8')
    })

    test('editing the BPM field updates the scheduler and emits change', async ({ page }) => {
        const { bpm, chg } = await page.evaluate(() => {
            window.__chg = []
            const el = document.getElementById('t')
            el.addEventListener('change', (e) => window.__chg.push(e.detail.bpm))
            const i = el.querySelector('.tempo-bar__bpm')
            i.value = '150'
            i.dispatchEvent(new Event('input', { bubbles: true }))
            return { bpm: el.bpm, chg: window.__chg }
        })
        expect(bpm).toBe(150)
        expect(chg).toContain(150)
    })

    test('changing the divider updates the scheduler and emits dividerchange', async ({ page }) => {
        const { divider, div } = await page.evaluate(() => {
            window.__div = []
            const el = document.getElementById('t')
            el.addEventListener('dividerchange', (e) => window.__div.push(e.detail.divider))
            const d = el.querySelector('.tempo-bar__divider')
            d.value = 16
            d.dispatchEvent(new Event('change', { bubbles: true }))
            return { divider: el.scheduler.divider, div: window.__div }
        })
        expect(divider).toBe(16)
        expect(div).toContain(16)
    })

    test('tap tempo drives the BPM (deterministic timestamps)', async ({ page }) => {
        const { bpm, field } = await page.evaluate(() => {
            const el = document.getElementById('t')
            for (let i = 0; i < 5; i++) el.tap(1000 + i * 480) // 480ms => 125 BPM
            return { bpm: el.bpm, field: el.querySelector('.tempo-bar__bpm').value }
        })
        expect(bpm).toBeCloseTo(125, 0)
        expect(field).toBe('125')
    })

    test('resetPhase lights the downbeat and emits a beat', async ({ page }) => {
        const { onDot, beats } = await page.evaluate(() => {
            window.__beats = []
            const el = document.getElementById('t')
            el.addEventListener('beat', (e) => window.__beats.push(e.detail.beatInBar))
            el.resetPhase()
            return {
                onDot: [...el.querySelectorAll('.tempo-bar__beat')].map((d) => d.classList.contains('is-on')),
                beats: window.__beats,
            }
        })
        expect(onDot).toEqual([true, false, false, false])
        expect(beats).toContain(0)
    })

    test('the reset button zeroes the phase slider', async ({ page }) => {
        await page.evaluate(() => {
            document.getElementById('t').querySelector('.tempo-bar__phase-slider').value = 0.5
        })
        await page.locator('#t .tempo-bar__reset').click()
        const v = await page.evaluate(() =>
            Number(document.getElementById('t').querySelector('.tempo-bar__phase-slider').value)
        )
        expect(v).toBe(0)
    })

    test('exposes the scheduler and proxied accessors', async ({ page }) => {
        const ok = await page.evaluate(() => {
            const el = document.getElementById('t')
            return !!el.scheduler && typeof el.barSeconds() === 'number' && el.bpm === el.scheduler.bpm
        })
        expect(ok).toBe(true)
    })

    // ---- sequencer configuration (no-divider/no-phase, min/max bpm, external clock) ----

    test('no-divider/no-phase hide those sections', async ({ page }) => {
        const r = await page.evaluate(() => {
            const el = document.getElementById('ts')
            return {
                divider: el.querySelectorAll('.tempo-bar__divider').length,
                phase: el.querySelectorAll('.tempo-bar__phase-slider').length,
                reset: el.querySelectorAll('.tempo-bar__reset').length,
                bpm: el.querySelectorAll('.tempo-bar__bpm').length,
                beats: el.querySelectorAll('.tempo-bar__beat').length,
            }
        })
        expect(r).toEqual({ divider: 0, phase: 0, reset: 0, bpm: 1, beats: 4 })
    })

    test('min/max BPM clamp is per-instance', async ({ page }) => {
        const r = await page.evaluate(() => {
            const def = document.getElementById('t') // 40..300
            const seq = document.getElementById('ts') // 24..280
            def.scheduler.bpm = 30
            const defFloor = def.scheduler.bpm
            seq.scheduler.bpm = 30
            const seqLow = seq.scheduler.bpm
            return { defFloor, seqLow, seqInitField: seq.querySelector('.tempo-bar__bpm').value }
        })
        expect(r.defFloor).toBe(40) // default bar floors at 40
        expect(r.seqLow).toBe(30) // sequencer bar allows down to its 24 floor
        expect(r.seqInitField).toBe('30')
    })

    test('showBeat lights the indicated dot (external clock)', async ({ page }) => {
        const on = await page.evaluate(() => {
            const el = document.getElementById('ts')
            el.showBeat(2)
            return [...el.querySelectorAll('.tempo-bar__beat')].map((d) => d.classList.contains('is-on'))
        })
        expect(on).toEqual([false, false, true, false])
    })
})
