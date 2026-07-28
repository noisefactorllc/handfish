// Parity fixture: Polymorphic's menu bar expressed as a <menu-bar> config.
// Transcribed from public/index.html:1076-1169 + embed.js setupMenuBar()/
// setupViewMenu(). View-menu checkbox state uses the same pull-based
// {is:…} closures the app's toggles map uses.

export default function polymorphicConfig() {
    window.__parity = {
        calls: [],
        state: {
            editor: true,
            docs: true,
            liveInputs: false,
            surfacePips: false,
            perf: false,
            statusRow: false,
            performanceMode: false,
            fullscreen: false,
            collab: true,
            recording: false,
            playing: true,
        },
    }
    const s = window.__parity.state
    const act = id => () => window.__parity.calls.push(id)
    const viewToggle = (id, key) => ({
        type: 'checkbox',
        id,
        label: null,
        checked: () => s[key],
        onSelect: () => { s[key] = !s[key]; window.__parity.calls.push(id) },
    })

    const view = {
        type: 'menu',
        id: 'viewMenu',
        trigger: { label: 'view', id: 'viewMenuTitle' },
        items: [
            { ...viewToggle('viewMenuItem-editor', 'editor'), label: 'code editor' },
            { ...viewToggle('viewMenuItem-docs', 'docs'), label: 'documentation' },
            { ...viewToggle('viewMenuItem-live-inputs', 'liveInputs'), label: 'live inputs' },
            { ...viewToggle('viewMenuItem-surface-pips', 'surfacePips'), label: 'surface pips' },
            { type: 'separator' },
            { ...viewToggle('viewMenuItem-perf', 'perf'), label: 'performance overlay' },
            { ...viewToggle('viewMenuItem-status', 'statusRow'), label: 'status row' },
            { type: 'separator' },
            { id: 'viewMenuItem-gallery', label: 'gallery…', onSelect: act('viewMenuItem-gallery') },
            { id: 'viewMenuItem-shortcuts', label: 'keyboard shortcuts…', onSelect: act('viewMenuItem-shortcuts') },
            { type: 'separator' },
            { ...viewToggle('viewMenuItem-performance-mode', 'performanceMode'), label: 'performance mode' },
            { ...viewToggle('viewMenuItem-fullscreen', 'fullscreen'), label: 'fullscreen' },
            { type: 'separator' },
            { id: 'viewMenuItem-open-viewport-window', label: 'open viewport window', onSelect: act('viewMenuItem-open-viewport-window') },
        ],
    }

    return {
        ariaLabel: 'Polymorphic menu',
        regions: {
            left: [
                {
                    type: 'menu',
                    id: 'logoMenu',
                    trigger: { html: '<svg id="logo" width="1.25em" height="1.5em" viewBox="0 0 600 600" fill="currentColor"><rect width="600" height="600"/></svg>', ariaLabel: 'Polymorphic menu' },
                    items: [
                        { id: 'aboutMenuItem', label: 'about Polymorphic', onSelect: act('aboutMenuItem') },
                        { type: 'separator' },
                        { id: 'docsMenuItem', label: 'documentation', onSelect: act('docsMenuItem') },
                    ],
                },
                {
                    type: 'menu',
                    id: 'fileMenu',
                    trigger: { label: 'file', id: 'fileMenuTitle' },
                    items: [
                        { id: 'savePNG', label: 'quick save as png', onSelect: act('savePNG') },
                        { id: 'saveJPG', label: 'quick save as jpg', onSelect: act('saveJPG') },
                        { type: 'separator' },
                        { id: 'importFromZipMenuItem', label: 'import effect from zip...', onSelect: act('importFromZipMenuItem') },
                    ],
                },
                {
                    type: 'menu',
                    id: 'editMenu',
                    trigger: { label: 'edit', id: 'editMenuTitle' },
                    items: [
                        { id: 'resetMenuItem', label: 'reset to original', onSelect: act('resetMenuItem') },
                    ],
                },
                view,
                {
                    type: 'menu',
                    id: 'programMenu',
                    trigger: { label: 'program', id: 'programMenuTitle' },
                    items: [
                        { id: 'copyProgram', label: 'copy program', onSelect: act('copyProgram') },
                        { id: 'pasteProgram', label: 'paste program', onSelect: act('pasteProgram') },
                        { type: 'separator' },
                        { id: 'saveProgram', label: 'save program', onSelect: act('saveProgram') },
                        { id: 'loadProgram', label: 'load program', onSelect: act('loadProgram') },
                        { id: 'deleteProgram', label: 'delete program', onSelect: act('deleteProgram') },
                        { type: 'separator' },
                        { id: 'editInNoisedeckMenuItem', label: 'edit in Noisedeck...', onSelect: act('editInNoisedeckMenuItem') },
                        { id: 'editInNoodlesMenuItem', label: 'edit in Noodles...', onSelect: act('editInNoodlesMenuItem') },
                        { type: 'separator' },
                        { id: 'importFromUrlMenuItem', label: 'import from url...', onSelect: act('importFromUrlMenuItem') },
                        { id: 'shareProgram', label: 'share publicly...', onSelect: act('shareProgram') },
                        { type: 'separator', id: 'onlineCollabMenuSeparator', hidden: () => !s.collab },
                        { id: 'goOnlineMenuItem', label: 'go online...', hidden: () => !s.collab, onSelect: act('goOnlineMenuItem') },
                    ],
                },
            ],
            center: [],
            right: [
                { type: 'button', id: 'gallery-btn', icon: 'collections', tooltip: 'gallery', ariaLabel: 'Open inspiration gallery', onSelect: act('gallery-btn') },
                { type: 'button', id: 'inputs-toggle-btn', icon: 'tune', tooltip: 'live inputs', ariaLabel: 'Toggle live inputs', active: () => s.liveInputs, onSelect: () => { s.liveInputs = !s.liveInputs; window.__parity.calls.push('inputs-toggle-btn') } },
                { type: 'button', id: 'record-toggle-btn', icon: 'fiber_manual_record', tooltip: 'record', ariaLabel: 'Toggle recording', active: () => s.recording, onSelect: () => { s.recording = !s.recording; window.__parity.calls.push('record-toggle-btn') } },
                { type: 'button', id: 'perf-toggle-btn', icon: 'speed', tooltip: 'performance', ariaLabel: 'Toggle performance overlay', active: () => s.perf, onSelect: () => { s.perf = !s.perf; window.__parity.calls.push('perf-toggle-btn') } },
                { type: 'button', id: 'doc-toggle-btn', icon: 'info', tooltip: 'documentation', ariaLabel: 'Toggle documentation', active: () => s.docs, onSelect: () => { s.docs = !s.docs; window.__parity.calls.push('doc-toggle-btn') } },
                { type: 'button', id: 'code-toggle-btn', icon: 'code', tooltip: 'code editor', ariaLabel: 'Toggle code view', active: () => s.editor, onSelect: () => { s.editor = !s.editor; window.__parity.calls.push('code-toggle-btn') } },
                { type: 'button', id: 'fullscreen-btn-menu', icon: () => s.fullscreen ? 'fullscreen_exit' : 'fullscreen', tooltip: 'fullscreen', ariaLabel: 'Toggle fullscreen', onSelect: () => { s.fullscreen = !s.fullscreen; window.__parity.calls.push('fullscreen-btn-menu') } },
                { type: 'button', id: 'play-pause-btn-menu', icon: () => s.playing ? 'pause' : 'play_arrow', tooltip: () => s.playing ? 'pause' : 'play', ariaLabel: () => s.playing ? 'Pause animation' : 'Play animation', onSelect: () => { s.playing = !s.playing; window.__parity.calls.push('play-pause-btn-menu') } },
            ],
        },
    }
}
