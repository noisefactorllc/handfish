import { test, expect } from '@playwright/test'

test.describe('Bidi readiness and label overrides', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.setContent(`
            <!doctype html>
            <html lang="en" dir="rtl" data-theme="dark">
            <head>
                <link rel="stylesheet" href="/src/styles/index.css">
            </head>
            <body></body>
            </html>
        `)
        await page.addScriptTag({
            type: 'module',
            content: `
                import * as Handfish from '/src/index.js'
                window.Handfish = Handfish
                window.dispatchEvent(new Event('handfish-ready'))
            `
        })
        await page.waitForFunction(() => window.Handfish)
    })

    test('select-dropdown inherits RTL and renders overridable labels', async ({ page }) => {
        await page.evaluate(() => {
            const select = document.createElement('select-dropdown')
            select.id = 'bidi-select'
            select.setAttribute('placeholder', 'اختيار')
            select.setAttribute('empty-text', 'لا توجد خيارات')
            select.setAttribute('dialog-title', 'اختر قيمة')
            select.setAttribute('dialog-label', 'قائمة الخيارات')
            select.setAttribute('close-label', 'إغلاق')
            document.body.appendChild(select)
        })

        const select = page.locator('#bidi-select')
        await expect(select).toHaveCSS('direction', 'rtl')
        await expect(select.locator('.trigger-text')).toHaveText('اختيار')

        await select.locator('.select-trigger').click()
        await expect(select.locator('.empty-message').first()).toHaveText('لا توجد خيارات')
        await expect(select.locator('.select-dialog')).toHaveAttribute('aria-label', 'قائمة الخيارات')
        await expect(select.locator('.dialog-title')).toHaveText('اختر قيمة')
        await expect(select.locator('.dialog-close')).toHaveAttribute('aria-label', 'إغلاق')
    })

    test('justify-button-group inherits direction and renders overridable titles', async ({ page }) => {
        await page.evaluate(() => {
            const group = document.createElement('justify-button-group')
            group.id = 'bidi-justify'
            group.setAttribute('left-label', 'محاذاة للبداية')
            group.setAttribute('center-label', 'توسيط')
            group.setAttribute('right-label', 'محاذاة للنهاية')
            document.body.appendChild(group)
        })

        const group = page.locator('#bidi-justify')
        await expect(group).toHaveCSS('direction', 'rtl')
        await expect(group.locator('[data-value="left"]')).toHaveAttribute('title', 'محاذاة للبداية')
        await expect(group.locator('[data-value="center"]')).toHaveAttribute('title', 'توسيط')
        await expect(group.locator('[data-value="right"]')).toHaveAttribute('title', 'محاذاة للنهاية')

        const borderProp = await group.locator('[data-value="left"]').evaluate(el =>
            getComputedStyle(el).borderRightWidth
        )
        expect(borderProp).toBe('1px')
    })

    test('dropdown-menu logical align-start anchors to RTL inline start', async ({ page }) => {
        await page.evaluate(() => {
            const menu = document.createElement('dropdown-menu')
            menu.id = 'bidi-menu'
            menu.setAttribute('label', 'خيارات')
            menu.setAttribute('align', 'start')
            menu.style.marginInlineStart = '240px'
            menu.innerHTML = '<dropdown-item value="one">واحد</dropdown-item>'
            document.body.appendChild(menu)
        })

        const menu = page.locator('#bidi-menu')
        await menu.locator('.dropdown-trigger').click()
        const offset = await menu.locator('.dropdown-content').evaluate(el => {
            const content = el.getBoundingClientRect()
            const host = el.closest('dropdown-menu').getBoundingClientRect()
            return Math.round(content.right - host.right)
        })
        expect(offset).toBe(0)
    })

    test('dropdown-menu logical align-end anchors to RTL inline end', async ({ page }) => {
        await page.evaluate(() => {
            const menu = document.createElement('dropdown-menu')
            menu.id = 'bidi-menu-end'
            menu.setAttribute('label', 'خيارات')
            menu.setAttribute('align', 'end')
            menu.style.marginInlineStart = '240px'
            menu.innerHTML = '<dropdown-item value="one">واحد</dropdown-item>'
            document.body.appendChild(menu)
        })

        const menu = page.locator('#bidi-menu-end')
        await menu.locator('.dropdown-trigger').click()
        const offset = await menu.locator('.dropdown-content').evaluate(el => {
            const content = el.getBoundingClientRect()
            const host = el.closest('dropdown-menu').getBoundingClientRect()
            return Math.round(content.left - host.left)
        })
        expect(offset).toBe(0)
    })

    test('dropdown-menu default and align-left remain physical in RTL', async ({ page }) => {
        await page.evaluate(() => {
            const defaultMenu = document.createElement('dropdown-menu')
            defaultMenu.id = 'legacy-default-menu'
            defaultMenu.setAttribute('label', 'خيارات')
            defaultMenu.style.marginInlineStart = '240px'
            defaultMenu.innerHTML = '<dropdown-item value="one">واحد</dropdown-item>'
            document.body.appendChild(defaultMenu)

            const leftMenu = document.createElement('dropdown-menu')
            leftMenu.id = 'legacy-left-menu'
            leftMenu.setAttribute('label', 'خيارات')
            leftMenu.setAttribute('align', 'left')
            leftMenu.style.marginInlineStart = '240px'
            leftMenu.innerHTML = '<dropdown-item value="one">واحد</dropdown-item>'
            document.body.appendChild(leftMenu)
        })

        for (const id of ['legacy-default-menu', 'legacy-left-menu']) {
            const menu = page.locator(`#${id}`)
            await menu.locator('.dropdown-trigger').click()
            const offset = await menu.locator('.dropdown-content').evaluate(el => {
                const content = el.getBoundingClientRect()
                const host = el.closest('dropdown-menu').getBoundingClientRect()
                return Math.round(content.left - host.left)
            })
            expect(offset).toBe(0)
            await menu.locator('.dropdown-trigger').click()
        }
    })

    test('dropdown-menu legacy align-right remains physical in RTL', async ({ page }) => {
        await page.evaluate(() => {
            const menu = document.createElement('dropdown-menu')
            menu.id = 'legacy-right-menu'
            menu.setAttribute('label', 'خيارات')
            menu.setAttribute('align', 'right')
            menu.style.marginInlineStart = '240px'
            menu.innerHTML = '<dropdown-item value="one">واحد</dropdown-item>'
            document.body.appendChild(menu)
        })

        const menu = page.locator('#legacy-right-menu')
        await menu.locator('.dropdown-trigger').click()
        const offset = await menu.locator('.dropdown-content').evaluate(el => {
            const content = el.getBoundingClientRect()
            const host = el.closest('dropdown-menu').getBoundingClientRect()
            return Math.round(content.right - host.right)
        })
        expect(offset).toBe(0)
    })

    test('version 0 physical utilities and controls stay physical in RTL', async ({ page }) => {
        await page.evaluate(() => {
            const borderLeft = document.createElement('div')
            borderLeft.id = 'legacy-border-left'
            borderLeft.className = 'hf-border-left'
            document.body.appendChild(borderLeft)

            const label = document.createElement('div')
            label.id = 'legacy-control-label'
            label.className = 'hf-control-label'
            label.textContent = 'Label'
            document.body.appendChild(label)

            const editor = document.createElement('code-editor')
            editor.id = 'legacy-code-editor'
            document.body.appendChild(editor)
        })

        const borderWidths = await page.locator('#legacy-border-left').evaluate(el => {
            const style = getComputedStyle(el)
            return {
                left: style.borderLeftWidth,
                right: style.borderRightWidth,
            }
        })
        expect(borderWidths.left).toBe('1px')
        expect(borderWidths.right).toBe('0px')

        await expect(page.locator('#legacy-control-label')).toHaveCSS('text-align', 'right')
        await expect(page.locator('#legacy-code-editor')).toHaveCSS('direction', 'rtl')
    })

    test('toast close button uses overridable dismiss label', async ({ page }) => {
        await page.evaluate(() => {
            window.Handfish.showToast('مرحبا', {
                duration: 0,
                dismissLabel: 'إغلاق التنبيه'
            })
        })

        await expect(page.locator('.hf-toast-close')).toHaveAttribute('aria-label', 'إغلاق التنبيه')
    })

    test('toast keeps version 0 physical right placement in RTL', async ({ page }) => {
        await page.evaluate(() => {
            window.Handfish.showToast('مرحبا', { duration: 0 })
        })

        const toast = page.locator('.hf-toast')
        await expect(toast).toBeVisible()

        const positionOffset = await page.locator('.hf-toast-container').evaluate(el =>
            Math.round(window.innerWidth - el.getBoundingClientRect().right)
        )
        expect(positionOffset).toBe(16)

        await page.evaluate(() => {
            const toastEl = document.querySelector('.hf-toast')
            toastEl.style.transition = 'none'
            toastEl.classList.remove('show')
            toastEl.classList.add('hide')
        })

        const { translateX, width } = await toast.evaluate(el => {
            const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform)
            return {
                translateX: matrix.m41,
                width: el.getBoundingClientRect().width,
            }
        })

        expect(translateX).toBeGreaterThan(width * 0.9)
    })

    test('about dialog renders overridable labels and isolates dynamic values', async ({ page }) => {
        await page.evaluate(() => {
            const dialog = new window.Handfish.AboutDialog({
                name: 'Noisedeck',
                version: '1.2.3',
                repo: 'noisefactorllc/noisedeck',
                labels: {
                    version: 'الإصدار',
                    build: 'البناء',
                    deployed: 'نشر',
                    noisemakerEngine: 'محرك Noisemaker',
                    local: 'محلي',
                    unavailable: 'غير متاح'
                }
            })
            dialog.setBuild({ hash: 'a1b2c3d4', deployed: new Date('2026-04-01T14:30:00Z') })
            dialog.setNoisemaker({
                version: '0.9.0-SNAPSHOT',
                hash: 'f9e8d7c6',
                deployed: new Date('2026-04-02T14:30:00Z')
            })
            window.__bidiAbout = dialog
            dialog.show()
        })

        const dialog = page.locator('dialog.hf-about')
        await expect(dialog.locator('.hf-about-version .hf-about-label')).toHaveText('الإصدار')
        await expect(dialog.locator('.hf-about-build-hash .hf-about-label')).toHaveText('البناء')
        await expect(dialog.locator('.hf-about-version bdi')).toHaveAttribute('dir', 'auto')
        await expect(dialog.locator('.hf-about-build-hash bdi')).toHaveAttribute('dir', 'auto')
        await expect(dialog.locator('.hf-about-build-hash bdi')).toHaveText('a1b2c3d4')
        await expect(dialog.locator('.hf-about-build-date .hf-about-label')).toHaveText('نشر')
        await expect(dialog.locator('.hf-about-build-date bdi')).toHaveAttribute('dir', 'auto')
        await expect(dialog.locator('.hf-about-noisemaker-heading bdi')).toHaveAttribute('dir', 'auto')
        await expect(dialog.locator('.hf-about-noisemaker-hash bdi')).toHaveAttribute('dir', 'auto')
    })

    test('about dialog does not link or inject hostile build metadata', async ({ page }) => {
        const hostileBuildHash = 'bad" onclick="window.__xss=1'
        const hostileNoisemakerHash = 'f9e8d7c6" data-x="1'

        await page.evaluate(({ hostileBuildHash, hostileNoisemakerHash }) => {
            const dialog = new window.Handfish.AboutDialog({
                name: 'Noisedeck',
                repo: 'noisefactorllc/noisedeck'
            })
            dialog.setBuild({
                hash: hostileBuildHash,
                deployed: new Date('2026-04-01T14:30:00Z')
            })
            dialog.setNoisemaker({
                version: '0.9.0<script>window.__xss=1</script>',
                hash: hostileNoisemakerHash,
                deployed: new Date('2026-04-02T14:30:00Z')
            })
            window.__bidiAbout = dialog
            dialog.show()
        }, { hostileBuildHash, hostileNoisemakerHash })

        const dialog = page.locator('dialog.hf-about')
        await expect(dialog.locator('[onclick], [data-x], script')).toHaveCount(0)
        await expect(dialog.locator('.hf-about-build-hash a')).toHaveCount(0)
        await expect(dialog.locator('.hf-about-noisemaker-hash a')).toHaveCount(0)
        await expect(dialog.locator('.hf-about-build-hash bdi')).toHaveText(hostileBuildHash)
        await expect(dialog.locator('.hf-about-noisemaker-hash bdi')).toHaveText(hostileNoisemakerHash)
    })

    test('about dialog keeps non-hex build refs linkable without injection', async ({ page }) => {
        await page.evaluate(() => {
            const dialog = new window.Handfish.AboutDialog({
                name: 'Noisedeck',
                repo: 'noisefactorllc/noisedeck'
            })
            dialog.setBuild({ hash: 'feature/release.locked+candidate' })
            dialog.setNoisemaker({ hash: 'engine/v1@beta' })
            window.__bidiAbout = dialog
            dialog.show()
        })

        const dialog = page.locator('dialog.hf-about')
        await expect(dialog.locator('.hf-about-build-hash a')).toHaveAttribute(
            'href',
            'https://github.com/noisefactorllc/noisedeck/tree/feature/release.locked%2Bcandidate'
        )
        await expect(dialog.locator('.hf-about-noisemaker-hash a')).toHaveAttribute(
            'href',
            'https://github.com/noisefactorllc/noisemaker/tree/engine/v1%40beta'
        )
    })

    test('menu-bar inherits RTL and renders an overridable bar label', async ({ page }) => {
        await page.evaluate(() => {
            const bar = document.createElement('menu-bar')
            bar.id = 'bidi-menubar'
            bar.setAttribute('bar-label', 'قائمة التطبيق')
            bar.config = { regions: { left: [
                { type: 'menu', id: 'file', trigger: { label: 'ملف' }, items: [{ id: 'bidiItem', label: 'جديد' }] },
            ] } }
            document.body.appendChild(bar)
        })
        const bar = page.locator('#bidi-menubar')
        await expect(bar).toHaveCSS('direction', 'rtl')
        await expect(bar.locator('.hf-menubar')).toHaveAttribute('aria-label', 'قائمة التطبيق')
        await expect(bar.locator('.hf-menubar-trigger')).toHaveText('ملف')
    })

    test('menu-bar panel align end is logical in RTL; align left stays physical', async ({ page }) => {
        await page.evaluate(() => {
            const bar = document.createElement('menu-bar')
            bar.id = 'bidi-menubar-align'
            bar.config = { regions: { left: [
                { type: 'menu', id: 'endMenu', trigger: { label: 'endmenu' }, align: 'end', items: [{ id: 'e1', label: 'aaa' }] },
                { type: 'menu', id: 'leftMenu', trigger: { label: 'leftmenu' }, align: 'left', items: [{ id: 'l1', label: 'bbb' }] },
            ] } }
            document.body.appendChild(bar)
        })
        const bar = page.locator('#bidi-menubar-align')

        // align="end" resolves to the inline-end edge, which under RTL is physical left
        const endWrapper = bar.locator('.hf-menubar-menu').nth(0)
        await endWrapper.locator('.hf-menubar-trigger').click()
        const endPanel = bar.locator('.hf-menubar-panel').nth(0)
        const [endPanelBox, endWrapperBox] = [await endPanel.boundingBox(), await endWrapper.boundingBox()]
        expect(Math.abs(endPanelBox.x - endWrapperBox.x)).toBeLessThanOrEqual(1)

        // legacy align="left" stays physical under RTL (-10px shift from the wrapper's left edge)
        const leftWrapper = bar.locator('.hf-menubar-menu').nth(1)
        await leftWrapper.locator('.hf-menubar-trigger').click()
        const leftPanel = bar.locator('.hf-menubar-panel').nth(1)
        const [leftPanelBox, leftWrapperBox] = [await leftPanel.boundingBox(), await leftWrapper.boundingBox()]
        expect(Math.round(leftPanelBox.x - leftWrapperBox.x)).toBe(-10)
    })
})
