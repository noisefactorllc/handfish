// Parity fixture: Noisedeck's menu bar expressed as a <menu-bar> config.
// Menu tree, labels, ids, hrefs, shortcuts, and state gating transcribed from
// the live app markup/behavior (app/index.html + menuHandlers/viewMenu et al).
// Handlers record into window.__parity.calls; app state lives in
// window.__parity.state so specs can flip it and observe pull-based refresh.

export default function noisedeckConfig() {
    window.__parity = {
        calls: [],
        state: {
            auth: false,
            subscriber: false,
            classic: false,
            collab: true,
            zoom: 'fit',            // fit | 50 | 100 | 200 | full-window
            canUndo: false,
            canRedo: false,
            dslTray: true,
            chainIndicators: true,
            automationPanel: false,
            playing: true,
            randomizer: 'mutate',   // mutate | randomize | curated | wild
        },
    }
    const s = window.__parity.state
    const act = id => () => window.__parity.calls.push(id)
    const RANDOMIZER_ICONS = { mutate: 'genetics', randomize: 'casino', curated: 'playing_cards', wild: 'grass' }

    return {
        ariaLabel: 'Noisedeck menu',
        regions: {
            left: [
                {
                    type: 'menu',
                    id: 'appMenu',
                    trigger: {
                        html: '<svg width="1.25em" height="1.5em" viewBox="0 0 600 600" fill="currentColor"><circle cx="300" cy="300" r="280"/></svg>',
                        ariaLabel: 'Noisedeck menu',
                        attrs: { 'data-tutorial': 'logo-menu' },
                    },
                    items: [
                        { type: 'link', id: 'noisedeckLinkMenuItem', label: 'about Noisedeck', href: 'https://noisedeck.app/about/', target: '_blank', rel: 'noopener', classes: 'shimmer-text', attrs: { 'data-i18n': 'menus.app.about' } },
                        { type: 'separator' },
                        { id: 'appSettingsMenuItem', label: 'app settings', onSelect: act('appSettingsMenuItem') },
                        { id: 'showTutorialMenuItem', label: 'show tutorial', hidden: () => !s.classic, onSelect: act('showTutorialMenuItem') },
                        { id: 'docsMenuItem', label: 'docs', onSelect: act('docsMenuItem') },
                        { type: 'link', id: 'supportMenuItem', label: 'support', href: 'https://noisefactor.io/ask/', target: '_blank' },
                        { type: 'link', id: 'discordMenuItem', label: 'discord', href: 'https://noisefactor.io/discord/join', target: '_blank', rel: 'noopener' },
                        { type: 'separator' },
                        { type: 'link', id: 'manageAccountMenuItem', label: 'manage account', href: '/manage/', target: '_blank', hidden: () => !s.auth },
                        { id: 'signInMenuItem', label: 'sign in', hidden: () => s.auth, onSelect: act('signInMenuItem') },
                        { type: 'link', id: 'registerMenuItem', label: 'free trial', href: 'https://get.noisedeck.app', target: '_blank', rel: 'noopener', classes: 'shimmer-text-green', hidden: () => s.auth },
                        { id: 'signOutMenuItem', label: 'sign out', hidden: () => !s.auth, onSelect: act('signOutMenuItem') },
                        { type: 'separator' },
                        { id: 'shortcutsMenuItem', label: 'keyboard shortcuts', shortcut: '?', onSelect: act('shortcutsMenuItem') },
                        { id: 'aboutMenuItem', label: 'version info', onSelect: act('aboutMenuItem') },
                        { type: 'separator' },
                        { type: 'link', id: 'videosMenuItem', label: 'videos', href: 'https://shuffleset.stream/noisedeck/video/product-examples/noisedeck-90-secs/', target: '_blank', rel: 'noopener' },
                    ],
                },
                {
                    type: 'menu',
                    id: 'fileMenu',
                    trigger: { label: 'file', id: 'fileMenuTitle', attrs: { 'data-tutorial': 'file-menu', 'data-i18n': 'menus.file.title' } },
                    items: [
                        { id: 'newMenuItem', label: 'new...', onSelect: act('newMenuItem') },
                        { type: 'separator' },
                        { id: 'newClassicMenuItem', label: 'new classic composition', onSelect: act('newClassicMenuItem') },
                        { id: 'newFreeFormMenuItem', label: 'new free-form composition', onSelect: act('newFreeFormMenuItem') },
                        { type: 'separator' },
                        { id: 'savePNG', label: 'quick save as png', onSelect: act('savePNG') },
                        { id: 'saveJPG', label: 'quick save as jpg', onSelect: act('saveJPG') },
                        { type: 'separator' },
                        { id: 'exportVideo', label: 'export video...', attrs: { 'data-tutorial': 'export-video' }, onSelect: act('exportVideo') },
                        { id: 'exportImage', label: 'export image...', onSelect: act('exportImage') },
                        { id: 'exportPrintMenuItem', label: 'export for print...', hidden: () => !s.subscriber, onSelect: act('exportPrintMenuItem') },
                        { type: 'separator' },
                        { id: 'loadEffectMenuItem', label: 'import effect from zip...', onSelect: act('loadEffectMenuItem') },
                        { id: 'deleteEffectMenuItem', label: 'delete effect...', onSelect: act('deleteEffectMenuItem') },
                    ],
                },
                {
                    type: 'menu',
                    id: 'editMenu',
                    trigger: { label: 'edit', id: 'editMenuTitle' },
                    items: [
                        { id: 'undoMenuItem', label: 'undo', shortcut: '⌘Z', disabled: () => !s.canUndo, onSelect: act('undoMenuItem') },
                        { id: 'redoMenuItem', label: 'redo', shortcut: '⇧⌘Z', disabled: () => !s.canRedo, onSelect: act('redoMenuItem') },
                        { type: 'separator' },
                        { id: 'copyCanvasMenuItem', label: 'copy canvas', onSelect: act('copyCanvasMenuItem') },
                    ],
                },
                {
                    type: 'menu',
                    id: 'viewMenu',
                    trigger: { label: 'view' },
                    items: [
                        { id: 'zoomInMenuItem', label: 'zoom in', shortcut: '⌘+', disabled: () => s.zoom === 'full-window' || s.zoom === '200', onSelect: act('zoomInMenuItem') },
                        { id: 'zoomOutMenuItem', label: 'zoom out', shortcut: '⌘−', disabled: () => s.zoom === 'full-window' || s.zoom === '50', onSelect: act('zoomOutMenuItem') },
                        { type: 'separator' },
                        { type: 'radio', id: 'fitInWindowMenuItem', label: 'fit in window', checked: () => s.zoom === 'fit', onSelect: () => { s.zoom = 'fit'; window.__parity.calls.push('fitInWindowMenuItem') } },
                        { type: 'separator' },
                        { type: 'radio', id: 'zoom50MenuItem', label: '50%', checked: () => s.zoom === '50', onSelect: () => { s.zoom = '50'; window.__parity.calls.push('zoom50MenuItem') } },
                        { type: 'radio', id: 'zoom100MenuItem', label: '100% (actual size)', checked: () => s.zoom === '100', onSelect: () => { s.zoom = '100'; window.__parity.calls.push('zoom100MenuItem') } },
                        { type: 'radio', id: 'zoom200MenuItem', label: '200%', checked: () => s.zoom === '200', onSelect: () => { s.zoom = '200'; window.__parity.calls.push('zoom200MenuItem') } },
                        { type: 'separator' },
                        { type: 'radio', id: 'fullWindowMenuItem', label: 'full window', checked: () => s.zoom === 'full-window', onSelect: () => { s.zoom = 'full-window'; window.__parity.calls.push('fullWindowMenuItem') } },
                        { type: 'separator', id: 'openViewportWindowSeparator', hidden: () => !s.subscriber },
                        { id: 'openViewportWindowMenuItem', label: 'open viewport window', hidden: () => !s.subscriber, onSelect: act('openViewportWindowMenuItem') },
                    ],
                },
                {
                    type: 'menu',
                    id: 'programMenu',
                    trigger: { label: 'program', id: 'programMenuTitle', attrs: { 'data-i18n': 'menus.program.title' } },
                    items: [
                        { id: 'programsMenuItem', label: 'browse gallery', classes: 'shimmer-text', onSelect: act('programsMenuItem') },
                        { type: 'separator' },
                        { id: 'copyProgram', label: 'copy program', onSelect: act('copyProgram') },
                        { id: 'pasteProgram', label: 'paste program', onSelect: act('pasteProgram') },
                        { type: 'separator' },
                        { id: 'saveProgram', label: 'save program', shortcut: '⌘S', onSelect: act('saveProgram') },
                        { id: 'loadProgram', label: 'load program', onSelect: act('loadProgram') },
                        { id: 'deleteProgram', label: 'delete program', onSelect: act('deleteProgram') },
                        { id: 'exportProgramMenuItem', label: 'export program...', onSelect: act('exportProgramMenuItem') },
                        { type: 'separator', id: 'trayToggleSeparator', hidden: () => s.classic },
                        { id: 'toggleProgramTray', label: () => s.dslTray ? 'hide dsl program' : 'show dsl program', hidden: () => s.classic, onSelect: () => { s.dslTray = !s.dslTray; window.__parity.calls.push('toggleProgramTray') } },
                        { id: 'toggleChainIndicators', label: () => s.chainIndicators ? 'hide chain indicators' : 'show chain indicators', hidden: () => s.classic, onSelect: () => { s.chainIndicators = !s.chainIndicators; window.__parity.calls.push('toggleChainIndicators') } },
                        { type: 'separator', id: 'convertSeparator', hidden: () => !s.classic },
                        { id: 'convertToFreeFormMenuItem', label: 'convert to free-form...', hidden: () => !s.classic, onSelect: act('convertToFreeFormMenuItem') },
                        { type: 'separator' },
                        { id: 'editInNoodlesMenuItem', label: 'edit in Noodles...', onSelect: act('editInNoodlesMenuItem') },
                        { id: 'editInPolymorphicMenuItem', label: 'edit in Polymorphic...', onSelect: act('editInPolymorphicMenuItem') },
                        { type: 'separator' },
                        { id: 'loadFromUrlMenuItem', label: 'import from url...', onSelect: act('loadFromUrlMenuItem') },
                        { id: 'shareProgram', label: 'share publicly...', onSelect: act('shareProgram') },
                        { type: 'separator' },
                        { id: 'exportProgramsMenuItem', label: 'export programs...', onSelect: act('exportProgramsMenuItem') },
                        { id: 'importProgramsMenuItem', label: 'import programs...', onSelect: act('importProgramsMenuItem') },
                        { type: 'separator', id: 'goOnlineMenuSeparator', hidden: () => !(s.collab && !s.classic) },
                        { id: 'goOnlineMenuItem', label: 'go online...', hidden: () => !(s.collab && !s.classic), onSelect: act('goOnlineMenuItem') },
                    ],
                },
                { type: 'badge', id: 'classicModeBadge', label: 'mode', classes: 'classic-mode-badge', hidden: () => !s.classic, onSelect: act('classicModeBadge') },
            ],
            center: [],
            right: [
                {
                    type: 'menu',
                    id: 'randomizerMenu',
                    align: 'right',
                    split: {
                        id: 'randomizerBtn',
                        icon: () => RANDOMIZER_ICONS[s.randomizer],
                        tooltip: () => s.randomizer,
                        ariaLabel: 'Randomize',
                        attrs: { 'data-tutorial': 'randomizer-btn' },
                        onSelect: () => window.__parity.calls.push('run:' + s.randomizer),
                    },
                    trigger: { icon: 'arrow_drop_down', ariaLabel: 'Randomizer options' },
                    items: [
                        { type: 'radio', id: 'randomizerMutate', label: 'mutate', icon: 'genetics', checked: () => s.randomizer === 'mutate', onSelect: () => { s.randomizer = 'mutate'; window.__parity.calls.push('run:mutate') } },
                        { type: 'radio', id: 'randomizerRandomize', label: 'randomize', icon: 'casino', checked: () => s.randomizer === 'randomize', onSelect: () => { s.randomizer = 'randomize'; window.__parity.calls.push('run:randomize') } },
                        { type: 'radio', id: 'randomizerCurated', label: 'curated randomize', icon: 'playing_cards', checked: () => s.randomizer === 'curated', onSelect: () => { s.randomizer = 'curated'; window.__parity.calls.push('run:curated') } },
                        { type: 'radio', id: 'randomizerWild', label: 'wild randomize', icon: 'grass', checked: () => s.randomizer === 'wild', onSelect: () => { s.randomizer = 'wild'; window.__parity.calls.push('run:wild') } },
                    ],
                },
                { type: 'separator' },
                { type: 'button', id: 'toggleAutomationPanelBtn', icon: 'conversion_path', tooltip: () => s.automationPanel ? 'hide automation' : 'show automation', ariaLabel: 'Toggle automation panel', onSelect: () => { s.automationPanel = !s.automationPanel; window.__parity.calls.push('toggleAutomationPanelBtn') } },
                { type: 'button', id: 'toggleProgramTrayBtn', icon: 'code', tooltip: () => s.dslTray ? 'hide dsl program' : 'show dsl program', ariaLabel: 'Toggle DSL program', hidden: () => s.classic, onSelect: () => { s.dslTray = !s.dslTray; window.__parity.calls.push('toggleProgramTrayBtn') } },
                { type: 'separator' },
                { type: 'button', id: 'playPauseBtn', icon: () => s.playing ? 'pause' : 'play_arrow', tooltip: () => s.playing ? 'pause' : 'play', ariaLabel: 'Play/Pause', onSelect: () => { s.playing = !s.playing; window.__parity.calls.push('playPauseBtn') } },
                { type: 'button', id: 'autopilotBtn', icon: 'autoplay', tooltip: 'autopilot', ariaLabel: 'Autopilot', onSelect: act('autopilotBtn') },
            ],
        },
    }
}
