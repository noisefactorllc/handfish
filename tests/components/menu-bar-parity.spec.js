import { test, expect } from '@playwright/test'

// Per-app parity: mounts each app's full menu-bar config (transcribed from the
// live apps) and verifies the component renders every menu, item, label, id,
// link, shortcut, icon, and state exactly as configured — then exercises the
// app-specific behaviors (auth/mode gating, pull-based checkmarks, label
// swaps, split-button, segmented control, center label, delegation).

const APPS = ['noisedeck', 'polymorphic', 'shade', 'foundry', 'layers']

async function mountApp(page, app) {
    await page.goto('/examples/')
    await page.waitForLoadState('networkidle')
    await page.evaluate(async (name) => {
        for (const stale of document.querySelectorAll('menu-bar')) stale.remove()
        const mod = await import(`/tests/fixtures/menu-bar/${name}.config.mjs`)
        const el = document.createElement('menu-bar')
        el.id = 'mb-parity'
        el.config = mod.default()
        document.body.appendChild(el)
    }, app)
    return page.locator('#mb-parity')
}

const calls = page => page.evaluate(() => window.__parity.calls)

// Walks every 'menu' control in the mounted config and structurally compares
// the rendered panel to the config items. Returns a list of mismatch strings.
async function structuralMismatches(page) {
    return await page.evaluate(() => {
        const el = document.getElementById('mb-parity')
        const resolve = v => typeof v === 'function' ? v() : v
        const problems = []

        const checkItems = (items, panel, path) => {
            const children = [...panel.children]
            if (children.length !== items.length) {
                problems.push(`${path}: ${items.length} config items but ${children.length} rendered children`)
            }
            items.forEach((item, i) => {
                const child = children[i]
                const where = `${path}[${i}] (${item.id || item.type || 'action'})`
                if (!child) { problems.push(`${where}: missing element`); return }
                const type = item.type || (('checked' in item) ? 'checkbox' : 'action')
                if (type === 'separator') {
                    if (child.tagName !== 'HR' || !child.classList.contains('hf-menu-separator')) problems.push(`${where}: expected hr.hf-menu-separator, got ${child.tagName}.${child.className}`)
                    if (item.id && child.id !== item.id) problems.push(`${where}: id mismatch ${child.id}`)
                    if (!!resolve(item.hidden) !== child.hidden) problems.push(`${where}: hidden mismatch`)
                    return
                }
                if (type === 'header') {
                    if (!child.classList.contains('hf-menu-header')) problems.push(`${where}: expected .hf-menu-header`)
                    if (child.textContent !== (resolve(item.label) ?? '')) problems.push(`${where}: header text "${child.textContent}"`)
                    return
                }
                let itemEl = child
                if (type === 'submenu') {
                    if (!child.classList.contains('hf-menubar-submenu-holder')) { problems.push(`${where}: expected submenu holder`); return }
                    itemEl = child.querySelector('.hf-menu-item')
                    // subpanels render as wrapper-level siblings; the ARIA
                    // pair is the link
                    const sub = document.getElementById(itemEl?.getAttribute('aria-controls') || '')
                    if (!sub || !sub.classList.contains('hf-menubar-subpanel')) problems.push(`${where}: missing subpanel`)
                    else checkItems(item.items || [], sub, `${where}>sub`)
                }
                if (type === 'link') {
                    if (itemEl.tagName !== 'A') problems.push(`${where}: expected <a>, got ${itemEl.tagName}`)
                    if (item.href && itemEl.getAttribute('href') !== item.href) problems.push(`${where}: href "${itemEl.getAttribute('href')}"`)
                    if (item.target && itemEl.getAttribute('target') !== item.target) problems.push(`${where}: target`)
                    if ((item.rel || null) !== itemEl.getAttribute('rel')) problems.push(`${where}: rel "${itemEl.getAttribute('rel')}"`)
                }
                if (item.id && itemEl.id !== item.id) problems.push(`${where}: id "${itemEl.id}"`)
                const expectedRole = type === 'checkbox' ? 'menuitemcheckbox' : type === 'radio' ? 'menuitemradio' : 'menuitem'
                if (itemEl.getAttribute('role') !== expectedRole) problems.push(`${where}: role "${itemEl.getAttribute('role')}"`)
                const label = resolve(item.label) ?? ''
                const labelEl = itemEl.querySelector('.hf-menubar-item-label')
                if ((labelEl?.textContent ?? '') !== label) problems.push(`${where}: label "${labelEl?.textContent}" != "${label}"`)
                if (item.shortcut) {
                    const sc = itemEl.querySelector('.hf-menu-shortcut')
                    if (!sc || sc.textContent !== item.shortcut) problems.push(`${where}: shortcut "${sc?.textContent}"`)
                }
                if (item.icon) {
                    const ic = itemEl.querySelector('.hf-icon')
                    if (!ic || ic.textContent !== (resolve(item.icon) ?? '')) problems.push(`${where}: icon "${ic?.textContent}"`)
                }
                if (type === 'checkbox' || type === 'radio') {
                    if (itemEl.getAttribute('aria-checked') !== String(!!resolve(item.checked))) problems.push(`${where}: aria-checked`)
                }
                if (!!resolve(item.disabled) !== (itemEl.getAttribute('aria-disabled') === 'true')) problems.push(`${where}: aria-disabled mismatch`)
                if (type !== 'submenu' && !!resolve(item.hidden) !== itemEl.hidden) problems.push(`${where}: hidden mismatch`)
                if (item.classes) {
                    for (const cls of item.classes.split(/\s+/)) {
                        if (!itemEl.classList.contains(cls)) problems.push(`${where}: missing class ${cls}`)
                    }
                }
                if (item.attrs) {
                    for (const [k, v] of Object.entries(item.attrs)) {
                        if (itemEl.getAttribute(k) !== v) problems.push(`${where}: attr ${k}`)
                    }
                }
            })
        }

        const regions = el.config.regions || {}
        // Menu wrappers render in config order (left→center→right), so id-less
        // menus (Layers mirrors its id-less app markup) open via their trigger.
        const wrappers = [...el.querySelectorAll('.hf-menubar-menu')]
        let mi = 0
        for (const name of ['left', 'center', 'right']) {
            (regions[name] || []).forEach((control, ci) => {
                if (control.type !== 'menu') return
                const path = `${name}[${ci}] menu ${control.id || `#${mi}`}`
                const wrapper = wrappers[mi++]
                if (!wrapper) { problems.push(`${path}: no rendered wrapper`); return }
                wrapper.querySelector('.hf-menubar-trigger').click()   // opening refreshes dynamic state
                const panel = wrapper.querySelector('.hf-menubar-panel')
                if (!panel || panel.hidden) { problems.push(`${path}: did not open`); return }
                checkItems(control.items || [], panel, path)
                el.closeAll()
            })
        }
        return problems
    })
}

for (const app of APPS) {
    test(`${app}: full config renders with zero structural mismatches`, async ({ page }) => {
        await mountApp(page, app)
        expect(await structuralMismatches(page)).toEqual([])
    })
}

test('noisedeck: auth/mode gating, radio zoom, disabled pulls, split-button, badge, delegation', async ({ page }) => {
    const mb = await mountApp(page, 'noisedeck')

    // 5 dropdown triggers + randomizer caret = 6; left menus in order
    await expect(mb.locator('.hf-menubar-trigger')).toHaveCount(6)
    const labels = await mb.locator('.hf-menubar-left .hf-menubar-trigger').allTextContents()
    expect(labels.slice(1)).toEqual(['file', 'edit', 'view', 'program'])

    // auth gating: default signed-out
    await mb.locator('.hf-menubar-trigger').first().click()
    await expect(mb.locator('#signInMenuItem')).toBeVisible()
    await expect(mb.locator('#registerMenuItem')).toBeVisible()
    await expect(mb.locator('#manageAccountMenuItem')).toBeHidden()
    await expect(mb.locator('#signOutMenuItem')).toBeHidden()
    await page.evaluate(() => { window.__parity.state.auth = true; document.getElementById('mb-parity').refresh() })
    await expect(mb.locator('#signInMenuItem')).toBeHidden()
    await expect(mb.locator('#manageAccountMenuItem')).toBeVisible()
    await expect(mb.locator('#signOutMenuItem')).toBeVisible()

    // classic-mode choke point: badge + tutorial + convert appear, tray toggles disappear
    await expect(mb.locator('#classicModeBadge')).toBeHidden()
    await page.evaluate(() => { window.__parity.state.classic = true; document.getElementById('mb-parity').refresh() })
    await expect(mb.locator('#classicModeBadge')).toBeVisible()
    await expect(mb.locator('#showTutorialMenuItem')).toBeVisible()
    await expect(mb.locator('#toggleProgramTrayBtn')).toBeHidden()  // right-side button also mode-gated
    await mb.locator('.hf-menubar-trigger', { hasText: 'program' }).click()
    await expect(mb.locator('#toggleProgramTray')).toBeHidden()
    await expect(mb.locator('#trayToggleSeparator')).toBeHidden()
    await expect(mb.locator('#convertToFreeFormMenuItem')).toBeVisible()
    await expect(mb.locator('#goOnlineMenuItem')).toBeHidden()      // collab && !classic
    await page.evaluate(() => { window.__parity.state.classic = false; document.getElementById('mb-parity').refresh() })

    // view menu radio group: fit checked by default; zoom limits disable items
    await mb.locator('.hf-menubar-trigger', { hasText: 'view' }).click()
    await expect(mb.locator('#fitInWindowMenuItem')).toHaveAttribute('aria-checked', 'true')
    await expect(mb.locator('#zoomInMenuItem')).not.toHaveAttribute('aria-disabled', 'true')
    await mb.locator('#zoom200MenuItem').click()
    await mb.locator('.hf-menubar-trigger', { hasText: 'view' }).click()
    await expect(mb.locator('#zoom200MenuItem')).toHaveAttribute('aria-checked', 'true')
    await expect(mb.locator('#fitInWindowMenuItem')).toHaveAttribute('aria-checked', 'false')
    await expect(mb.locator('#zoomInMenuItem')).toHaveAttribute('aria-disabled', 'true')

    // edit menu disabled pulls
    await mb.locator('.hf-menubar-trigger', { hasText: 'edit' }).click()
    await expect(mb.locator('#undoMenuItem')).toHaveAttribute('aria-disabled', 'true')
    await page.evaluate(() => { window.__parity.state.canUndo = true; document.getElementById('mb-parity').refresh() })
    await expect(mb.locator('#undoMenuItem')).not.toHaveAttribute('aria-disabled', 'true')
    await mb.locator('#undoMenuItem').click()
    expect(await calls(page)).toContain('undoMenuItem')

    // split-button randomizer: primary runs current action; radio picks new default
    await mb.locator('#randomizerBtn').click()
    expect(await calls(page)).toContain('run:mutate')
    await mb.locator('.hf-menubar-right .hf-menubar-trigger').click()
    await expect(mb.locator('#randomizerMutate')).toHaveAttribute('aria-checked', 'true')
    await mb.locator('#randomizerWild').click()
    await expect(mb.locator('#randomizerBtn .hf-icon')).toHaveText('grass')
    await mb.locator('#randomizerBtn').click()
    expect(await calls(page)).toContain('run:wild')

    // dynamic label toggle re-pulls between opens
    await mb.locator('.hf-menubar-trigger', { hasText: 'program' }).click()
    await expect(mb.locator('#toggleProgramTray')).toHaveText(/hide dsl program/)
    await mb.locator('#toggleProgramTray').click()
    await mb.locator('.hf-menubar-trigger', { hasText: 'program' }).click()
    await expect(mb.locator('#toggleProgramTray')).toHaveText(/show dsl program/)

    // hamburger/command-palette delegation contract: programmatic click by id
    await page.evaluate(() => document.getElementById('savePNG').click())
    expect(await calls(page)).toContain('savePNG')

    // play/pause icon flip
    await expect(mb.locator('#playPauseBtn .hf-icon')).toHaveText('pause')
    await mb.locator('#playPauseBtn').click()
    await expect(mb.locator('#playPauseBtn .hf-icon')).toHaveText('play_arrow')
})

test('polymorphic: pull-based view checkmarks, collab pair, icon-button active sync', async ({ page }) => {
    const mb = await mountApp(page, 'polymorphic')
    const view = mb.locator('.hf-menubar-trigger', { hasText: 'view' })

    // initial state: editor + docs checked, others not
    await view.click()
    await expect(mb.locator('#viewMenuItem-editor')).toHaveAttribute('aria-checked', 'true')
    await expect(mb.locator('#viewMenuItem-docs')).toHaveAttribute('aria-checked', 'true')
    await expect(mb.locator('#viewMenuItem-live-inputs')).toHaveAttribute('aria-checked', 'false')
    // one-shot rows are plain actions, no aria-checked
    expect(await mb.locator('#viewMenuItem-gallery').getAttribute('aria-checked')).toBe(null)

    // external state change (e.g. panel closed via its own X) is pulled on next open
    await page.locator('body').click({ position: { x: 600, y: 400 } })
    await page.evaluate(() => { window.__parity.state.liveInputs = true })
    await view.click()
    await expect(mb.locator('#viewMenuItem-live-inputs')).toHaveAttribute('aria-checked', 'true')

    // toggling via the menu closes it and syncs the mirrored icon button
    await mb.locator('#viewMenuItem-docs').click()
    await expect(mb.locator('.hf-menubar-panel').nth(3)).toBeHidden()
    await expect(mb.locator('#doc-toggle-btn')).not.toHaveClass(/active/)
    await view.click()
    await expect(mb.locator('#viewMenuItem-docs')).toHaveAttribute('aria-checked', 'false')

    // collab kill-switch hides the separator+item pair
    await page.evaluate(() => { window.__parity.state.collab = false; document.getElementById('mb-parity').refresh() })
    await mb.locator('.hf-menubar-trigger', { hasText: 'program' }).click()
    await expect(mb.locator('#goOnlineMenuItem')).toBeHidden()
    await expect(mb.locator('#onlineCollabMenuSeparator')).toBeHidden()

    // 8 icon buttons with exact glyph order
    const icons = await mb.locator('.hf-menubar-right .hf-menubar-btn .hf-icon').allTextContents()
    expect(icons).toEqual(['collections', 'tune', 'fiber_manual_record', 'speed', 'info', 'code', 'fullscreen', 'pause'])
})

test('shade: label swaps, segmented backend switch, center filename', async ({ page }) => {
    const mb = await mountApp(page, 'shade')
    const effect = mb.locator('.hf-menubar-trigger', { hasText: 'effect' })

    // label-swapping toggles re-pull on every open
    await effect.click()
    await expect(mb.locator('#showParametersMenuItem')).toHaveText(/show parameters/)
    await mb.locator('#showParametersMenuItem').click()
    await effect.click()
    await expect(mb.locator('#showParametersMenuItem')).toHaveText(/hide parameters/)

    // backend switch: hidden until wgsl files exist; webgpu disabled without GPU
    await expect(mb.locator('#backend-switch')).toBeHidden()
    await page.evaluate(() => { window.__parity.state.hasWgslFiles = true; document.getElementById('mb-parity').refresh() })
    await expect(mb.locator('#backend-switch')).toBeVisible()
    await expect(mb.locator('#backend-webgl2')).toHaveAttribute('aria-pressed', 'true')
    await expect(mb.locator('#backend-webgpu')).toBeDisabled()
    await expect(mb.locator('#backend-webgpu')).toHaveAttribute('title', 'WebGPU not available in this browser')
    await page.evaluate(() => { window.__parity.state.gpuAvailable = true; document.getElementById('mb-parity').refresh() })
    await expect(mb.locator('#backend-webgpu')).toBeEnabled()
    await mb.locator('#backend-webgpu').click()
    await expect(mb.locator('#backend-webgpu')).toHaveAttribute('aria-pressed', 'true')
    await expect(mb.locator('#backend-webgl2')).toHaveAttribute('aria-pressed', 'false')

    // center filename mirrors editor state
    await expect(mb.locator('#menuFilename')).toHaveText('')
    await page.evaluate(() => {
        window.__parity.state.editorVisible = true
        window.__parity.state.filename = 'noise.wgsl'
        document.getElementById('mb-parity').refresh()
    })
    await expect(mb.locator('#menuFilename')).toHaveText('noise.wgsl')

    // sign out is an action item (navigate-away handler), not a link
    await mb.locator('.hf-menubar-trigger').first().click()
    expect(await mb.locator('#signOutMenuItem').evaluate(el => el.tagName)).toBe('BUTTON')
    await mb.locator('#signOutMenuItem').click()
    expect(await calls(page)).toContain('signOutMenuItem')
})

test('foundry: undo/redo disabled buttons, gated interactive filename', async ({ page }) => {
    const mb = await mountApp(page, 'foundry')

    // native disabled undo/redo, enabled after state change + refresh
    await expect(mb.locator('#undo-btn')).toBeDisabled()
    await expect(mb.locator('#redo-btn')).toBeDisabled()
    await page.evaluate(() => { window.__parity.state.canUndo = true; document.getElementById('mb-parity').refresh() })
    await expect(mb.locator('#undo-btn')).toBeEnabled()
    await mb.locator('#undo-btn').click()
    expect(await calls(page)).toContain('undo-btn')

    // filename label: interactive while the editor is visible
    await expect(mb.locator('#menuFilename')).toHaveText('untitled')
    await mb.locator('#menuFilename').click()
    expect(await calls(page)).toContain('menuFilename')

    // hide the editor: label empties and goes inert
    await page.evaluate(() => {
        window.__parity.calls.length = 0
        window.__parity.state.editorVisible = false
        document.getElementById('mb-parity').refresh()
    })
    await expect(mb.locator('#menuFilename')).toHaveText('')
    await page.evaluate(() => document.getElementById('menuFilename').click())
    expect(await calls(page)).toEqual([])

    // doc + dsl buttons start active (defaults on in Foundry)
    await expect(mb.locator('#doc-toggle-btn')).toHaveClass(/active/)
    await expect(mb.locator('#toggle-dsl-overlay')).toHaveClass(/active/)
})

test('layers: effect-leaf delegation attrs, 3-way layer action, zoom radios, gating', async ({ page }) => {
    const mb = await mountApp(page, 'layers')

    // filter taxonomy: open the glitch category, activate its data-params leaf
    await mb.locator('.hf-menubar-trigger', { hasText: 'filter' }).click()
    await mb.locator('#filterGlitchTrigger').click()
    const leaf = mb.locator('.hf-menubar-subpanel [role="menuitem"]', {
        has: page.locator('.hf-menubar-item-label', { hasText: /^glitch$/ }),
    })
    // delegation contract: closest('[data-effect]') from the clicked node
    // resolves inside the filterMenu wrapper with parseable data-params
    expect(await leaf.evaluate(el => {
        const hit = el.closest('[data-effect]')
        return {
            effect: hit?.getAttribute('data-effect'),
            params: JSON.parse(hit?.getAttribute('data-params') ?? 'null'),
            inFilterMenu: !!hit?.closest('#filterMenu'),
        }
    })).toEqual({
        effect: 'classicNoisedeck/glitch',
        params: { glitchiness: 50, aberration: 30 },
        inFilterMenu: true,
    })
    await leaf.click()
    expect(await calls(page)).toContain('effect:classicNoisedeck/glitch')
    await expect(mb.locator('.hf-menubar-panel').nth(6)).toBeHidden()   // activation closed the menu

    // 3-way layer action label pulled per open
    const layerTrigger = mb.locator('.hf-menubar-trigger', { hasText: 'layer' })
    await layerTrigger.click()
    await expect(mb.locator('#layerActionMenuItem')).toHaveText('flatten image')
    await expect(mb.locator('#duplicateLayerMenuItem')).toHaveAttribute('aria-disabled', 'true')
    await page.locator('body').click({ position: { x: 600, y: 400 } })
    await page.evaluate(() => { window.__parity.state.selectedLayerIds = ['a'] })
    await layerTrigger.click()
    await expect(mb.locator('#layerActionMenuItem')).toHaveText('rasterize layer')
    await expect(mb.locator('#duplicateLayerMenuItem')).not.toHaveAttribute('aria-disabled', 'true')
    await page.locator('body').click({ position: { x: 600, y: 400 } })
    await page.evaluate(() => { window.__parity.state.selectedLayerIds = ['a', 'b'] })
    await layerTrigger.click()
    await expect(mb.locator('#layerActionMenuItem')).toHaveText('flatten layers')

    // selection gating pulled on open (menu item + submenu sibling row)
    const imageTrigger = mb.locator('.hf-menubar-trigger', { hasText: 'image' })
    await imageTrigger.click()
    await expect(mb.locator('#cropToSelectionMenuItem')).toHaveAttribute('aria-disabled', 'true')
    await page.locator('body').click({ position: { x: 600, y: 400 } })
    await page.evaluate(() => { window.__parity.state.hasSelection = true })
    await imageTrigger.click()
    await expect(mb.locator('#cropToSelectionMenuItem')).not.toHaveAttribute('aria-disabled', 'true')

    // zoom radio group tracks state
    const viewTrigger = mb.locator('.hf-menubar-trigger', { hasText: 'view' })
    await viewTrigger.click()
    await expect(mb.locator('#fitInWindowMenuItem')).toHaveAttribute('aria-checked', 'true')
    await mb.locator('#zoom100MenuItem').click()
    expect(await calls(page)).toContain('zoom100MenuItem')
    await viewTrigger.click()
    await expect(mb.locator('#fitInWindowMenuItem')).toHaveAttribute('aria-checked', 'false')
    await expect(mb.locator('#zoom100MenuItem')).toHaveAttribute('aria-checked', 'true')
    await page.locator('body').click({ position: { x: 600, y: 400 } })

    // collab kill-switch hides the go-online separator+item pair
    await page.evaluate(() => { window.__parity.state.collab = false; document.getElementById('mb-parity').refresh() })
    await mb.locator('.hf-menubar-trigger', { hasText: 'file' }).click()
    await expect(mb.locator('#goOnlineMenuItem')).toBeHidden()
    await expect(mb.locator('#onlineCollabMenuSeparator')).toBeHidden()
    await page.locator('body').click({ position: { x: 600, y: 400 } })

    // play/pause icon re-pulled after activation
    await expect(mb.locator('#playPauseBtn .hf-icon')).toHaveText('pause')
    await mb.locator('#playPauseBtn').click()
    expect(await calls(page)).toContain('playPauseBtn')
    await expect(mb.locator('#playPauseBtn .hf-icon')).toHaveText('play_arrow')
})
