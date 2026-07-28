// Parity fixture: Shade's menu bar expressed as a <menu-bar> config.
// Transcribed from public/index.html:79-143 + app.js setupMenuBar()/
// updateOverlayToggleStates()/updateBackendButtonUI()/updateMenuFilename().

export default function shadeConfig() {
    window.__parity = {
        calls: [],
        state: {
            paramsShown: false,
            dslShown: false,
            filename: '',
            editorVisible: false,
            backend: 'webgl2',      // webgl2 | webgpu
            gpuAvailable: false,
            hasWgslFiles: false,
            playing: true,
        },
    }
    const s = window.__parity.state
    const act = id => () => window.__parity.calls.push(id)

    return {
        ariaLabel: 'Shade menu',
        regions: {
            left: [
                {
                    type: 'menu',
                    id: 'logoMenu',
                    trigger: { html: '<svg width="1.5em" height="1.5em" viewBox="0 0 600 601" fill="currentColor"><path d="M0 0h600v601H0z"/></svg>', ariaLabel: 'Shade menu' },
                    items: [
                        { id: 'aboutMenuItem', label: 'about Shade', onSelect: act('aboutMenuItem') },
                        { type: 'separator' },
                        { id: 'signOutMenuItem', label: 'sign out', onSelect: act('signOutMenuItem') },
                    ],
                },
                {
                    type: 'menu',
                    id: 'fileMenu',
                    trigger: { label: 'file' },
                    items: [
                        { id: 'newMenuItem', label: 'new effect...', onSelect: act('newMenuItem') },
                        { id: 'newFileMenuItem', label: 'new file...', onSelect: act('newFileMenuItem') },
                        { type: 'separator' },
                        { id: 'workspaceFilesMenuItem', label: 'workspace files', onSelect: act('workspaceFilesMenuItem') },
                        { id: 'saveEffectMenuItem', label: 'save effect workspace...', onSelect: act('saveEffectMenuItem') },
                        { id: 'deleteEffectMenuItem', label: 'delete effect workspace...', onSelect: act('deleteEffectMenuItem') },
                        { id: 'downloadWorkspaceMenuItem', label: 'download workspace files', onSelect: act('downloadWorkspaceMenuItem') },
                        { type: 'separator' },
                        { id: 'importFromLibraryMenuItem', label: 'import effect from library...', onSelect: act('importFromLibraryMenuItem') },
                        { id: 'importFromZipMenuItem', label: 'import effect from zip...', onSelect: act('importFromZipMenuItem') },
                    ],
                },
                {
                    type: 'menu',
                    id: 'effectMenu',
                    trigger: { label: 'effect' },
                    items: [
                        { id: 'showParametersMenuItem', label: () => s.paramsShown ? 'hide parameters' : 'show parameters', onSelect: () => { s.paramsShown = !s.paramsShown; window.__parity.calls.push('showParametersMenuItem') } },
                        { id: 'showDslMenuItem', label: () => s.dslShown ? 'hide dsl code' : 'show dsl code', onSelect: () => { s.dslShown = !s.dslShown; window.__parity.calls.push('showDslMenuItem') } },
                        { type: 'separator' },
                        { id: 'editInFoundryMenuItem', label: 'edit in Foundry...', onSelect: act('editInFoundryMenuItem') },
                        { id: 'editInNoisedeckMenuItem', label: 'edit in Noisedeck...', onSelect: act('editInNoisedeckMenuItem') },
                        { id: 'editInNoodlesMenuItem', label: 'edit in Noodles...', onSelect: act('editInNoodlesMenuItem') },
                        { id: 'editInPolymorphicMenuItem', label: 'edit in Polymorphic...', onSelect: act('editInPolymorphicMenuItem') },
                        { type: 'separator' },
                        { id: 'importFromUrlMenuItem', label: 'import from url...', onSelect: act('importFromUrlMenuItem') },
                        { id: 'sharePubliclyMenuItem', label: 'share publicly...', onSelect: act('sharePubliclyMenuItem') },
                    ],
                },
            ],
            center: [
                { type: 'label', id: 'menuFilename', text: () => s.editorVisible ? (s.filename || 'dsl.txt') : '' },
            ],
            right: [
                {
                    type: 'segmented',
                    id: 'backend-switch',
                    ariaLabel: 'Rendering backend',
                    hidden: () => !s.hasWgslFiles,
                    buttons: [
                        { id: 'backend-webgl2', label: 'WebGL2', pressed: () => s.backend === 'webgl2', title: 'Use WebGL2 (GLSL)', onSelect: () => { s.backend = 'webgl2'; window.__parity.calls.push('backend-webgl2') } },
                        { id: 'backend-webgpu', label: 'WebGPU', pressed: () => s.backend === 'webgpu', disabled: () => !s.gpuAvailable, title: () => s.gpuAvailable ? 'Use WebGPU (WGSL)' : 'WebGPU not available in this browser', onSelect: () => { s.backend = 'webgpu'; window.__parity.calls.push('backend-webgpu') } },
                    ],
                },
                { type: 'button', id: 'toggle-dsl-overlay', icon: 'code', tooltip: 'Show DSL', ariaLabel: 'Toggle DSL code', active: () => s.dslShown, onSelect: () => { s.dslShown = !s.dslShown; window.__parity.calls.push('toggle-dsl-overlay') } },
                { type: 'button', id: 'play-pause-btn', icon: () => s.playing ? 'pause' : 'play_arrow', tooltip: () => s.playing ? 'Pause' : 'Play', ariaLabel: 'Play/Pause', onSelect: () => { s.playing = !s.playing; window.__parity.calls.push('play-pause-btn') } },
            ],
        },
    }
}
