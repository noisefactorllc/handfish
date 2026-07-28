import { test, expect } from '@playwright/test'

// Mounts a fresh <menu-bar> with the given config (passed as a JS expression
// string so configs can contain functions). Records menu-select/menu-open/
// menu-close events into window.__mbTest.events.
async function mount(page, configExpr, attrs = {}) {
    await page.goto('/examples/')
    await page.waitForLoadState('networkidle')
    await page.evaluate(({ expr, attributes }) => {
        for (const stale of document.querySelectorAll('menu-bar')) stale.remove()
        window.__mbTest = { events: [], calls: [] }
        const el = document.createElement('menu-bar')
        el.id = 'mb-test'
        for (const [k, v] of Object.entries(attributes)) el.setAttribute(k, v)
        for (const type of ['menu-select', 'menu-open', 'menu-close']) {
            el.addEventListener(type, e => window.__mbTest.events.push({ type, detail: e.detail || null }))
        }
        // eslint-disable-next-line no-new-func
        el.config = new Function(`return (${expr})`)()
        document.body.appendChild(el)
    }, { expr: configExpr, attributes: attrs })
    return page.locator('#mb-test')
}

const events = page => page.evaluate(() => window.__mbTest.events)
const calls = page => page.evaluate(() => window.__mbTest.calls)

const NDLIKE = `{
  regions: { left: [
    { type: 'menu', id: 'logo', trigger: { html: '<svg viewBox="0 0 10 10"></svg>', ariaLabel: 'App menu' }, items: [
        { type: 'link', id: 'aboutLink', label: 'about App', href: 'https://example.com/about/', target: '_blank', rel: 'noopener', classes: 'shimmer-text' },
        { type: 'separator' },
        { id: 'settingsItem', label: 'app settings', attrs: { 'data-tutorial': 'settings' } },
    ] },
    { type: 'menu', id: 'edit', trigger: { label: 'edit', id: 'editMenuTitle' }, items: [
        { id: 'undoItem', label: 'undo', shortcut: '⌘Z', disabled: true },
        { type: 'separator', id: 'sepA', hidden: true },
        { type: 'checkbox', id: 'gridItem', label: 'show grid', checked: true },
        { type: 'radio', id: 'zoom100', label: '100%', checked: false },
        { type: 'header', label: 'section' },
        { type: 'submenu', id: 'toneSub', label: 'tone', items: [ { id: 'toneUp', label: 'brighter' } ] },
        { id: 'deleteItem', label: 'delete…', destructive: true },
    ] },
  ] }
}`

test.describe('MenuBar rendering', () => {
    test('renders menus, triggers, and every item type with ids/attrs/roles', async ({ page }) => {
        const mb = await mount(page, NDLIKE)
        const triggers = mb.locator('.hf-menubar-trigger')
        await expect(triggers).toHaveCount(2)
        await expect(triggers.nth(0).locator('svg')).toHaveCount(1)
        await expect(triggers.nth(0)).toHaveAttribute('aria-label', 'App menu')
        await expect(triggers.nth(1)).toHaveText('edit')
        await expect(triggers.nth(1)).toHaveAttribute('id', 'editMenuTitle')
        await expect(triggers.nth(1)).toHaveAttribute('aria-haspopup', 'menu')
        await expect(triggers.nth(1)).toHaveAttribute('aria-expanded', 'false')

        const about = mb.locator('#aboutLink')
        await expect(about).toHaveAttribute('href', 'https://example.com/about/')
        await expect(about).toHaveAttribute('target', '_blank')
        await expect(about).toHaveAttribute('rel', 'noopener')
        await expect(about).toHaveClass(/shimmer-text/)
        await expect(about).toHaveAttribute('role', 'menuitem')

        await expect(mb.locator('#settingsItem')).toHaveAttribute('data-tutorial', 'settings')
        await expect(mb.locator('#undoItem')).toHaveAttribute('aria-disabled', 'true')
        await expect(mb.locator('#undoItem .hf-menu-shortcut')).toHaveText('⌘Z')
        await expect(mb.locator('#sepA')).toBeHidden()
        await expect(mb.locator('#gridItem')).toHaveAttribute('role', 'menuitemcheckbox')
        await expect(mb.locator('#gridItem')).toHaveAttribute('aria-checked', 'true')
        await expect(mb.locator('#zoom100')).toHaveAttribute('role', 'menuitemradio')
        await expect(mb.locator('#zoom100')).toHaveAttribute('aria-checked', 'false')
        await expect(mb.locator('#deleteItem')).toHaveClass(/hf-menu-item-destructive/)
        await expect(mb.locator('.hf-menu-header')).toHaveText('section')
        await expect(mb.locator('#toneSub')).toHaveAttribute('aria-haspopup', 'menu')
        await expect(mb.locator('.hf-menubar-subpanel #toneUp')).toHaveCount(1)

        // structural order in the logo panel: link, hr, action
        const order = await mb.locator('.hf-menubar-panel').first()
            .evaluate(el => [...el.children].map(c => c.tagName))
        expect(order).toEqual(['A', 'HR', 'BUTTON'])
        // panels start hidden
        await expect(mb.locator('.hf-menubar-panel').first()).toBeHidden()
    })
})

const TWOMENUS = `{
  regions: { left: [
    { type: 'menu', id: 'file', trigger: { label: 'file' }, items: [
        { id: 'newItem', label: 'new…', onSelect: () => window.__mbTest.calls.push('new') },
        { id: 'offItem', label: 'nope', disabled: true, onSelect: () => window.__mbTest.calls.push('nope') },
    ] },
    { type: 'menu', id: 'view', trigger: { label: 'view' }, items: [ { id: 'zoomItem', label: 'zoom' } ] },
  ] }
}`

test.describe('MenuBar interaction', () => {
    test('click opens, second click closes, sibling click switches, click-away closes', async ({ page }) => {
        const mb = await mount(page, TWOMENUS)
        const file = mb.locator('.hf-menubar-trigger', { hasText: 'file' })
        const view = mb.locator('.hf-menubar-trigger', { hasText: 'view' })
        const filePanel = mb.locator('.hf-menubar-panel').nth(0)
        const viewPanel = mb.locator('.hf-menubar-panel').nth(1)
        await file.click()
        await expect(filePanel).toBeVisible()
        await expect(file).toHaveAttribute('aria-expanded', 'true')
        await view.click()
        await expect(filePanel).toBeHidden()
        await expect(viewPanel).toBeVisible()
        await view.click()
        await expect(viewPanel).toBeHidden()
        await expect(view).toHaveAttribute('aria-expanded', 'false')
        await file.click()
        await page.locator('body').click({ position: { x: 500, y: 400 } })
        await expect(filePanel).toBeHidden()
        const evs = await events(page)
        expect(evs).toContainEqual({ type: 'menu-open', detail: { menuId: 'file' } })
        expect(evs).toContainEqual({ type: 'menu-close', detail: { menuId: 'file' } })
    })

    test('item activation runs onSelect, emits menu-select, closes; disabled items inert', async ({ page }) => {
        const mb = await mount(page, TWOMENUS)
        await mb.locator('.hf-menubar-trigger', { hasText: 'file' }).click()
        await mb.locator('#newItem').click()
        await expect(mb.locator('.hf-menubar-panel').nth(0)).toBeHidden()
        expect(await calls(page)).toEqual(['new'])
        expect((await events(page)).filter(e => e.type === 'menu-select'))
            .toEqual([{ type: 'menu-select', detail: { id: 'newItem', menuId: 'file', controlType: 'menu', itemType: 'action', checked: null } }])
        await mb.locator('.hf-menubar-trigger', { hasText: 'file' }).click()
        await mb.locator('#offItem').click({ force: true })
        expect(await calls(page)).toEqual(['new'])
    })

    test('programmatic click() on an item activates it (delegation contract)', async ({ page }) => {
        await mount(page, TWOMENUS)
        await page.evaluate(() => document.getElementById('newItem').click())
        expect(await calls(page)).toEqual(['new'])
    })

    test('Escape closes the open menu', async ({ page }) => {
        const mb = await mount(page, TWOMENUS)
        await mb.locator('.hf-menubar-trigger', { hasText: 'file' }).click()
        await page.keyboard.press('Escape')
        await expect(mb.locator('.hf-menubar-panel').nth(0)).toBeHidden()
    })

    test('hover switches between menus while one is open; hover-switch=off disables', async ({ page }) => {
        const mb = await mount(page, TWOMENUS)
        await mb.locator('.hf-menubar-trigger', { hasText: 'file' }).click()
        await mb.locator('.hf-menubar-trigger', { hasText: 'view' }).hover()
        await expect(mb.locator('.hf-menubar-panel').nth(1)).toBeVisible()
        const mb2 = await mount(page, TWOMENUS, { 'hover-switch': 'off' })
        await mb2.locator('.hf-menubar-trigger', { hasText: 'file' }).click()
        await mb2.locator('.hf-menubar-trigger', { hasText: 'view' }).hover()
        await expect(mb2.locator('.hf-menubar-panel').nth(1)).toBeHidden()
    })

    test('openMenu()/closeAll() methods and openMenuId getter', async ({ page }) => {
        const mb = await mount(page, TWOMENUS)
        await page.evaluate(() => document.getElementById('mb-test').openMenu('view'))
        await expect(mb.locator('.hf-menubar-panel').nth(1)).toBeVisible()
        expect(await page.evaluate(() => document.getElementById('mb-test').openMenuId)).toBe('view')
        await page.evaluate(() => document.getElementById('mb-test').closeAll())
        await expect(mb.locator('.hf-menubar-panel').nth(1)).toBeHidden()
        expect(await page.evaluate(() => document.getElementById('mb-test').openMenuId)).toBe(null)
    })

    test('submenu opens on click and closes with its parent menu', async ({ page }) => {
        const mb = await mount(page, NDLIKE)
        await mb.locator('#editMenuTitle').click()
        await mb.locator('#toneSub').click()
        await expect(mb.locator('.hf-menubar-subpanel')).toBeVisible()
        await expect(mb.locator('#toneSub')).toHaveAttribute('aria-expanded', 'true')
        await mb.locator('#toneUp').click()
        await expect(mb.locator('.hf-menubar-subpanel')).toBeHidden()
        await expect(mb.locator('.hf-menubar-panel').nth(1)).toBeHidden()
        const sel = (await events(page)).filter(e => e.type === 'menu-select').map(e => e.detail.id)
        expect(sel).toEqual(['toneUp'])
    })
})

test.describe('MenuBar dynamic state', () => {
    test('label/checked/disabled/hidden pull on open; update() and refresh() re-pull', async ({ page }) => {
        const mb = await mount(page, `(() => {
            window.__state = { dsl: false, canUndo: false, collab: false }
            return { regions: { left: [
                { type: 'menu', id: 'prog', trigger: { label: 'program' }, items: [
                    { id: 'toggleDsl', label: () => window.__state.dsl ? 'hide dsl program' : 'show dsl program',
                      onSelect: () => { window.__state.dsl = !window.__state.dsl } },
                    { id: 'undoItem', label: 'undo', disabled: () => !window.__state.canUndo },
                    { type: 'separator', id: 'collabSep', hidden: () => !window.__state.collab },
                    { type: 'checkbox', id: 'collabItem', label: 'go online…', hidden: () => !window.__state.collab, checked: () => false },
                ] },
            ] } }
        })()`)
        const trigger = mb.locator('.hf-menubar-trigger')
        await trigger.click()
        await expect(mb.locator('#toggleDsl')).toHaveText(/show dsl program/)
        await expect(mb.locator('#undoItem')).toHaveAttribute('aria-disabled', 'true')
        await expect(mb.locator('#collabSep')).toBeHidden()
        await expect(mb.locator('#collabItem')).toBeHidden()
        await mb.locator('#toggleDsl').click()          // flips state, closes
        await trigger.click()                            // re-open pulls again
        await expect(mb.locator('#toggleDsl')).toHaveText(/hide dsl program/)
        await page.evaluate(() => { window.__state.collab = true; document.getElementById('mb-test').refresh() })
        await expect(mb.locator('#collabSep')).not.toBeHidden()
        await expect(mb.locator('#collabItem')).not.toBeHidden()
        await page.evaluate(() => document.getElementById('mb-test').update('undoItem', { disabled: false }))
        await expect(mb.locator('#undoItem')).not.toHaveAttribute('aria-disabled', 'true')
    })
})

test.describe('MenuBar keyboard', () => {
    test('arrows roam bar and items, Enter activates, Escape returns focus', async ({ page }) => {
        const mb = await mount(page, TWOMENUS)
        await page.evaluate(() => document.querySelector('#mb-test .hf-menubar-trigger').focus())
        await page.keyboard.press('ArrowRight')
        await expect(mb.locator('.hf-menubar-trigger', { hasText: 'view' })).toBeFocused()
        await page.keyboard.press('ArrowLeft')
        await expect(mb.locator('.hf-menubar-trigger', { hasText: 'file' })).toBeFocused()
        await page.keyboard.press('ArrowDown')     // opens file, focuses first item
        await expect(mb.locator('.hf-menubar-panel').nth(0)).toBeVisible()
        await expect(mb.locator('#newItem')).toBeFocused()
        await page.keyboard.press('ArrowDown')     // skips disabled offItem, wraps to newItem
        await expect(mb.locator('#newItem')).toBeFocused()
        await page.keyboard.press('Enter')
        expect(await calls(page)).toEqual(['new'])
        await expect(mb.locator('.hf-menubar-panel').nth(0)).toBeHidden()
        await mb.locator('.hf-menubar-trigger', { hasText: 'file' }).click()
        await page.keyboard.press('Escape')
        await expect(mb.locator('.hf-menubar-trigger', { hasText: 'file' })).toBeFocused()
        await page.keyboard.press('ArrowRight')    // closed state: just roves
        await expect(mb.locator('.hf-menubar-trigger', { hasText: 'view' })).toBeFocused()
    })

    test('roving tabindex: exactly one top-level stop; open menu arrow-left/right moves between menus', async ({ page }) => {
        const mb = await mount(page, TWOMENUS)
        const zeroes = await mb.locator('[tabindex="0"]').count()
        expect(zeroes).toBe(1)
        await mb.locator('.hf-menubar-trigger', { hasText: 'file' }).click()
        await page.evaluate(() => document.getElementById('newItem').focus())
        await page.keyboard.press('ArrowRight')    // moves to view menu, opens it, focuses first item
        await expect(mb.locator('.hf-menubar-panel').nth(1)).toBeVisible()
        await expect(mb.locator('#zoomItem')).toBeFocused()
        await page.keyboard.press('Home')
        await expect(mb.locator('#zoomItem')).toBeFocused()
    })
})

const CONTROLS = `(() => {
    window.__cstate = { playing: true, backend: 'webgl2', file: '', gpuOk: false }
    return { regions: {
        center: [ { type: 'label', id: 'menuFilename', text: () => window.__cstate.file, interactive: () => !!window.__cstate.file,
                    onSelect: () => window.__mbTest.calls.push('label') } ],
        right: [
            { type: 'segmented', id: 'backendSwitch', ariaLabel: 'Rendering backend', buttons: [
                { id: 'backend-webgl2', label: 'WebGL2', pressed: () => window.__cstate.backend === 'webgl2',
                  onSelect: () => { window.__cstate.backend = 'webgl2' } },
                { id: 'backend-webgpu', label: 'WebGPU', pressed: () => window.__cstate.backend === 'webgpu',
                  disabled: () => !window.__cstate.gpuOk, title: () => window.__cstate.gpuOk ? 'Use WebGPU' : 'WebGPU unavailable' },
            ] },
            { type: 'separator' },
            { type: 'button', id: 'playPauseBtn', icon: () => window.__cstate.playing ? 'pause' : 'play_arrow',
              tooltip: () => window.__cstate.playing ? 'pause' : 'play', ariaLabel: 'Play/Pause',
              onSelect: () => { window.__cstate.playing = !window.__cstate.playing } },
            { type: 'badge', id: 'modeBadge', label: 'mode', hidden: () => window.__cstate.playing,
              onSelect: () => window.__mbTest.calls.push('badge') },
            { type: 'custom', id: 'appSlot' },
        ],
    } }
})()`

test.describe('MenuBar controls', () => {
    test('controls render and pull dynamic state; activation emits and re-pulls', async ({ page }) => {
        const mb = await mount(page, CONTROLS)
        await expect(mb.locator('#backendSwitch')).toHaveAttribute('role', 'group')
        await expect(mb.locator('#backendSwitch')).toHaveAttribute('aria-label', 'Rendering backend')
        await expect(mb.locator('#backend-webgl2')).toHaveAttribute('aria-pressed', 'true')
        await expect(mb.locator('#backend-webgpu')).toHaveAttribute('aria-pressed', 'false')
        await expect(mb.locator('#backend-webgpu')).toBeDisabled()
        await expect(mb.locator('#backend-webgpu')).toHaveAttribute('title', 'WebGPU unavailable')
        await expect(mb.locator('#playPauseBtn .hf-icon')).toHaveText('pause')
        await expect(mb.locator('#playPauseBtn')).toHaveAttribute('data-title', 'pause')
        await expect(mb.locator('#playPauseBtn')).toHaveClass(/tooltip/)
        await expect(mb.locator('#modeBadge')).toBeHidden()
        await expect(mb.locator('.hf-menubar-vseparator')).toHaveCount(1)

        await mb.locator('#playPauseBtn').click()
        await expect(mb.locator('#playPauseBtn .hf-icon')).toHaveText('play_arrow')
        await expect(mb.locator('#playPauseBtn')).toHaveAttribute('data-title', 'play')
        await expect(mb.locator('#modeBadge')).toBeVisible()
        const selects = (await events(page)).filter(e => e.type === 'menu-select')
        expect(selects.pop().detail)
            .toEqual({ id: 'playPauseBtn', menuId: null, controlType: 'button', itemType: null, checked: null })

        await mb.locator('#modeBadge').click()
        expect(await calls(page)).toContain('badge')

        // label control: empty + inert, then filled + interactive after refresh()
        await expect(mb.locator('#menuFilename')).toHaveText('')
        await page.evaluate(() => { window.__cstate.file = 'dsl.txt'; document.getElementById('mb-test').refresh() })
        await expect(mb.locator('#menuFilename')).toHaveText('dsl.txt')
        await mb.locator('#menuFilename').click()
        expect(await calls(page)).toContain('label')

        // segmented select emits with the button id
        await expect(mb.locator('#backend-webgl2')).toHaveAttribute('aria-pressed', 'true')
        const segSelects = (await events(page)).filter(e => e.type === 'menu-select' && e.detail.controlType === 'segmented')
        expect(segSelects.length).toBe(0)
        await mb.locator('#backend-webgl2').click()
        const segAfter = (await events(page)).filter(e => e.type === 'menu-select' && e.detail.controlType === 'segmented')
        expect(segAfter.pop().detail.id).toBe('backend-webgl2')

        // custom slot content survives refresh()
        await page.evaluate(() => { document.getElementById('appSlot').textContent = 'X'; document.getElementById('mb-test').refresh() })
        await expect(mb.locator('#appSlot')).toHaveText('X')
    })

    test('activating a bar control closes an open dropdown (stale-state guard)', async ({ page }) => {
        const mb = await mount(page, `{
            regions: {
                left: [ { type: 'menu', id: 'm', trigger: { label: 'm' }, items: [
                    { type: 'checkbox', id: 'chk', label: 'thing', checked: () => window.__cs, onSelect: () => {} },
                ] } ],
                right: [ { type: 'button', id: 'flipBtn', icon: 'bolt', ariaLabel: 'Flip',
                           onSelect: () => { window.__cs = !window.__cs } } ],
            }
        }`)
        await page.evaluate(() => { window.__cs = false })
        await mb.locator('.hf-menubar-trigger').click()
        await expect(mb.locator('#chk')).toHaveAttribute('aria-checked', 'false')
        await mb.locator('#flipBtn').click()
        // dropdown must close so it can't display stale state
        await expect(mb.locator('.hf-menubar-panel')).toBeHidden()
        expect(await page.evaluate(() => document.getElementById('mb-test').openMenuId)).toBe(null)
        await mb.locator('.hf-menubar-trigger').click()
        await expect(mb.locator('#chk')).toHaveAttribute('aria-checked', 'true')
    })

    test('custom slot content survives a full config re-assignment (sync)', async ({ page }) => {
        const mb = await mount(page, CONTROLS)
        await page.evaluate(() => {
            document.getElementById('appSlot').textContent = 'KEEP'
            const el = document.getElementById('mb-test')
            el.config = el.config
        })
        await expect(mb.locator('#appSlot')).toHaveText('KEEP')
    })
})

test.describe('MenuBar split-button, floating, bidi', () => {
    test('split-button: primary acts without opening; caret opens radio panel', async ({ page }) => {
        const mb = await mount(page, `(() => {
            window.__rand = { action: 'mutate' }
            return { regions: { right: [
                { type: 'menu', id: 'randomizer', align: 'right',
                  split: { id: 'randomizerBtn', icon: () => ({ mutate: 'genetics', randomize: 'casino' })[window.__rand.action],
                           ariaLabel: 'Randomize', tooltip: () => window.__rand.action,
                           onSelect: () => window.__mbTest.calls.push('run:' + window.__rand.action) },
                  trigger: { icon: 'arrow_drop_down', ariaLabel: 'Randomizer options' },
                  items: [
                    { type: 'radio', id: 'randMutate', label: 'mutate', icon: 'genetics', checked: () => window.__rand.action === 'mutate',
                      onSelect: () => { window.__rand.action = 'mutate'; window.__mbTest.calls.push('run:mutate') } },
                    { type: 'radio', id: 'randRandomize', label: 'randomize', icon: 'casino', checked: () => window.__rand.action === 'randomize',
                      onSelect: () => { window.__rand.action = 'randomize'; window.__mbTest.calls.push('run:randomize') } },
                  ] },
            ] } }
        })()`)
        await mb.locator('#randomizerBtn').click()
        expect(await calls(page)).toEqual(['run:mutate'])
        await expect(mb.locator('.hf-menubar-panel')).toBeHidden()
        await mb.locator('.hf-menubar-trigger').click()
        await expect(mb.locator('.hf-menubar-panel')).toBeVisible()
        await expect(mb.locator('#randMutate')).toHaveAttribute('aria-checked', 'true')
        await expect(mb.locator('#randRandomize')).toHaveAttribute('aria-checked', 'false')
        await mb.locator('#randRandomize').click()
        expect(await calls(page)).toEqual(['run:mutate', 'run:randomize'])
        await expect(mb.locator('#randomizerBtn .hf-icon')).toHaveText('casino')   // pulled after activation
        await expect(mb.locator('#randomizerBtn')).toHaveAttribute('data-title', 'randomize')
    })

    test('floating attribute pins the bar fixed with island width', async ({ page }) => {
        const mb = await mount(page, `{ regions: { left: [
            { type: 'menu', id: 'm1', trigger: { label: 'aaa' }, items: [{ id: 'i1', label: 'x' }] },
        ] } }`, { floating: '' })
        const style = await mb.locator('.hf-menubar').evaluate(el => {
            const cs = getComputedStyle(el)
            return { position: cs.position, top: cs.top, left: cs.left, width: cs.width }
        })
        expect(style.position).toBe('fixed')
        expect(style.top).toBe('0px')
        expect(style.left).toBe('0px')
        expect(Math.round(parseFloat(style.width))).toBe(582)
    })

    test('align start/end are logical under rtl; left/right stay physical', async ({ page }) => {
        const mb = await mount(page, `{ regions: { left: [
            { type: 'menu', id: 'mEnd', trigger: { label: 'endmenu' }, align: 'end', items: [{ id: 'e1', label: 'x' }] },
            { type: 'menu', id: 'mLeft', trigger: { label: 'leftmenu' }, align: 'left', items: [{ id: 'l1', label: 'y' }] },
        ] } }`)
        await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'))
        const endMenuWrapper = mb.locator('.hf-menubar-menu').nth(0)
        await endMenuWrapper.locator('.hf-menubar-trigger').click()
        const endPanel = mb.locator('.hf-menubar-panel').nth(0)
        const [pBox, wBox] = [await endPanel.boundingBox(), await endMenuWrapper.boundingBox()]
        // under rtl, inline-end === physical left: panel's LEFT edge aligns to wrapper's left
        expect(Math.abs(pBox.x - wBox.x)).toBeLessThanOrEqual(1)
        // physical left stays physical: panel shifted -10px from wrapper's left edge
        const leftMenuWrapper = mb.locator('.hf-menubar-menu').nth(1)
        await leftMenuWrapper.locator('.hf-menubar-trigger').click()
        const leftPanel = mb.locator('.hf-menubar-panel').nth(1)
        const [lp, lw] = [await leftPanel.boundingBox(), await leftMenuWrapper.boundingBox()]
        expect(Math.round(lp.x - lw.x)).toBe(-10)
        await page.evaluate(() => document.documentElement.removeAttribute('dir'))
    })
})

const LINKMENUS = `{
  regions: { left: [
    { type: 'menu', id: 'app', trigger: { label: 'app' }, items: [
        { type: 'link', id: 'goLink', label: 'go somewhere', href: '/examples/#went', target: '_self' },
        { type: 'link', id: 'deadLink', label: 'nope', href: '/examples/#never', target: '_self', disabled: true },
    ] },
  ] }
}`

test.describe('MenuBar review fixes', () => {
    test('Enter on a link item navigates; Space too', async ({ page }) => {
        const mb = await mount(page, LINKMENUS)
        await mb.locator('.hf-menubar-trigger').focus()
        await page.keyboard.press('ArrowDown')
        await expect(mb.locator('#goLink')).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL(/#went/)
        // Space path
        const mb2 = await mount(page, LINKMENUS)
        await mb2.locator('.hf-menubar-trigger').focus()
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press(' ')
        await expect(page).toHaveURL(/#went/)
    })

    test('disabled link items do not navigate on mouse click', async ({ page }) => {
        const mb = await mount(page, LINKMENUS)
        await mb.locator('.hf-menubar-trigger').click()
        await mb.locator('#deadLink').click({ force: true })
        await expect(page).not.toHaveURL(/#never/)
        expect((await events(page)).filter(e => e.type === 'menu-select')).toEqual([])
    })

    test('_sync during open menu resets openMenuId and closes cleanly', async ({ page }) => {
        const mb = await mount(page, TWOMENUS)
        await mb.locator('.hf-menubar-trigger', { hasText: 'file' }).click()
        expect(await page.evaluate(() => document.getElementById('mb-test').openMenuId)).toBe('file')
        await page.evaluate(() => document.getElementById('mb-test').setAttribute('bar-label', 'rebuilt'))
        expect(await page.evaluate(() => document.getElementById('mb-test').openMenuId)).toBe(null)
        await expect(mb.locator('.hf-menubar-panel').first()).toBeHidden()
        // Escape after the rebuild must not act on the stale registration
        await page.keyboard.press('Escape')
        expect(await page.evaluate(() => document.getElementById('mb-test').openMenuId)).toBe(null)
    })

    test('hover-switch followed by an immediate click keeps the menu open; a parked click closes', async ({ page }) => {
        const mb = await mount(page, TWOMENUS)
        const view = mb.locator('.hf-menubar-trigger', { hasText: 'view' })
        await mb.locator('.hf-menubar-trigger', { hasText: 'file' }).click()
        await view.hover()
        await expect(mb.locator('.hf-menubar-panel').nth(1)).toBeVisible()
        await view.click()   // same gesture as the hover-switch: must NOT toggle closed
        await expect(mb.locator('.hf-menubar-panel').nth(1)).toBeVisible()
        await page.waitForTimeout(450)
        await view.click()   // parked past the suppression window: normal toggle
        await expect(mb.locator('.hf-menubar-panel').nth(1)).toBeHidden()
    })

    test('two menu-bar instances coexist independently', async ({ page }) => {
        await mount(page, TWOMENUS)
        await page.evaluate(() => {
            const el = document.createElement('menu-bar')
            el.id = 'mb-second'
            el.style.marginTop = '320px'   // keep clear of the first bar's open panel
            el.config = { regions: { left: [
                { type: 'menu', id: 'other', trigger: { label: 'other' }, items: [{ id: 'otherItem', label: 'o' }] },
            ] } }
            document.body.appendChild(el)
        })
        const a = page.locator('#mb-test')
        const b = page.locator('#mb-second')
        await a.locator('.hf-menubar-trigger', { hasText: 'file' }).click()
        await expect(a.locator('.hf-menubar-panel').first()).toBeVisible()
        await b.locator('.hf-menubar-trigger', { hasText: 'other' }).click()
        // clicking into B is outside A: A closes, B opens
        await expect(a.locator('.hf-menubar-panel').first()).toBeHidden()
        await expect(b.locator('.hf-menubar-panel')).toBeVisible()
        expect(await page.evaluate(() => document.getElementById('mb-second').openMenuId)).toBe('other')
        expect(await page.evaluate(() => document.getElementById('mb-test').openMenuId)).toBe(null)
    })

    test('update() reaches separator hidden and segmented-button fields by id', async ({ page }) => {
        const mb = await mount(page, `{
            regions: {
                left: [ { type: 'menu', id: 'm', trigger: { label: 'm' }, items: [
                    { id: 'i1', label: 'one' },
                    { type: 'separator', id: 'sepX', hidden: true },
                    { id: 'i2', label: 'two' },
                ] } ],
                right: [ { type: 'segmented', id: 'seg', ariaLabel: 'Seg', buttons: [
                    { id: 'segA', label: 'A', pressed: true },
                    { id: 'segB', label: 'B', pressed: false, disabled: true },
                ] } ],
            }
        }`)
        await page.evaluate(() => {
            const el = document.getElementById('mb-test')
            el.update('sepX', { hidden: false })
            el.update('segB', { disabled: false, title: 'now allowed' })
        })
        await mb.locator('.hf-menubar-trigger').click()
        await expect(mb.locator('#sepX')).not.toBeHidden()
        await expect(mb.locator('#segB')).toBeEnabled()
        await expect(mb.locator('#segB')).toHaveAttribute('title', 'now allowed')
    })
})

test.describe('MenuBar skeleton', () => {
    test('renders bar with three regions and menubar role', async ({ page }) => {
        const mb = await mount(page, `{ regions: { left: [], center: [], right: [] } }`)
        await expect(mb.locator('.hf-menubar')).toHaveAttribute('role', 'menubar')
        await expect(mb.locator('.hf-menubar')).toHaveAttribute('aria-label', 'Application menu')
        await expect(mb.locator('.hf-menubar-left')).toHaveCount(1)
        await expect(mb.locator('.hf-menubar-center')).toHaveCount(1)
        await expect(mb.locator('.hf-menubar-right')).toHaveCount(1)
        await expect(mb.locator('.hf-menubar-backdrop')).toHaveCount(1)
    })

    test('bar-label attribute overrides the bar label', async ({ page }) => {
        const mb = await mount(page, `{ regions: { left: [] } }`, { 'bar-label': 'قائمة' })
        await expect(mb.locator('.hf-menubar')).toHaveAttribute('aria-label', 'قائمة')
    })

    test('CSS is injected only once', async ({ page }) => {
        await mount(page, `{ regions: { left: [] } }`)
        await page.evaluate(() => {
            const el = document.createElement('menu-bar')
            el.config = { regions: { left: [] } }
            document.body.appendChild(el)
        })
        const count = await page.evaluate(() => document.querySelectorAll('#hf-menu-bar-styles').length)
        expect(count).toBe(1)
    })
})
